import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { otpCodes, parents } from '@/lib/db/schema';
import { hashCode, createParentSession, setParentCookie } from '@/lib/parent-auth';
import { rateLimit, getIp } from '@/lib/rate-limit';
import { eq, and, gt } from 'drizzle-orm';

const OTP_MAX_ATTEMPTS = 3;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const { allowed } = rateLimit(`otp-verify:${ip}`, 10, 5 * 60 * 1000);
  if (!allowed) {
    return Response.json({ error: 'محاولات كثيرة. انتظر قليلاً.' }, { status: 429 });
  }

  let body: { email?: string; code?: string };
  try { body = await req.json(); } catch { return Response.json({ error: 'طلب غير صحيح' }, { status: 400 }); }

  const email = (body.email || '').trim().toLowerCase();
  const code = (body.code || '').trim();

  if (!email || !EMAIL_REGEX.test(email) || !code || code.length !== 6) {
    return Response.json({ error: 'بيانات غير صحيحة' }, { status: 400 });
  }

  const db = getDb();

  // Find active (unused, not expired) OTP for this email
  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(and(
      eq(otpCodes.email, email),
      eq(otpCodes.used, false),
    ))
    .orderBy(otpCodes.createdAt)
    .limit(1);

  if (!otp) {
    return Response.json({ error: 'الرمز غير صحيح أو انتهت صلاحيته' }, { status: 400 });
  }

  if (new Date(otp.expiresAt) < new Date()) {
    await db.delete(otpCodes).where(eq(otpCodes.id, otp.id));
    return Response.json({ error: 'انتهت صلاحية الرمز. أرسل رمزاً جديداً.' }, { status: 400 });
  }

  if ((otp.attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    await db.delete(otpCodes).where(eq(otpCodes.id, otp.id));
    return Response.json({ error: 'تجاوزت عدد المحاولات. أرسل رمزاً جديداً.' }, { status: 400 });
  }

  const inputHash = await hashCode(code);
  if (inputHash !== otp.codeHash) {
    await db.update(otpCodes)
      .set({ attempts: (otp.attempts ?? 0) + 1 })
      .where(eq(otpCodes.id, otp.id));
    const remaining = OTP_MAX_ATTEMPTS - (otp.attempts ?? 0) - 1;
    return Response.json({ error: `رمز غير صحيح. ${remaining > 0 ? `لديك ${remaining} محاولة` : 'انتهت المحاولات'}` }, { status: 400 });
  }

  // Mark OTP as used
  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));

  // Find or create parent
  let [parent] = await db.select().from(parents).where(eq(parents.email, email)).limit(1);
  let isNewUser = false;

  if (!parent) {
    isNewUser = true;
    const [inserted] = await db.insert(parents).values({
      id: crypto.randomUUID(),
      email,
      unsubscribeToken: crypto.randomUUID(),
    }).returning();
    parent = inserted;
  } else {
    // Update last login
    await db.update(parents)
      .set({ lastLoginAt: new Date().toISOString() })
      .where(eq(parents.id, parent.id));
  }

  // Create session
  const token = await createParentSession(parent.id);
  await setParentCookie(token);

  return Response.json({ success: true, isNewUser });
}
