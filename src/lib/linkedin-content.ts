import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import {
  type PostType,
  type AccountType,
  POST_TYPE_LABELS,
  getPostTypeForDate,
  TEMPLATES,
  PERSONAL_TEMPLATES,
  formatInteractivePost,
  formatPersonalInteractivePost,
} from './linkedin-templates';

export interface LinkedInPost {
  id: number;
  type: PostType;
  typeLabel: string;
  content: string;
  comment?: string | null;
  questionId?: string | null;
  copied: boolean;
  account: AccountType;
  generatedForDate: string;
  createdAt: string;
}

/** Format date as YYYY-MM-DD */
function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Get today's posts (generate if none exist) */
export async function getTodayPosts(date?: Date): Promise<{ platform: LinkedInPost[]; personal: LinkedInPost[] }> {
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
    account: string;
    generated_for_date: string;
    created_at: string;
  }>(sql`SELECT * FROM linkedin_posts WHERE generated_for_date = ${dateStr} ORDER BY id DESC`);

  const platformRows = rows.filter((r) => r.account !== 'personal');
  const personalRows = rows.filter((r) => r.account === 'personal');

  const type = getPostTypeForDate(d);

  // Generate platform posts if none exist
  if (platformRows.length === 0) {
    const p1 = await generatePost(type, dateStr, 'platform');
    const p2 = await generatePost(type, dateStr, 'platform');
    platformRows.push(...([p1, p2] as any[]));
  }

  // Generate personal posts if none exist
  if (personalRows.length === 0) {
    const p1 = await generatePost(type, dateStr, 'personal');
    const p2 = await generatePost(type, dateStr, 'personal');
    personalRows.push(...([p1, p2] as any[]));
  }

  return {
    platform: platformRows.length > 0 && platformRows[0].id ? platformRows.map(mapRow) : (platformRows as unknown as LinkedInPost[]),
    personal: personalRows.length > 0 && personalRows[0].id ? personalRows.map(mapRow) : (personalRows as unknown as LinkedInPost[]),
  };
}

/** Generate a post of a specific type */
export async function generatePost(type: PostType, dateStr?: string, account: AccountType = 'platform'): Promise<LinkedInPost> {
  const date = dateStr || toDateStr(new Date());
  const db = getDb();

  if (type === 'interactive_question') {
    return generateInteractivePost(date, account);
  }

  const templates = account === 'personal' ? PERSONAL_TEMPLATES[type] : TEMPLATES[type];
  if (!templates || templates.length === 0) {
    throw new Error(`No templates for type: ${type}, account: ${account}`);
  }

  // Find which templates were used in last 30 days for this account
  const recent = await db.all<{ content: string }>(
    sql`SELECT content FROM linkedin_posts WHERE post_type = ${type} AND account = ${account} AND generated_for_date >= date(${date}, '-30 days')`
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
    sql`INSERT INTO linkedin_posts (post_type, content, account, generated_for_date) VALUES (${type}, ${content}, ${account}, ${date})`
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
    account,
    generatedForDate: date,
    createdAt: new Date().toISOString(),
  };
}

/** Generate interactive question post from the question bank */
async function generateInteractivePost(dateStr: string, account: AccountType = 'platform'): Promise<LinkedInPost> {
  const db = getDb();

  // Find a question (age 10-12) that hasn't been used in a LinkedIn post for this account
  const usedIds = await db.all<{ question_id: string }>(
    sql`SELECT question_id FROM linkedin_posts WHERE post_type = 'interactive_question' AND account = ${account} AND question_id IS NOT NULL`
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
    return generatePost('stat_tip', dateStr, account);
  }

  const q = pool[Math.floor(Math.random() * pool.length)];
  const options = q.options as Array<{ text: string }>;

  const formatter = account === 'personal' ? formatPersonalInteractivePost : formatInteractivePost;
  const { content, comment } = formatter({
    questionText: q.questionTextAr,
    options,
    correctIndex: q.correctOptionIndex,
    explanation: q.explanationAr,
    subSkill: q.subSkill,
  });

  const result = await db.run(
    sql`INSERT INTO linkedin_posts (post_type, content, comment, question_id, account, generated_for_date) VALUES ('interactive_question', ${content}, ${comment}, ${q.id}, ${account}, ${dateStr})`
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
    account,
    generatedForDate: dateStr,
    createdAt: new Date().toISOString(),
  };
}

/** Get recent posts history (last 30) */
export async function getRecentPosts(limit = 30, account?: AccountType): Promise<LinkedInPost[]> {
  const db = getDb();
  if (account) {
    const rows = await db.all<{
      id: number;
      post_type: string;
      content: string;
      comment: string | null;
      question_id: string | null;
      copied: number;
      account: string;
      generated_for_date: string;
      created_at: string;
    }>(sql`SELECT * FROM linkedin_posts WHERE account = ${account} ORDER BY generated_for_date DESC, id DESC LIMIT ${limit}`);
    return rows.map(mapRow);
  }
  const rows = await db.all<{
    id: number;
    post_type: string;
    content: string;
    comment: string | null;
    question_id: string | null;
    copied: number;
    account: string;
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
  account?: string;
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
    account: (r.account as AccountType) || 'platform',
    generatedForDate: r.generated_for_date,
    createdAt: r.created_at,
  };
}
