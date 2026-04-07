import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedParent } from '@/lib/parent-auth';
import { isMockTestsEnabled, completeMockTest, timeoutMockTest } from '@/lib/mock-tests';

export async function POST(req: NextRequest) {
  try {
    const parent = await getAuthenticatedParent();
    const enabled = await isMockTestsEnabled(parent?.email);
    if (!enabled) {
      return NextResponse.json({ enabled: false });
    }

    const { resultId, timedOut } = await req.json();
    if (!resultId) {
      return NextResponse.json({ error: 'resultId is required' }, { status: 400 });
    }

    const result = timedOut
      ? await timeoutMockTest(resultId)
      : await completeMockTest(resultId);

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('[mock-tests/complete error]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
