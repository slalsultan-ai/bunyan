import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedParent } from '@/lib/parent-auth';
import { isMockTestsEnabled, getMockTestResult } from '@/lib/mock-tests';

export async function GET(req: NextRequest) {
  try {
    const parent = await getAuthenticatedParent();
    const enabled = await isMockTestsEnabled(parent?.email, parent?.id);
    if (!enabled) {
      return NextResponse.json({ enabled: false });
    }

    const resultId = req.nextUrl.searchParams.get('resultId');
    if (!resultId) {
      return NextResponse.json({ error: 'resultId is required' }, { status: 400 });
    }

    const result = await getMockTestResult(Number(resultId));
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('[mock-tests/result error]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
