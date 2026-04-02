import { NextRequest, NextResponse } from 'next/server';
import { getParentSession } from '@/lib/parent-auth';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { getReviewQuestions } from '@/lib/review-queue';

export async function GET(req: NextRequest) {
  const session = await getParentSession();
  const email = session?.email ?? null;

  const hasAccess = await hasFeatureAccess('review_mode', email);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Feature not available' }, { status: 403 });
  }

  const guestId = req.nextUrl.searchParams.get('guestId') ?? undefined;
  const childId = req.nextUrl.searchParams.get('childId') ?? undefined;

  if (!guestId && !childId) {
    return NextResponse.json({ error: 'guestId or childId required' }, { status: 400 });
  }

  try {
    const questions = await getReviewQuestions({ guestId, childId, limit: 10 });

    // Strip answer keys (same as /api/questions)
    const publicQuestions = questions.map(({ correctOptionIndex, explanationAr, ...rest }) => rest);

    return NextResponse.json({ questions: publicQuestions });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
