import { NextRequest, NextResponse } from 'next/server';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { MAWHIBA_L1_LINK_FLAG } from '@/lib/mastery/access';
import { MAWHIBA_L1_AGE_MESSAGE } from '@/lib/mawhiba/eligibility';
import {
  GUEST_AGE_COOKIE, GUEST_ID_COOKIE, guestCookieOptions, isGuestId, newGuestId, parseGuestAge, readGuest,
} from '@/lib/mawhiba/guest';
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

/** Start (or update the age of) this browser's guest learner. Body: { age }. */
export async function POST(req: NextRequest) {
  if (!(await linkOpen())) return NextResponse.json({ error: 'الميزة غير مفعّلة' }, { status: 403 });

  const rl = await checkRateLimit(`mawhiba-guest:${getIp(req)}`, 20, 3600);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'محاولات كثيرة، حاول لاحقاً' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  const body = await req.json().catch(() => ({}));
  const age = parseGuestAge(body?.age);
  if (age === null) return NextResponse.json({ error: MAWHIBA_L1_AGE_MESSAGE }, { status: 400 });

  // Keep an existing guest's progress; only the age changes.
  const existing = req.cookies.get(GUEST_ID_COOKIE)?.value;
  const childId = isGuestId(existing) ? existing : newGuestId();

  const res = NextResponse.json({ guest: { childId, age } });
  res.cookies.set(GUEST_ID_COOKIE, childId, guestCookieOptions);
  res.cookies.set(GUEST_AGE_COOKIE, String(age), guestCookieOptions);
  return res;
}
