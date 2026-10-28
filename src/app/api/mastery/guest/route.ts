import { NextRequest, NextResponse } from 'next/server';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { MAWHIBA_L1_LINK_FLAG } from '@/lib/mastery/access';
import { GUEST_ID_COOKIE, guestCookieOptions, isGuestId, newGuestId, readGuest } from '@/lib/mawhiba/guest';
import { checkRateLimit, getIp } from '@/lib/rate-limit-db';

/** Open to visitors without an account only while the direct link is open to everyone. */
async function linkOpen(): Promise<boolean> {
  return hasFeatureAccess(MAWHIBA_L1_LINK_FLAG, null, null);
}

/** This browser's guest learner, if any. */
export async function GET(req: NextRequest) {
  const open = await linkOpen();
  const guest = open ? readGuest((name) => req.cookies.get(name)?.value) : null;
  return NextResponse.json({ open, guest });
}

/** Start this browser's guest learner (or keep the existing one). */
export async function POST(req: NextRequest) {
  if (!(await linkOpen())) return NextResponse.json({ error: 'الميزة غير مفعّلة' }, { status: 403 });

  const existing = req.cookies.get(GUEST_ID_COOKIE)?.value;
  if (isGuestId(existing)) return NextResponse.json({ guest: { childId: existing } });

  const rl = await checkRateLimit(`mawhiba-guest:${getIp(req)}`, 20, 3600);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'محاولات كثيرة، حاول لاحقاً' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  const childId = newGuestId();
  const res = NextResponse.json({ guest: { childId } });
  res.cookies.set(GUEST_ID_COOKIE, childId, guestCookieOptions);
  return res;
}
