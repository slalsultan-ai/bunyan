import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions, sessionAnswers } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { classifyQuestionHealth, healthSortKey, summarizeHealth } from '@/lib/question-health';

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
    .having(sql`count(${sessionAnswers.id}) >= 3`);

  const result = rows.map(r => {
    const base = {
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
      optionDist: [
        Number(r.opt0),
        Number(r.opt1),
        Number(r.opt2),
        Number(r.opt3),
      ],
    };
    return { ...base, ...classifyQuestionHealth(base) };
  });

  result.sort((a, b) => {
    const [ga, va] = healthSortKey(a);
    const [gb, vb] = healthSortKey(b);
    return ga - gb || va - vb;
  });

  return NextResponse.json({
    questions: result,
    summary: summarizeHealth(result),
  });
}
