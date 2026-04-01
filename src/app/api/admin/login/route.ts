import { NextRequest, NextResponse } from 'next/server';
import { createOtpChallenge } from '@/lib/admin-auth';
import { sendAdminOtp } from '@/lib/email';
import { checkRateLimit, getIp } from '@/lib/rate-limit-db';

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

  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const { email } = body;

  // Always respond with success to avoid email enumeration
  if (!email || typeof email !== 'string' || email.trim().toLowerCase() !== adminEmail.toLowerCase()) {
    return NextResponse.json({ success: true });
  }

  try {
    const code = await createOtpChallenge();
    await sendAdminOtp(adminEmail, code);
  } catch (err) {
    console.error('[admin/login] Failed to send OTP:', err);
  }

  return NextResponse.json({ success: true });
}
