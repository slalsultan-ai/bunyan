import { getDb } from './db';
import { featureFlags } from './db/schema';
import { eq, sql } from 'drizzle-orm';

export type ActivationMode = 'allowed_only' | 'premium' | 'everyone';

export interface FeatureFlag {
  id: number;
  flagKey: string;
  title: string;
  description: string | null;
  activationMode: ActivationMode;
  allowedEmails: string;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: typeof featureFlags.$inferSelect): FeatureFlag {
  return {
    id: row.id,
    flagKey: row.flagKey,
    title: row.title,
    description: row.description,
    activationMode: (row.activationMode as ActivationMode) ?? 'allowed_only',
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
 *
 * activation_mode = 'everyone'      → all users (guests + authenticated)
 * activation_mode = 'premium'       → premium subscribers + allowed emails
 * activation_mode = 'allowed_only'  → only allowed emails
 *
 * Allowed emails always have access regardless of mode.
 * flag not found → false (safe default)
 */
export async function hasFeatureAccess(
  flagKey: string,
  userEmail?: string | null,
  parentId?: string | null
): Promise<boolean> {
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.flagKey, flagKey))
      .limit(1);

    if (!row) return false;

    const mode = (row.activationMode as ActivationMode) ?? 'allowed_only';

    // Email in allowlist always grants access
    if (userEmail && emailInList(userEmail, row.allowedEmails)) return true;

    if (mode === 'everyone') return true;

    if (mode === 'premium') {
      if (parentId) {
        const { checkPremiumStatus } = await import('./premium');
        const status = await checkPremiumStatus(parentId);
        return status.isPremium;
      }
      return false;
    }

    // mode === 'allowed_only' and not in allowlist → no access
    return false;
  } catch (e) {
    console.error(`[feature-flags] hasFeatureAccess error for "${flagKey}":`, e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Get all feature flags with their access state for a specific user.
 */
export async function getUserFeatures(
  userEmail?: string | null,
  parentId?: string | null
): Promise<Record<string, boolean>> {
  try {
    const db = getDb();
    const rows = await db.select().from(featureFlags);
    const result: Record<string, boolean> = {};

    // Check premium once for all flags
    let isPremium = false;
    if (parentId) {
      const { checkPremiumStatus } = await import('./premium');
      const status = await checkPremiumStatus(parentId);
      isPremium = status.isPremium;
    }

    for (const row of rows) {
      // Email in allowlist always grants access
      if (userEmail && emailInList(userEmail, row.allowedEmails)) {
        result[row.flagKey] = true;
        continue;
      }

      const mode = (row.activationMode as ActivationMode) ?? 'allowed_only';

      if (mode === 'everyone') {
        result[row.flagKey] = true;
      } else if (mode === 'premium') {
        result[row.flagKey] = isPremium;
      } else {
        result[row.flagKey] = false;
      }
    }

    return result;
  } catch (e) {
    console.error('[feature-flags] getUserFeatures error:', e instanceof Error ? e.message : e);
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
  updates: { activation_mode?: ActivationMode; allowed_emails?: string }
): Promise<void> {
  const db = getDb();
  const set: Record<string, unknown> = { updatedAt: sql`datetime('now')` };

  if (updates.activation_mode !== undefined) {
    set.activationMode = updates.activation_mode;
  }
  if (updates.allowed_emails !== undefined) {
    set.allowedEmails = updates.allowed_emails;
  }

  await db
    .update(featureFlags)
    .set(set)
    .where(eq(featureFlags.flagKey, flagKey));
}
