import { getDb } from './db';
import { rateLimits } from './db/schema';
import { eq, and, gt, sql, lt } from 'drizzle-orm';

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const db = getDb();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000).toISOString();

  // Count attempts in the current window
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(attempts), 0)` })
    .from(rateLimits)
    .where(and(eq(rateLimits.key, key), gt(rateLimits.windowStart, windowStart)));

  const currentAttempts = row?.total ?? 0;

  if (currentAttempts >= maxAttempts) {
    // Find the earliest attempt in window to calculate retryAfter
    const [earliest] = await db
      .select({ ws: rateLimits.windowStart })
      .from(rateLimits)
      .where(and(eq(rateLimits.key, key), gt(rateLimits.windowStart, windowStart)))
      .orderBy(rateLimits.windowStart)
      .limit(1);

    const resetAt = earliest
      ? new Date(earliest.ws).getTime() + windowSeconds * 1000
      : now.getTime() + windowSeconds * 1000;
    const retryAfter = Math.ceil((resetAt - now.getTime()) / 1000);
    return { allowed: false, remaining: 0, retryAfter: Math.max(retryAfter, 1) };
  }

  // Record this attempt
  await db.insert(rateLimits).values({
    key,
    attempts: 1,
    windowStart: now.toISOString(),
  });

  // Periodic cleanup: 5% chance to delete old entries (> 1 hour old)
  if (Math.random() < 0.05) {
    const oneHourAgo = new Date(now.getTime() - 3600_000).toISOString();
    await db.delete(rateLimits).where(lt(rateLimits.windowStart, oneHourAgo)).catch(() => {});
  }

  const remaining = maxAttempts - currentAttempts - 1;
  return { allowed: true, remaining: Math.max(remaining, 0) };
}

export function getIp(req: { headers: { get(name: string): string | null } }): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}
