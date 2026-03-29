import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { otpCodes } from '@/lib/db/schema';
import { hashCode } from '@/lib/parent-auth';
import { sendParentOtp } from '@/lib/email/otp';
import { rateLimit, getIp } from '@/lib/rate-limit';
import { eq, gt, and } from 'drizzle-orm';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const { allowed, retryAfter } = rateLimit(`otp-send:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return Response.json({ error: 'حاول مرة أخرى بعد قليل' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
  }

  let body: { email?: string };
  try { body = await req.json(); } catch { return Response.json({ error: 'طلب غير صحيح' }, { status: 400 }); }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return Response.json({ error: 'البريد الإلكتروني غير صحيح' }, { status: 400 });
  }

  // Rate limit by email: max 3 OTPs per 15 min
  const { allowed: emailAllowed } = rateLimit(`otp-email:${email}`, 3, 15 * 60 * 1000);
  if (!emailAllowed) {
    return Response.json({ error: 'تم إرسال عدة رموز لهذا البريد. انتظر ١٥ دقيقة.' }, { status: 429 });
  }

  const db = getDb();

  // Invalidate any existing active OTPs for this email
  await db
    .delete(otpCodes)
    .where(and(eq(otpCodes.email, email), eq(otpCodes.used, false)));

  // Generate new 6-digit OTP
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await db.insert(otpCodes).values({
    id: crypto.randomUUID(),
    email,
    codeHash,
    expiresAt,
    attempts: 0,
    used: false,
  });

  try {
    await sendParentOtp(email, code);
  } catch (err) {
    console.error('OTP email send failed:', err);
    return Response.json({ error: 'فشل إرسال البريد. حاول مرة أخرى.' }, { status: 500 });
  }

  return Response.json({ success: true });
}
