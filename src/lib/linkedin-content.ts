import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import {
  type PostType,
  POST_TYPE_LABELS,
  getPostTypeForDate,
  TEMPLATES,
  formatInteractivePost,
} from './linkedin-templates';

export interface LinkedInPost {
  id: number;
  type: PostType;
  typeLabel: string;
  content: string;
  comment?: string | null;
  questionId?: string | null;
  copied: boolean;
  generatedForDate: string;
  createdAt: string;
}

/** Format date as YYYY-MM-DD */
function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Get today's posts (generate if none exist) */
export async function getTodayPosts(date?: Date): Promise<LinkedInPost[]> {
  const d = date || new Date();
  const dateStr = toDateStr(d);
  const db = getDb();

  const rows = await db.all<{
    id: number;
    post_type: string;
    content: string;
    comment: string | null;
    question_id: string | null;
    copied: number;
    generated_for_date: string;
    created_at: string;
  }>(sql`SELECT * FROM linkedin_posts WHERE generated_for_date = ${dateStr} ORDER BY id DESC`);

  if (rows.length > 0) {
    return rows.map(mapRow);
  }

  // Generate 2 posts for today
  const type = getPostTypeForDate(d);
  const post1 = await generatePost(type, dateStr);
  const post2 = await generatePost(type, dateStr);

  return [post1, post2];
}

/** Generate a post of a specific type */
export async function generatePost(type: PostType, dateStr?: string): Promise<LinkedInPost> {
  const date = dateStr || toDateStr(new Date());
  const db = getDb();

  if (type === 'interactive_question') {
    return generateInteractivePost(date);
  }

  const templates = TEMPLATES[type];
  if (!templates || templates.length === 0) {
    throw new Error(`No templates for type: ${type}`);
  }

  // Find which templates were used in last 30 days
  const recent = await db.all<{ content: string }>(
    sql`SELECT content FROM linkedin_posts WHERE post_type = ${type} AND generated_for_date >= date(${date}, '-30 days')`
  );
  const usedSet = new Set(recent.map((r) => r.content));

  // Pick unused template, or random if all used
  let content: string;
  const unused = templates.filter((t) => !usedSet.has(t));
  if (unused.length > 0) {
    content = unused[Math.floor(Math.random() * unused.length)];
  } else {
    content = templates[Math.floor(Math.random() * templates.length)];
  }

  const result = await db.run(
    sql`INSERT INTO linkedin_posts (post_type, content, generated_for_date) VALUES (${type}, ${content}, ${date})`
  );

  const id = Number(result.lastInsertRowid);

  return {
    id,
    type,
    typeLabel: POST_TYPE_LABELS[type],
    content,
    comment: null,
    questionId: null,
    copied: false,
    generatedForDate: date,
    createdAt: new Date().toISOString(),
  };
}

/** Generate interactive question post from the question bank */
async function generateInteractivePost(dateStr: string): Promise<LinkedInPost> {
  const db = getDb();

  // Find a question (age 10-12) that hasn't been used in a LinkedIn post
  const usedIds = await db.all<{ question_id: string }>(
    sql`SELECT question_id FROM linkedin_posts WHERE post_type = 'interactive_question' AND question_id IS NOT NULL`
  );
  const usedIdSet = new Set(usedIds.map((r) => r.question_id));

  const candidates = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.ageGroup, '10-12'),
        eq(questions.isActive, true),
        eq(questions.questionType, 'text')
      )
    )
    .limit(100);

  const unused = candidates.filter((q) => !usedIdSet.has(q.id));
  const pool = unused.length > 0 ? unused : candidates;

  if (pool.length === 0) {
    // Fallback: generate a stat_tip instead
    return generatePost('stat_tip', dateStr);
  }

  const q = pool[Math.floor(Math.random() * pool.length)];
  const options = q.options as Array<{ text: string }>;

  const { content, comment } = formatInteractivePost({
    questionText: q.questionTextAr,
    options,
    correctIndex: q.correctOptionIndex,
    explanation: q.explanationAr,
    subSkill: q.subSkill,
  });

  const result = await db.run(
    sql`INSERT INTO linkedin_posts (post_type, content, comment, question_id, generated_for_date) VALUES ('interactive_question', ${content}, ${comment}, ${q.id}, ${dateStr})`
  );

  const id = Number(result.lastInsertRowid);

  return {
    id,
    type: 'interactive_question',
    typeLabel: POST_TYPE_LABELS['interactive_question'],
    content,
    comment,
    questionId: q.id,
    copied: false,
    generatedForDate: dateStr,
    createdAt: new Date().toISOString(),
  };
}

/** Get recent posts history (last 30) */
export async function getRecentPosts(limit = 30): Promise<LinkedInPost[]> {
  const db = getDb();
  const rows = await db.all<{
    id: number;
    post_type: string;
    content: string;
    comment: string | null;
    question_id: string | null;
    copied: number;
    generated_for_date: string;
    created_at: string;
  }>(sql`SELECT * FROM linkedin_posts ORDER BY generated_for_date DESC, id DESC LIMIT ${limit}`);

  return rows.map(mapRow);
}

/** Mark a post as copied */
export async function markCopied(postId: number): Promise<void> {
  const db = getDb();
  await db.run(sql`UPDATE linkedin_posts SET copied = 1 WHERE id = ${postId}`);
}

function mapRow(r: {
  id: number;
  post_type: string;
  content: string;
  comment: string | null;
  question_id: string | null;
  copied: number;
  generated_for_date: string;
  created_at: string;
}): LinkedInPost {
  const type = r.post_type as PostType;
  return {
    id: r.id,
    type,
    typeLabel: POST_TYPE_LABELS[type] || r.post_type,
    content: r.content,
    comment: r.comment,
    questionId: r.question_id,
    copied: r.copied === 1,
    generatedForDate: r.generated_for_date,
    createdAt: r.created_at,
  };
}
