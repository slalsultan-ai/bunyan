import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions, sessionAnswers } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  const rows = await db
    .select({
      id: questions.id,
      questionTextAr: questions.questionTextAr,
      skillArea: questions.skillArea,
      ageGroup: questions.ageGroup,
      difficulty: questions.difficulty,
      correctOptionIndex: questions.correctOptionIndex,
      isActive: questions.isActive,
      totalAttempts: sql<number>`count(${sessionAnswers.id})`,
      correctCount:  sql<number>`sum(case when ${sessionAnswers.isCorrect} = 1 then 1 else 0 end)`,
      avgTimeMs:     sql<number>`round(avg(${sessionAnswers.timeSpentMs}))`,
      opt0: sql<number>`sum(case when ${sessionAnswers.selectedOption} = 0 then 1 else 0 end)`,
      opt1: sql<number>`sum(case when ${sessionAnswers.selectedOption} = 1 then 1 else 0 end)`,
      opt2: sql<number>`sum(case when ${sessionAnswers.selectedOption} = 2 then 1 else 0 end)`,
      opt3: sql<number>`sum(case when ${sessionAnswers.selectedOption} = 3 then 1 else 0 end)`,
    })
    .from(questions)
    .innerJoin(sessionAnswers, eq(sessionAnswers.questionId, questions.id))
    .groupBy(questions.id)
    .having(sql`count(${sessionAnswers.id}) >= 3`)
    .orderBy(
      sql`cast(sum(case when ${sessionAnswers.isCorrect} = 1 then 1 else 0 end) as real) / count(${sessionAnswers.id})`
    );

  const result = rows.map(r => ({
    id: r.id,
    questionTextAr: r.questionTextAr,
    skillArea: r.skillArea,
    ageGroup: r.ageGroup,
    difficulty: r.difficulty,
    correctOptionIndex: r.correctOptionIndex,
    isActive: r.isActive,
    totalAttempts: Number(r.totalAttempts),
    correctCount: Number(r.correctCount),
    avgTimeMs: Number(r.avgTimeMs) || 0,
    passRate: Number(r.totalAttempts) > 0
      ? Math.round((Number(r.correctCount) / Number(r.totalAttempts)) * 100)
      : 0,
    optionDist: [
      Number(r.opt0),
      Number(r.opt1),
      Number(r.opt2),
      Number(r.opt3),
    ],
  }));

  const critical = result.filter(r => r.passRate < 30).length;
  const warning  = result.filter(r => r.passRate >= 30 && r.passRate < 50).length;
  const healthy  = result.filter(r => r.passRate >= 50).length;
  const avgPassRate = result.length > 0
    ? Math.round(result.reduce((s, r) => s + r.passRate, 0) / result.length)
    : 0;

  return NextResponse.json({
    questions: result,
    summary: { critical, warning, healthy, avgPassRate, total: result.length },
  });
}
