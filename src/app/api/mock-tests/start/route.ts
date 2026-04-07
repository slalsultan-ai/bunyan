import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedParent } from '@/lib/parent-auth';
import { isMockTestsEnabled, startMockTest, resumeMockTest } from '@/lib/mock-tests';

export async function POST(req: NextRequest) {
  try {
    const parent = await getAuthenticatedParent();
    const enabled = await isMockTestsEnabled(parent?.email);
    if (!enabled) {
      return NextResponse.json({ enabled: false });
    }

    const { childId, testId } = await req.json();
    if (!childId || !testId) {
      return NextResponse.json({ error: 'childId and testId are required' }, { status: 400 });
    }

    // Check for existing in-progress test first
    const existing = await resumeMockTest(childId);
    if (existing) {
      if (existing.test.id === testId) {
        // Resume the same test
        return NextResponse.json(existing);
      }
      return NextResponse.json(
        { error: 'أكمل الاختبار الحالي أولاً', inProgressTestId: existing.test.id },
        { status: 409 }
      );
    }

    const result = await startMockTest(childId, testId);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('[mock-tests/start error]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
