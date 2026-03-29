import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import { isAdminAuthenticated } from '@/lib/admin-auth';

const AGE_GROUPS  = ['4-5', '6-9', '10-12'] as const;
const SKILL_AREAS = ['quantitative', 'verbal', 'logical_patterns'] as const;

export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  const [activeCounts, totalCounts] = await Promise.all([
    db
      .select({
        ageGroup:  questions.ageGroup,
        skillArea: questions.skillArea,
        cnt: sql<number>`count(*)`,
      })
      .from(questions)
      .where(eq(questions.isActive, true))
      .groupBy(questions.ageGroup, questions.skillArea),

    db
      .select({
        ageGroup:  questions.ageGroup,
        skillArea: questions.skillArea,
        cnt: sql<number>`count(*)`,
      })
      .from(questions)
      .groupBy(questions.ageGroup, questions.skillArea),
  ]);

  // Build lookup maps
  const active: Record<string, number> = {};
  const total:  Record<string, number> = {};
  for (const r of activeCounts) active[`${r.ageGroup}|${r.skillArea}`] = Number(r.cnt);
  for (const r of totalCounts)  total[`${r.ageGroup}|${r.skillArea}`]  = Number(r.cnt);

  const matrix = AGE_GROUPS.map(age =>
    SKILL_AREAS.map(skill => ({
      ageGroup:  age,
      skillArea: skill,
      active:    active[`${age}|${skill}`] ?? 0,
      total:     total[`${age}|${skill}`]  ?? 0,
    }))
  );

  // Difficulty breakdown per cell
  const diffBreakdown = await db
    .select({
      ageGroup:   questions.ageGroup,
      skillArea:  questions.skillArea,
      difficulty: questions.difficulty,
      cnt: sql<number>`count(*)`,
    })
    .from(questions)
    .where(eq(questions.isActive, true))
    .groupBy(questions.ageGroup, questions.skillArea, questions.difficulty);

  const diffMap: Record<string, Record<string, number>> = {};
  for (const r of diffBreakdown) {
    const key = `${r.ageGroup}|${r.skillArea}`;
    if (!diffMap[key]) diffMap[key] = {};
    diffMap[key][r.difficulty] = Number(r.cnt);
  }

  // Attach difficulty breakdown to matrix
  const matrixWithDiff = matrix.map(row =>
    row.map(cell => ({
      ...cell,
      byDifficulty: diffMap[`${cell.ageGroup}|${cell.skillArea}`] ?? {},
    }))
  );

  const grandTotal = Object.values(active).reduce((s, n) => s + n, 0);

  return NextResponse.json({ matrix: matrixWithDiff, grandTotal });
}
