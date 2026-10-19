import { NextRequest, NextResponse } from 'next/server';
import { resolveMasteryAccess } from '@/lib/mastery/access';

/** Whether the mastery engine applies to this child (flag + ownership + age). */
export async function GET(req: NextRequest) {
  try {
    await resolveMasteryAccess(req.nextUrl.searchParams.get('childId'));
    return NextResponse.json({ enabled: true });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
