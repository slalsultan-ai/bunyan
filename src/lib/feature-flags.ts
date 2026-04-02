import { getDb } from './db';
import { featureFlags } from './db/schema';
import { eq, sql } from 'drizzle-orm';

export interface FeatureFlag {
  id: number;
  flagKey: string;
  title: string;
  description: string | null;
  enabled: boolean;
  allowedEmails: string;
  createdAt: string;
  updatedAt: string;
}

function toBoolean(val: number | null | undefined): boolean {
  return val === 1;
}

function mapRow(row: typeof featureFlags.$inferSelect): FeatureFlag {
  return {
    id: row.id,
    flagKey: row.flagKey,
    title: row.title,
    description: row.description,
    enabled: toBoolean(row.enabled),
    allowedEmails: row.allowedEmails ?? '',
    createdAt: row.createdAt ?? '',
    updatedAt: row.updatedAt ?? '',
  };
}

function emailInList(email: string, allowedEmails: string | null): boolean {
  if (!allowedEmails) return false;
  const list = allowedEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/**
 * Check if a user has access to a feature flag.
 * - enabled = true -> everyone
 * - enabled = false + email in allowed_emails -> yes
 * - enabled = false + email not in allowed_emails -> no
 * - no email (visitor) -> only if enabled globally
 * - flag not found -> false (safe default)
 */
export async function hasFeatureAccess(flagKey: string, userEmail?: string | null): Promise<boolean> {
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.flagKey, flagKey))
      .limit(1);

    if (!row) return false;
    if (toBoolean(row.enabled)) return true;
    if (!userEmail) return false;
    return emailInList(userEmail, row.allowedEmails);
  } catch {
    return false;
  }
}

/**
 * Get all feature flags with their access state for a specific user.
 */
export async function getUserFeatures(userEmail?: string | null): Promise<Record<string, boolean>> {
  try {
    const db = getDb();
    const rows = await db.select().from(featureFlags);
    const result: Record<string, boolean> = {};

    for (const row of rows) {
      if (toBoolean(row.enabled)) {
        result[row.flagKey] = true;
      } else if (userEmail) {
        result[row.flagKey] = emailInList(userEmail, row.allowedEmails);
      } else {
        result[row.flagKey] = false;
      }
    }

    return result;
  } catch {
    return {};
  }
}

/**
 * Get all flags (for admin dashboard).
 */
export async function getAllFlags(): Promise<FeatureFlag[]> {
  const db = getDb();
  const rows = await db.select().from(featureFlags).orderBy(featureFlags.id);
  return rows.map(mapRow);
}

/**
 * Update a feature flag (for admin).
 */
export async function updateFlag(
  flagKey: string,
  updates: { enabled?: boolean; allowed_emails?: string }
): Promise<void> {
  const db = getDb();
  const set: Record<string, unknown> = { updatedAt: sql`datetime('now')` };

  if (updates.enabled !== undefined) {
    set.enabled = updates.enabled ? 1 : 0;
  }
  if (updates.allowed_emails !== undefined) {
    set.allowedEmails = updates.allowed_emails;
  }

  await db
    .update(featureFlags)
    .set(set)
    .where(eq(featureFlags.flagKey, flagKey));
}
