import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sessions, sessionAnswers, guestProgress } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guestId, ageGroup, skillArea, score, totalQuestions, pointsEarned, timeTakenMs, answers } = body;

    if (!ageGroup || !skillArea) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(sessions).values({
      id: sessionId,
      guestId: guestId || null,
      ageGroup,
      skillArea,
      score: score ?? 0,
      totalQuestions: totalQuestions ?? 10,
      pointsEarned: pointsEarned ?? 0,
      timeTakenMs: timeTakenMs ?? 0,
      completedAt: now,
    });

    if (answers?.length > 0) {
      await db.insert(sessionAnswers).values(
        answers.map((a: { questionId: string; selectedOption: number | null; isCorrect: boolean; timeSpentMs: number }) => ({
          id: crypto.randomUUID(),
          sessionId,
          questionId: a.questionId,
          selectedOption: a.selectedOption ?? null,
          isCorrect: a.isCorrect,
          timeSpentMs: a.timeSpentMs ?? 0,
        }))
      );
    }

    if (guestId) {
      await db.insert(guestProgress).values({
        guestId,
        totalPoints: pointsEarned ?? 0,
        totalSessions: 1,
        totalCorrect: score ?? 0,
        totalAnswered: totalQuestions ?? 0,
        lastPracticeDate: now.split('T')[0],
        updatedAt: now,
      }).onConflictDoUpdate({
        target: guestProgress.guestId,
        set: {
          totalPoints: sql`total_points + ${pointsEarned ?? 0}`,
          totalSessions: sql`total_sessions + 1`,
          totalCorrect: sql`total_correct + ${score ?? 0}`,
          totalAnswered: sql`total_answered + ${totalQuestions ?? 0}`,
          lastPracticeDate: now.split('T')[0],
          updatedAt: now,
        },
      });
    }

    return NextResponse.json({ sessionId, success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
