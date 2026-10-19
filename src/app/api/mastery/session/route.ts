import { NextRequest, NextResponse } from 'next/server';
import { masteryErrorResponse, resolveMasteryAccess } from '@/lib/mastery/access';
import { startOrResumeSession } from '@/lib/mastery/service';

/** Start a mastery session, or resume the open one at its current question. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const access = await resolveMasteryAccess(body?.childId);
    const session = await startOrResumeSession(access.childId, access.ageGroup, access.email);
    return NextResponse.json({ session });
  } catch (e) {
    return masteryErrorResponse(e, 'session');
  }
}
