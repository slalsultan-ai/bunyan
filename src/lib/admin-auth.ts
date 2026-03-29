import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb } from './db';
import { siteContent } from './db/schema';
import { eq, sql } from 'drizzle-orm';

const SESSION_KEY = 'admin_session';
const OTP_KEY = 'admin_otp';
const OTP_TTL_MS = 10 * 60 * 1000;     // 10 minutes
const OTP_MAX_ATTEMPTS = 3;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours — matches cookie maxAge

interface SessionRecord {
  token: string;
  expiresAt: number;
}

async function hashCode(code: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getValidToken(): Promise<string | null> {
  try {
    const db = getDb();
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, SESSION_KEY));
    if (!row) return null;
    const val = row.value;
    // Handle new format { token, expiresAt }
    if (typeof val === 'object' && val !== null && 'token' in (val as object)) {
      const record = val as SessionRecord;
      if (Date.now() > record.expiresAt) {
        await db.delete(siteContent).where(eq(siteContent.key, SESSION_KEY));
        return null;
      }
      return record.token;
    }
    // Legacy format — plain string token (no expiry). Return as-is; will upgrade on next login.
    return typeof val === 'string' ? val : null;
  } catch {
    return null;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return false;
  const valid = await getValidToken();
  if (!valid) return false;
  // Constant-time comparison — both are UUIDs (36 ASCII chars)
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(valid));
  } catch {
    return false; // mismatched lengths
  }
}

export async function createAdminSession(): Promise<string> {
  const token = crypto.randomUUID();
  const record: SessionRecord = { token, expiresAt: Date.now() + SESSION_TTL_MS };
  const db = getDb();
  await db
    .insert(siteContent)
    .values({ key: SESSION_KEY, value: record as never })
    .onConflictDoUpdate({
      target: siteContent.key,
      set: { value: record as never, updatedAt: sql`CURRENT_TIMESTAMP` },
    });
  return token;
}

export async function invalidateAdminSession(): Promise<void> {
  const db = getDb();
  await db.delete(siteContent).where(eq(siteContent.key, SESSION_KEY));
}

// ── OTP ────────────────────────────────────────────────────────────────────

interface OtpRecord {
  codeHash: string;
  expiresAt: number;
  attempts: number;
}

export async function createOtpChallenge(): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
  const codeHash = await hashCode(code);
  const record: OtpRecord = {
    codeHash,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  };
  const db = getDb();
  await db
    .insert(siteContent)
    .values({ key: OTP_KEY, value: record as never })
    .onConflictDoUpdate({
      target: siteContent.key,
      set: { value: record as never, updatedAt: sql`CURRENT_TIMESTAMP` },
    });
  return code;
}

export type OtpVerifyResult = 'ok' | 'invalid' | 'expired' | 'max_attempts';

export async function verifyOtpChallenge(code: string): Promise<OtpVerifyResult> {
  const db = getDb();
  const [row] = await db.select().from(siteContent).where(eq(siteContent.key, OTP_KEY));
  if (!row) return 'invalid';

  const record = row.value as OtpRecord;
  const now = Date.now();

  if (now > record.expiresAt) {
    await db.delete(siteContent).where(eq(siteContent.key, OTP_KEY));
    return 'expired';
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await db.delete(siteContent).where(eq(siteContent.key, OTP_KEY));
    return 'max_attempts';
  }

  const codeHash = await hashCode(code);
  // Constant-time comparison — prevents timing oracle attacks on the OTP hash
  const isMatch = codeHash.length === record.codeHash.length &&
    timingSafeEqual(Buffer.from(codeHash, 'hex'), Buffer.from(record.codeHash, 'hex'));
  if (!isMatch) {
    // Increment attempts
    const updated: OtpRecord = { ...record, attempts: record.attempts + 1 };
    await db
      .update(siteContent)
      .set({ value: updated as never, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(siteContent.key, OTP_KEY));
    return 'invalid';
  }

  // Valid — delete OTP so it can't be reused
  await db.delete(siteContent).where(eq(siteContent.key, OTP_KEY));
  return 'ok';
}
