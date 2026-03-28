import { NextRequest, NextResponse } from 'next/server';
import { verifyOtpChallenge, createAdminSession } from '@/lib/admin-auth';

// Rate limit: max 5 verify attempts per 15 min per IP (additional guard alongside OTP attempt counter)
const ipAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = ipAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(ip);

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

  // OTP valid — clear IP rate limit and create session
  ipAttempts.delete(ip);

  let token: string;
  try {
    token = await createAdminSession();
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
