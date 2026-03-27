import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { eq, and, like, sql, desc } from 'drizzle-orm';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const ageGroup = searchParams.get('age_group');
  const skillArea = searchParams.get('skill_area');
  const difficulty = searchParams.get('difficulty');
  const type = searchParams.get('type');
  const active = searchParams.get('active'); // 'all' | 'true' | 'false'
  const search = searchParams.get('search');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = 25;
  const offset = (page - 1) * limit;

  const db = getDb();
  const conds = [];
  if (ageGroup) conds.push(eq(questions.ageGroup, ageGroup));
  if (skillArea) conds.push(eq(questions.skillArea, skillArea));
  if (difficulty) conds.push(eq(questions.difficulty, difficulty));
  if (type) conds.push(eq(questions.questionType, type));
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
  const { ageGroup, skillArea, subSkill, difficulty, questionType, questionTextAr,
    questionImageUrl, options, correctOptionIndex, explanationAr, tags } = body;

  if (!ageGroup || !skillArea || !subSkill || !difficulty || !questionType ||
    !questionTextAr || !options || options.length !== 4 || correctOptionIndex === undefined || !explanationAr) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
  }

  const db = getDb();
  const [row] = await db.insert(questions).values({
    id: crypto.randomUUID(),
    ageGroup, skillArea, subSkill, difficulty, questionType,
    questionTextAr, questionImageUrl: questionImageUrl || null,
    options, correctOptionIndex, explanationAr,
    tags: tags || [], isActive: true,
  }).returning();

  return NextResponse.json({ question: row }, { status: 201 });
}
