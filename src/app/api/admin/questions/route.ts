import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { eq, and, like, sql, desc } from 'drizzle-orm';
import { isAdminAuthenticated } from '@/lib/admin-auth';

const VALID_AGE_GROUPS = new Set(['4-5', '6-9', '10-12']);
const VALID_SKILL_AREAS = new Set(['quantitative', 'verbal', 'logical_patterns', 'mixed']);
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'mixed']);
const VALID_TYPES = new Set(['text', 'image', 'audio', 'mixed']);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateQuestionBody(body: any): string | null {
  const { ageGroup, skillArea, subSkill, difficulty, questionType, questionTextAr, options, correctOptionIndex, explanationAr, tags } = body;
  if (!ageGroup || !skillArea || !subSkill || !difficulty || !questionType || !questionTextAr || !explanationAr) return 'بيانات ناقصة';
  if (!VALID_AGE_GROUPS.has(ageGroup)) return 'ageGroup غير صالح';
  if (!VALID_SKILL_AREAS.has(skillArea)) return 'skillArea غير صالح';
  if (!VALID_DIFFICULTIES.has(difficulty)) return 'difficulty غير صالح';
  if (!VALID_TYPES.has(questionType)) return 'questionType غير صالح';
  if (typeof questionTextAr !== 'string' || questionTextAr.trim().length === 0 || questionTextAr.length > 2000) return 'نص السؤال غير صالح';
  if (typeof explanationAr !== 'string' || explanationAr.length > 2000) return 'الشرح غير صالح';
  if (!Array.isArray(options) || options.length !== 4) return 'يجب تقديم 4 خيارات';
  if (!Number.isInteger(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3) return 'correctOptionIndex يجب أن يكون بين 0 و 3';
  if (tags !== undefined && (!Array.isArray(tags) || tags.some((t: unknown) => typeof t !== 'string'))) return 'tags غير صالح';
  return null;
}

export async function GET(req: NextRequest) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const ageGroup = searchParams.get('age_group');
  const skillArea = searchParams.get('skill_area');
  const difficulty = searchParams.get('difficulty');
  const type = searchParams.get('type');
  const active = searchParams.get('active');
  const searchRaw = searchParams.get('search');
  const search = searchRaw ? searchRaw.slice(0, 100) : null;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = 25;
  const offset = (page - 1) * limit;

  const db = getDb();
  const conds = [];
  if (ageGroup && VALID_AGE_GROUPS.has(ageGroup)) conds.push(eq(questions.ageGroup, ageGroup));
  if (skillArea && VALID_SKILL_AREAS.has(skillArea)) conds.push(eq(questions.skillArea, skillArea));
  if (difficulty && VALID_DIFFICULTIES.has(difficulty)) conds.push(eq(questions.difficulty, difficulty));
  if (type && VALID_TYPES.has(type)) conds.push(eq(questions.questionType, type));
  if (active === 'true') conds.push(eq(questions.isActive, true));
  if (active === 'false') conds.push(eq(questions.isActive, false));
  if (search) conds.push(like(questions.questionTextAr, `%${search}%`));

  const where = conds.length > 0 ? and(...conds) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(questions).where(where).orderBy(desc(questions.createdAt)).limit(limit).offset(offset),
    db.select({ total: sql<number>`COUNT(*)` }).from(questions).where(where),
  ]);

  return NextResponse.json({ questions: rows, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const err = validateQuestionBody(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const { ageGroup, skillArea, subSkill, difficulty, questionType, questionTextAr,
    questionImageUrl, options, correctOptionIndex, explanationAr, tags } = body;

  const db = getDb();
  const [row] = await db.insert(questions).values({
    id: crypto.randomUUID(),
    ageGroup, skillArea, subSkill, difficulty, questionType,
    questionTextAr: questionTextAr.trim(),
    questionImageUrl: typeof questionImageUrl === 'string' ? questionImageUrl : null,
    options, correctOptionIndex, explanationAr,
    tags: Array.isArray(tags) ? tags : [],
    isActive: true,
  }).returning();

  return NextResponse.json({ question: row }, { status: 201 });
}
