import { NextRequest, NextResponse } from 'next/server';
import { checkSessionLimit, checkGuestSessionLimit } from '@/lib/session-limit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const childId = searchParams.get('childId');
    const guestId = searchParams.get('guestId');

    if (childId) {
      const result = await checkSessionLimit(childId);
      return NextResponse.json(result);
    }

    if (guestId) {
      const result = await checkGuestSessionLimit(guestId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'childId or guestId required' }, { status: 400 });
  } catch (e) {
    console.error('[session-limit]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
