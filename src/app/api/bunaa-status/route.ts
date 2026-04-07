import { NextRequest, NextResponse } from 'next/server';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { getAuthenticatedParent } from '@/lib/parent-auth';
import { checkComebackStatus, checkFirstVisit } from '@/lib/mascot/bunaa-triggers';

export async function GET(req: NextRequest) {
  try {
    const parent = await getAuthenticatedParent();
    const enabled = await hasFeatureAccess('mascot_bunaa', parent?.email);
    if (!enabled) {
      return NextResponse.json({ enabled: false });
    }

    const childId = req.nextUrl.searchParams.get('childId');
    if (!childId) {
      return NextResponse.json({ error: 'childId is required' }, { status: 400 });
    }

    const [isFirstVisit, comebackStatus] = await Promise.all([
      checkFirstVisit(childId),
      checkComebackStatus(childId),
    ]);

    return NextResponse.json({
      enabled: true,
      isFirstVisit,
      isComeback: comebackStatus.isComeback,
      daysSinceLastActivity: comebackStatus.daysSinceLastActivity,
    });
  } catch (e) {
    console.error('[bunaa-status error]', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
