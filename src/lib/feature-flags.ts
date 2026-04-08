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

// Feature flags that are enforcement/restriction (not premium benefits)
// These follow the old behavior: enabled = everyone
const ENFORCEMENT_FLAGS = new Set(['session_limit']);

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
 *
 * For premium features (enabled = true):
 *   - email in allowed_emails → yes (testing/admin access)
 *   - parentId provided + premium subscriber → yes
 *   - otherwise → no
 *
 * For enforcement flags (session_limit): enabled = everyone
 *
 * When disabled:
 *   - email in allowed_emails → yes
 *   - otherwise → no
 *
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

    // Email in allowlist always grants access (for testing)
    if (userEmail && emailInList(userEmail, row.allowedEmails)) return true;

    if (toBoolean(row.enabled)) {
      // Enforcement flags: enabled means everyone
      if (ENFORCEMENT_FLAGS.has(flagKey)) return true;

      // Premium features: must be a premium subscriber
      if (parentId) {
        const { checkPremiumStatus } = await import('./premium');
        const status = await checkPremiumStatus(parentId);
        return status.isPremium;
      }
      // No parentId = guest/free → no access to premium features
      return false;
    }

    // Flag disabled and not in allowlist → no access
    return false;
  } catch (e) {
    console.error(`[feature-flags] hasFeatureAccess error for "${flagKey}":`, e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Get all feature flags with their access state for a specific user.
 * Premium features require active subscription when enabled globally.
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

      if (toBoolean(row.enabled)) {
        if (ENFORCEMENT_FLAGS.has(row.flagKey)) {
          result[row.flagKey] = true;
        } else {
          result[row.flagKey] = isPremium;
        }
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
