import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { DEFAULT_MASTERY_CONFIG } from '@/lib/mastery/config';
import {
  findChildrenByParentEmail, getChildMasteryReport, getContentGapsReport,
  listRecentMasteryChildren, loadMasteryConfig,
} from '@/lib/mastery/service';
import { computeAgeGroup } from '@/lib/parent-auth';
import { getDb } from '@/lib/db';
import { children } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isMasteryAgeGroup } from '@/lib/mastery/taxonomy';

/**
 * Admin read API for the mastery engine.
 *   ?childId=…  → per-child skill states + decision log
 *   ?email=…    → children of a parent account
 *   (none)      → overview: recent children, content gaps, config
 */
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = req.nextUrl.searchParams;
    const childId = params.get('childId');
    const email = params.get('email');

    if (childId) {
      const db = getDb();
      const [child] = await db.select().from(children).where(eq(children.id, childId)).limit(1);
      if (!child) return NextResponse.json({ error: 'الطفل غير موجود' }, { status: 404 });
      const ageGroup = computeAgeGroup(child.age);
      if (!isMasteryAgeGroup(ageGroup)) {
        return NextResponse.json({ child: { id: child.id, name: child.name, age: child.age, ageGroup }, supported: false });
      }
      const report = await getChildMasteryReport(childId, ageGroup);
      return NextResponse.json({ child: { id: child.id, name: child.name, age: child.age, ageGroup }, supported: true, ...report });
    }

    if (email) {
      return NextResponse.json({ children: await findChildrenByParentEmail(email) });
    }

    const [recent, gaps, config] = await Promise.all([
      listRecentMasteryChildren(),
      getContentGapsReport('6-9'),
      loadMasteryConfig(),
    ]);
    return NextResponse.json({ recent, gaps, config, defaults: DEFAULT_MASTERY_CONFIG });
  } catch (e) {
    console.error('[admin mastery GET]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
