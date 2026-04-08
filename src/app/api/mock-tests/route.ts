import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedParent } from '@/lib/parent-auth';
import { isMockTestsEnabled, getAvailableMockTests } from '@/lib/mock-tests';
import { getDb } from '@/lib/db';
import { children } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const childId = req.nextUrl.searchParams.get('childId');
    if (!childId) {
      return NextResponse.json({ error: 'childId is required' }, { status: 400 });
    }

    const parent = await getAuthenticatedParent();
    const enabled = await isMockTestsEnabled(parent?.email, parent?.id);
    if (!enabled) {
      return NextResponse.json({ enabled: false });
    }

    // Check age group
    const db = getDb();
    const [child] = await db
      .select({ ageGroup: children.ageGroup })
      .from(children)
      .where(eq(children.id, childId))
      .limit(1);

    if (!child) {
      return NextResponse.json({ error: 'الطفل غير موجود' }, { status: 404 });
    }

    if (child.ageGroup !== '10-12') {
      return NextResponse.json({
        enabled: true,
        ageRestricted: true,
        message: 'اختبارات المحاكاة متاحة للفئة 10-12 فقط',
      });
    }

    const data = await getAvailableMockTests(childId);
    return NextResponse.json({ enabled: true, ...data });
  } catch (e) {
    console.error('[mock-tests API error]', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
