import { getDb } from './db';
import { sql } from 'drizzle-orm';

export type PremiumSource = 'subscription' | 'code' | 'grant' | 'none';

export interface PremiumStatus {
  isPremium: boolean;
  source: PremiumSource;
  expiresAt: string | null;
  daysRemaining: number | null;
  institutionName?: string;
}

/**
 * يتحقق لو الوالد مشترك (مدفوع أو كود أو منحة)
 */
export async function checkPremiumStatus(parentId: string): Promise<PremiumStatus> {
  const db = getDb();
  const now = new Date().toISOString();

  // 1. تحقق من premium_subscriptions (active + لم ينتهِ)
  const subRows = await db
    .select()
    .from(sql`premium_subscriptions`)
    .where(sql`parent_id = ${parentId} AND status = 'active' AND expires_at > ${now}`)
    .orderBy(sql`expires_at DESC`)
    .limit(1) as any[];

  if (subRows.length > 0) {
    const sub = subRows[0];
    const expiresAt = sub.expires_at as string;
    const daysRemaining = Math.ceil(
      (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    let source: PremiumSource = 'subscription';
    let institutionName: string | undefined;

    if (sub.payment_method === 'code' && sub.code_id) {
      source = 'code';
      const codeRows = await db
        .select()
        .from(sql`institution_codes`)
        .where(sql`id = ${sub.code_id}`)
        .limit(1) as any[];
      if (codeRows.length > 0) institutionName = codeRows[0].institution_name as string;
    } else if (sub.payment_method === 'grant') {
      source = 'grant';
    }

    return { isPremium: true, source, expiresAt, daysRemaining, institutionName };
  }

  // 2. تحقق من code_activations مباشرة
  const codeRows = await db
    .select()
    .from(sql`code_activations ca JOIN institution_codes ic ON ca.code_id = ic.id`)
    .where(sql`ca.parent_id = ${parentId} AND ca.status = 'active' AND ca.expires_at > ${now}`)
    .orderBy(sql`ca.expires_at DESC`)
    .limit(1) as any[];

  if (codeRows.length > 0) {
    const row = codeRows[0];
    const expiresAt = row.expires_at as string;
    const daysRemaining = Math.ceil(
      (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return {
      isPremium: true,
      source: 'code',
      expiresAt,
      daysRemaining,
      institutionName: row.institution_name as string,
    };
  }

  return { isPremium: false, source: 'none', expiresAt: null, daysRemaining: null };
}

/**
 * يتحقق لو طفل معين مشترك (يمر عبر الوالد)
 */
export async function isChildPremium(childId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select()
    .from(sql`children`)
    .where(sql`id = ${childId}`)
    .limit(1) as any[];
  if (rows.length === 0) return false;
  const status = await checkPremiumStatus(rows[0].parent_id as string);
  return status.isPremium;
}

/**
 * يُستخدم في كل الـ feature flags المدفوعة
 */
export async function hasPremiumFeature(
  parentId: string,
  featureName: string
): Promise<boolean> {
  const { hasFeatureAccess } = await import('./feature-flags');
  const db = getDb();

  // 1. تحقق من feature flag
  const rows = await db
    .select()
    .from(sql`parents`)
    .where(sql`id = ${parentId}`)
    .limit(1) as any[];
  const email = rows.length > 0 ? (rows[0].email as string) : undefined;
  const flagEnabled = await hasFeatureAccess(featureName, email);

  if (!flagEnabled) return false;

  // 2. تحقق من premium status
  const status = await checkPremiumStatus(parentId);
  return status.isPremium;
}
