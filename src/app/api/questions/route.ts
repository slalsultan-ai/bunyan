import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { eq, and, sql, notInArray } from 'drizzle-orm';
import { rateLimit, getIp } from '@/lib/rate-limit';

const VALID_AGE_GROUPS = new Set(['4-5', '6-9', '10-12']);
const VALID_SKILL_AREAS = new Set(['quantitative', 'verbal', 'logical_patterns', 'mixed']);
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'mixed']);

export async function GET(req: NextRequest) {
  const rl = rateLimit(`questions:${getIp(req)}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  try {
    const { searchParams } = req.nextUrl;
    const ageGroup = searchParams.get('age_group');
    const skillArea = searchParams.get('skill_area');
    const difficulty = searchParams.get('difficulty') || 'mixed';
    const count = Math.min(Math.max(parseInt(searchParams.get('count') || '10') || 10, 1), 20);
    const excludeRaw = searchParams.get('exclude');
    const exclude = excludeRaw ? excludeRaw.split(',').filter(s => /^[0-9a-f-]{36}$/.test(s)).slice(0, 50) : [];

    if (!ageGroup || !skillArea) {
      return NextResponse.json({ error: 'age_group and skill_area are required' }, { status: 400 });
    }
    if (!VALID_AGE_GROUPS.has(ageGroup) || !VALID_SKILL_AREAS.has(skillArea) || !VALID_DIFFICULTIES.has(difficulty)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const db = getDb();
    const baseConditions = [
      eq(questions.ageGroup, ageGroup),
      eq(questions.isActive, true),
    ];
    if (exclude.length > 0) baseConditions.push(notInArray(questions.id, exclude) as ReturnType<typeof eq>);

    let rows;

    if (skillArea === 'mixed') {
      const skills = ['quantitative', 'verbal', 'logical_patterns'];
      const perSkill = Math.ceil(count / skills.length);
      const results = await Promise.all(skills.map(skill => {
        const conds = [...baseConditions, eq(questions.skillArea, skill)];
        if (difficulty !== 'mixed') conds.push(eq(questions.difficulty, difficulty));
        return db.select().from(questions).where(and(...conds)).orderBy(sql`RANDOM()`).limit(perSkill);
      }));
      rows = results.flat().sort(() => Math.random() - 0.5).slice(0, count);
    } else {
      const conds = [...baseConditions, eq(questions.skillArea, skillArea)];
      if (difficulty !== 'mixed') conds.push(eq(questions.difficulty, difficulty));
      rows = await db.select().from(questions).where(and(...conds)).orderBy(sql`RANDOM()`).limit(count);
    }

    const safe = rows.map(({ correctOptionIndex: _c, explanationAr: _e, ...q }) => q);
    return NextResponse.json({ questions: safe });
  } catch (e) {
    console.error('[questions API error]', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
