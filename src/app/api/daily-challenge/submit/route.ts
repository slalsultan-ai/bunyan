import { NextRequest, NextResponse } from 'next/server';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { submitChallengeAnswer, completeDailyChallenge, getStreakInfo, getTodayRiyadh } from '@/lib/daily-challenge';
import { getAuthenticatedParent } from '@/lib/parent-auth';
import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const parent = await getAuthenticatedParent();
    const email = parent?.email ?? null;

    const enabled = await hasFeatureAccess('daily_challenge', email);
    if (!enabled) {
      return NextResponse.json({ error: 'Feature disabled' }, { status: 403 });
    }

    const body = await req.json();
    const { childId, questionId, selectedOption } = body;

    if (!childId || !questionId || selectedOption === undefined || selectedOption === null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Server-side answer verification
    const db = getDb();
    const [question] = await db
      .select({ correctOptionIndex: questions.correctOptionIndex })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const isCorrect = Number(selectedOption) === question.correctOptionIndex;
    const today = getTodayRiyadh();

    await submitChallengeAnswer(childId, today, questionId, String(selectedOption), isCorrect);

    // Check if all 3 questions are answered
    const { sql } = await import('drizzle-orm');
    const answered = await db
      .select()
      .from(sql`daily_challenge_results`)
      .where(sql`child_id = ${childId} AND challenge_date = ${today}`) as any[];

    let completion = null;
    if (answered.length >= 3) {
      completion = await completeDailyChallenge(childId, today);
    }

    const streak = await getStreakInfo(childId);

    return NextResponse.json({
      isCorrect,
      correctOptionIndex: question.correctOptionIndex,
      answeredCount: answered.length,
      completed: answered.length >= 3,
      completion,
      streak,
    });
  } catch (e) {
    console.error('[daily-challenge submit]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
