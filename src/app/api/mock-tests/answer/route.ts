import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedParent } from '@/lib/parent-auth';
import { isMockTestsEnabled, submitMockAnswer } from '@/lib/mock-tests';

export async function POST(req: NextRequest) {
  try {
    const parent = await getAuthenticatedParent();
    const enabled = await isMockTestsEnabled(parent?.email);
    if (!enabled) {
      return NextResponse.json({ enabled: false });
    }

    const { resultId, questionId, answer, isCorrect, timeSpent } = await req.json();
    if (!resultId || !questionId || answer === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await submitMockAnswer(
      resultId,
      questionId,
      String(answer),
      Boolean(isCorrect),
      Number(timeSpent) || 0
    );

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('[mock-tests/answer error]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
