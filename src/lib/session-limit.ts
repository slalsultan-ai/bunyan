import { getDb } from './db';
import { sessions } from './db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { hasFeatureAccess } from './feature-flags';
import { isChildPremium } from './premium';

const FREE_DAILY_LIMIT = 3;

export interface SessionLimitResult {
  allowed: boolean;
  remaining: number;
  total: number;
  limit: number;
}

/** Get today's date in Riyadh timezone (YYYY-MM-DD) */
function getTodayRiyadh(): string {
  return new Date().toLocaleString('en-CA', { timeZone: 'Asia/Riyadh' }).split(',')[0];
}

/**
 * Check if a child can start a new session.
 * - If session_limit flag is off → always allowed
 * - Daily challenge sessions don't count
 */
export async function checkSessionLimit(childId: string): Promise<SessionLimitResult> {
  const featureEnabled = await hasFeatureAccess('session_limit');
  if (!featureEnabled) {
    return { allowed: true, remaining: 999, total: 0, limit: 999 };
  }

  // Premium children bypass the session limit
  const premium = await isChildPremium(childId);
  if (premium) {
    return { allowed: true, remaining: 999, total: 0, limit: 999 };
  }

  const total = await getSessionCountToday(childId);
  const remaining = Math.max(0, FREE_DAILY_LIMIT - total);

  return {
    allowed: total < FREE_DAILY_LIMIT,
    remaining,
    total,
    limit: FREE_DAILY_LIMIT,
  };
}

/**
 * Count non-daily-challenge sessions started today (Riyadh time) for a child.
 */
export async function getSessionCountToday(childId: string): Promise<number> {
  const db = getDb();
  const today = getTodayRiyadh();

  const [row] = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(sessions)
    .where(
      and(
        eq(sessions.childId, childId),
        sql`DATE(started_at) = ${today}`,
        sql`COALESCE(is_daily_challenge, 0) = 0`,
        sql`completed_at IS NOT NULL`
      )
    );

  return row?.cnt ?? 0;
}

/**
 * Check session limit for a guest (by guestId).
 */
export async function checkGuestSessionLimit(guestId: string): Promise<SessionLimitResult> {
  const featureEnabled = await hasFeatureAccess('session_limit');
  if (!featureEnabled) {
    return { allowed: true, remaining: 999, total: 0, limit: 999 };
  }

  const db = getDb();
  const today = getTodayRiyadh();

  const [row] = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(sessions)
    .where(
      and(
        eq(sessions.guestId, guestId),
        sql`DATE(started_at) = ${today}`,
        sql`COALESCE(is_daily_challenge, 0) = 0`,
        sql`completed_at IS NOT NULL`
      )
    );

  const total = row?.cnt ?? 0;
  const remaining = Math.max(0, FREE_DAILY_LIMIT - total);

  return {
    allowed: total < FREE_DAILY_LIMIT,
    remaining,
    total,
    limit: FREE_DAILY_LIMIT,
  };
}
