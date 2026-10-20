/**
 * Audit trail for question edits. An answer-key change silently re-scores
 * nothing (old attempts keep their stored result), so every edit is logged
 * with what changed, by which admin.
 */

import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { adminAuditLog, adminSessions } from './db/schema';

const AUDITED_FIELDS = [
  'questionTextAr', 'options', 'correctOptionIndex', 'explanationAr',
  'isActive', 'difficulty', 'ageGroup', 'skillArea', 'subSkill', 'questionType', 'questionImageUrl',
] as const;

type AuditedField = (typeof AUDITED_FIELDS)[number];
export type QuestionChanges = Partial<Record<AuditedField, { from: unknown; to: unknown }>>;

/** Fields whose value differs between two versions of a question. */
export function diffQuestion(
  before: Partial<Record<AuditedField, unknown>>,
  after: Partial<Record<AuditedField, unknown>>,
): QuestionChanges {
  const changes: QuestionChanges = {};
  for (const field of AUDITED_FIELDS) {
    if (!(field in after)) continue;
    const from = before[field] ?? null;
    const to = after[field] ?? null;
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[field] = { from, to };
  }
  return changes;
}

/** Email of the admin behind the current request, or 'admin' when unknown. */
async function currentAdminEmail(): Promise<string> {
  try {
    const raw = (await cookies()).get('admin_token')?.value;
    if (!raw) return 'admin';
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    const [row] = await getDb()
      .select({ email: adminSessions.adminEmail })
      .from(adminSessions)
      .where(eq(adminSessions.tokenHash, tokenHash))
      .limit(1);
    return row?.email || 'admin';
  } catch {
    return 'admin';
  }
}

export async function logQuestionAudit(action: string, details: Record<string, unknown>): Promise<void> {
  try {
    await getDb().insert(adminAuditLog).values({
      adminEmail: await currentAdminEmail(),
      action,
      details: JSON.stringify(details),
    });
  } catch {
    // Audit logging never blocks the edit itself.
  }
}
