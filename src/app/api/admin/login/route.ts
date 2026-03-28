import { NextRequest, NextResponse } from 'next/server';
import { createOtpChallenge } from '@/lib/admin-auth';
import { sendAdminOtp } from '@/lib/email';

// Rate limit: max 3 OTP requests per 15 min per IP
const ipAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 3;
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
  if (entry.count >= MAX_REQUESTS) {
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

  const adminEmail = process.env.ADMIN_EMAIL;
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
  } catch {
    // Don't leak internal errors
  }

  return NextResponse.json({ success: true });
}
