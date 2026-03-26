import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { eq, and, inArray, sql, notInArray } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const ageGroup = searchParams.get('age_group');
    const skillArea = searchParams.get('skill_area');
    const difficulty = searchParams.get('difficulty') || 'mixed';
    const count = Math.min(parseInt(searchParams.get('count') || '10'), 20);
    const excludeRaw = searchParams.get('exclude');
    const exclude = excludeRaw ? excludeRaw.split(',').filter(Boolean) : [];

    if (!ageGroup || !skillArea) {
      return NextResponse.json({ error: 'age_group and skill_area are required' }, { status: 400 });
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

    return NextResponse.json({ questions: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
