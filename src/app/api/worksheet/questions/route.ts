import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { rateLimit, getIp } from '@/lib/rate-limit';

const VALID_AGE_GROUPS = new Set(['4-5', '6-9', '10-12']);
const VALID_SKILL_AREAS = new Set(['quantitative', 'verbal', 'logical_patterns', 'mixed']);
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'mixed']);

export async function GET(req: NextRequest) {
  const rl = rateLimit(`worksheet:${getIp(req)}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  try {
    const { searchParams } = req.nextUrl;
    const ageGroup = searchParams.get('age_group');
    const skillArea = searchParams.get('skill_area');
    const difficulty = searchParams.get('difficulty') || 'mixed';
    const count = Math.min(Math.max(parseInt(searchParams.get('count') || '10') || 10, 1), 30);

    if (!ageGroup || !skillArea) {
      return NextResponse.json({ error: 'age_group and skill_area are required' }, { status: 400 });
    }
    if (!VALID_AGE_GROUPS.has(ageGroup) || !VALID_SKILL_AREAS.has(skillArea) || !VALID_DIFFICULTIES.has(difficulty)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const db = getDb();
    const conds = [eq(questions.ageGroup, ageGroup), eq(questions.isActive, true)];
    if (skillArea !== 'mixed') conds.push(eq(questions.skillArea, skillArea));
    if (difficulty !== 'mixed') conds.push(eq(questions.difficulty, difficulty));

    const rows = await db
      .select()
      .from(questions)
      .where(and(...conds))
      .orderBy(sql`RANDOM()`)
      .limit(count);

    const safeQuestions = rows.map(({ correctOptionIndex: _c, explanationAr: _e, ...question }) => question);
    return NextResponse.json({ questions: safeQuestions });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
