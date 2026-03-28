// Returns full question data including correctOptionIndex for the printable answer key.
// This is intentional — worksheets are print materials meant to include an answer key.
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { eq, and, sql, notInArray } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const ageGroup = searchParams.get('age_group');
    const skillArea = searchParams.get('skill_area');
    const difficulty = searchParams.get('difficulty') || 'mixed';
    const count = Math.min(parseInt(searchParams.get('count') || '10'), 30);

    if (!ageGroup || !skillArea) {
      return NextResponse.json({ error: 'age_group and skill_area are required' }, { status: 400 });
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

    return NextResponse.json({ questions: rows });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
