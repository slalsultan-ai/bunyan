import { NextRequest, NextResponse } from 'next/server';
import { createOtpChallenge } from '@/lib/admin-auth';
import { getAdminEmails, isAdminEmail } from '@/lib/admin-emails';
import { sendAdminOtp } from '@/lib/email';
import { checkRateLimit, getIp } from '@/lib/rate-limit-db';

const ADMIN_LOGIN_EMAIL_COOKIE = 'admin_login_email';

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const rateCheck = await checkRateLimit(`admin-login:${ip}`, 3, 15 * 60);

  if (!rateCheck.allowed) {
    const mins = Math.ceil(rateCheck.retryAfter! / 60);
    return NextResponse.json(
      { error: `محاولات كثيرة جداً. حاول بعد ${mins} دقيقة` },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } },
    );
  }

  if (getAdminEmails().length === 0) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const { email } = body;

  // Always respond with success to avoid email enumeration
  if (!email || typeof email !== 'string' || !isAdminEmail(email)) {
    return NextResponse.json({ success: true });
  }

  const adminEmail = email.trim().toLowerCase();
  try {
    const code = await createOtpChallenge(adminEmail);
    await sendAdminOtp(adminEmail, code);
  } catch (err) {
    console.error('[admin/login] Failed to send OTP:', err);
  }

  // Remember which admin asked for the code so /verify checks that admin's OTP.
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_LOGIN_EMAIL_COOKIE, adminEmail, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/admin',
    maxAge: 15 * 60,
  });
  return res;
}
