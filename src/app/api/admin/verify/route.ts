import { NextRequest, NextResponse } from 'next/server';
import { verifyOtpChallenge, createAdminSession } from '@/lib/admin-auth';
import { checkRateLimit, getIp } from '@/lib/rate-limit-db';

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const rateCheck = await checkRateLimit(`admin-verify:${ip}`, 5, 15 * 60);

  if (!rateCheck.allowed) {
    const mins = Math.ceil(rateCheck.retryAfter! / 60);
    return NextResponse.json(
      { error: `محاولات كثيرة جداً. حاول بعد ${mins} دقيقة` },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const { code } = body;

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'الرمز مطلوب' }, { status: 400 });
  }

  const result = await verifyOtpChallenge(code.trim());

  if (result === 'expired') {
    return NextResponse.json({ error: 'انتهت صلاحية الرمز، اطلب رمزاً جديداً' }, { status: 401 });
  }
  if (result === 'max_attempts') {
    return NextResponse.json({ error: 'تجاوزت عدد المحاولات، اطلب رمزاً جديداً' }, { status: 401 });
  }
  if (result === 'invalid') {
    return NextResponse.json({ error: 'الرمز غير صحيح' }, { status: 401 });
  }

  // OTP valid — create session
  let token: string;
  try {
    const adminEmail = process.env.ADMIN_EMAIL || '';
    const deviceInfo = req.headers.get('user-agent')?.slice(0, 200) || undefined;
    token = await createAdminSession(adminEmail, deviceInfo, ip);
  } catch {
    return NextResponse.json({ error: 'خطأ في إنشاء الجلسة' }, { status: 500 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
