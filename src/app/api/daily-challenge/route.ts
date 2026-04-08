import { NextRequest, NextResponse } from 'next/server';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { getOrCreateDailyChallenge, getStreakInfo, getTodayRiyadh } from '@/lib/daily-challenge';
import { getAuthenticatedParent } from '@/lib/parent-auth';

export async function GET(req: NextRequest) {
  try {
    const parent = await getAuthenticatedParent();
    const email = parent?.email ?? null;

    const enabled = await hasFeatureAccess('daily_challenge', email, parent?.id);
    if (!enabled) {
      return NextResponse.json({ enabled: false });
    }

    const { searchParams } = req.nextUrl;
    const childId = searchParams.get('childId');
    const ageGroup = searchParams.get('ageGroup');

    if (!ageGroup || !['4-5', '6-9', '10-12'].includes(ageGroup)) {
      return NextResponse.json({ error: 'Invalid ageGroup' }, { status: 400 });
    }

    const challenge = await getOrCreateDailyChallenge(ageGroup);

    // Get streak info if childId is provided
    let streak = null;
    let answeredQuestions: string[] = [];
    if (childId) {
      streak = await getStreakInfo(childId);

      // Check which questions this child has already answered today
      const { getDb } = await import('@/lib/db');
      const { sql } = await import('drizzle-orm');
      const db = getDb();
      const today = getTodayRiyadh();
      const answered = await db
        .select()
        .from(sql`daily_challenge_results`)
        .where(sql`child_id = ${childId} AND challenge_date = ${today}`) as any[];
      answeredQuestions = answered.map((a: any) => a.question_id);
    }

    return NextResponse.json({
      enabled: true,
      challenge: {
        date: challenge.date,
        ageGroup: challenge.ageGroup,
        questions: challenge.questions,
      },
      streak,
      answeredQuestions,
    });
  } catch (e) {
    console.error('[daily-challenge GET]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
