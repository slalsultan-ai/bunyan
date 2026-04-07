import { getDb } from './db';
import { sql } from 'drizzle-orm';

export interface InstitutionCode {
  id: number;
  code: string;
  institutionName: string;
  institutionType: string;
  institutionTypeOther: string | null;
  maxUsers: number;
  currentUsers: number;
  durationDays: number;
  status: string;
  notes: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface CodeValidation {
  valid: boolean;
  error?: 'CODE_NOT_FOUND' | 'CODE_EXPIRED' | 'CODE_PAUSED' | 'CODE_FULL' | 'ALREADY_ACTIVATED';
  code?: InstitutionCode;
}

function mapCodeRow(row: any): InstitutionCode {
  return {
    id: row.id as number,
    code: row.code as string,
    institutionName: row.institution_name as string,
    institutionType: row.institution_type as string,
    institutionTypeOther: row.institution_type_other as string | null,
    maxUsers: row.max_users as number,
    currentUsers: row.current_users as number,
    durationDays: row.duration_days as number,
    status: row.status as string,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string | null,
  };
}

/**
 * يتحقق من صلاحية الكود
 */
export async function validateCode(code: string, parentId?: string): Promise<CodeValidation> {
  const db = getDb();
  const codeUpper = code.toUpperCase().trim();
  const rows = await db
    .select()
    .from(sql`institution_codes`)
    .where(sql`code = ${codeUpper}`)
    .limit(1) as any[];

  if (rows.length === 0) {
    return { valid: false, error: 'CODE_NOT_FOUND' };
  }

  const codeRow = mapCodeRow(rows[0]);

  if (codeRow.status === 'paused') {
    return { valid: false, error: 'CODE_PAUSED', code: codeRow };
  }

  if (codeRow.status === 'expired') {
    return { valid: false, error: 'CODE_EXPIRED', code: codeRow };
  }

  if (codeRow.expiresAt && new Date(codeRow.expiresAt) < new Date()) {
    return { valid: false, error: 'CODE_EXPIRED', code: codeRow };
  }

  if (codeRow.currentUsers >= codeRow.maxUsers) {
    return { valid: false, error: 'CODE_FULL', code: codeRow };
  }

  // تحقق لو فعّله من قبل
  if (parentId) {
    const activations = await db
      .select()
      .from(sql`code_activations`)
      .where(sql`code_id = ${codeRow.id} AND parent_id = ${parentId}`)
      .limit(1) as any[];
    if (activations.length > 0) {
      return { valid: false, error: 'ALREADY_ACTIVATED', code: codeRow };
    }
  }

  return { valid: true, code: codeRow };
}

/**
 * يفعّل الكود لوالد معين
 */
export async function activateCode(
  code: string,
  parentId: string
): Promise<{ success: boolean; error?: string; expiresAt?: string; institutionName?: string }> {
  const validation = await validateCode(code, parentId);
  if (!validation.valid || !validation.code) {
    const errorMessages: Record<string, string> = {
      CODE_NOT_FOUND: 'الكود غير موجود',
      CODE_EXPIRED: 'الكود منتهي الصلاحية',
      CODE_PAUSED: 'الكود متوقف مؤقتاً',
      CODE_FULL: 'الكود ممتلئ (وصل الحد الأقصى)',
      ALREADY_ACTIVATED: 'فعّلت هذا الكود من قبل',
    };
    return { success: false, error: errorMessages[validation.error!] || 'خطأ غير متوقع' };
  }

  const codeRow = validation.code;
  const db = getDb();
  const expiresAt = new Date(Date.now() + codeRow.durationDays * 24 * 60 * 60 * 1000).toISOString();

  // أنشئ code_activation
  await db.run(sql`
    INSERT INTO code_activations (code_id, parent_id, expires_at, status)
    VALUES (${codeRow.id}, ${parentId}, ${expiresAt}, 'active')
  `);

  // حدّث current_users
  await db.run(sql`
    UPDATE institution_codes SET current_users = current_users + 1 WHERE id = ${codeRow.id}
  `);

  // أنشئ premium_subscription
  await db.run(sql`
    INSERT INTO premium_subscriptions (parent_id, plan, amount, status, expires_at, payment_method, code_id)
    VALUES (${parentId}, 'code', 0, 'active', ${expiresAt}, 'code', ${codeRow.id})
  `);

  return { success: true, expiresAt, institutionName: codeRow.institutionName };
}

/**
 * يجلب كل الأكواد (للأدمن)
 */
export async function getAllCodes(): Promise<InstitutionCode[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(sql`institution_codes`)
    .orderBy(sql`created_at DESC`) as any[];
  return rows.map(mapCodeRow);
}

/**
 * يجلب كود واحد بالـ ID
 */
export async function getCodeById(id: number): Promise<InstitutionCode | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(sql`institution_codes`)
    .where(sql`id = ${id}`)
    .limit(1) as any[];
  return rows.length > 0 ? mapCodeRow(rows[0]) : null;
}

/**
 * ينشئ كود جديد
 */
export async function createCode(data: {
  code: string;
  institutionName: string;
  institutionType: string;
  institutionTypeOther?: string;
  maxUsers: number;
  durationDays: number;
  notes?: string;
}): Promise<InstitutionCode> {
  const db = getDb();
  const codeUpper = data.code.toUpperCase().trim();

  await db.run(sql`
    INSERT INTO institution_codes (code, institution_name, institution_type, institution_type_other, max_users, duration_days, notes)
    VALUES (${codeUpper}, ${data.institutionName}, ${data.institutionType}, ${data.institutionTypeOther || null}, ${data.maxUsers}, ${data.durationDays}, ${data.notes || null})
  `);

  const rows = await db
    .select()
    .from(sql`institution_codes`)
    .where(sql`code = ${codeUpper}`)
    .limit(1) as any[];
  return mapCodeRow(rows[0]);
}

/**
 * يحدّث كود
 */
export async function updateCode(
  id: number,
  updates: { status?: string; maxUsers?: number; durationDays?: number; notes?: string }
): Promise<void> {
  const db = getDb();

  if (updates.status !== undefined) {
    await db.run(sql`UPDATE institution_codes SET status = ${updates.status} WHERE id = ${id}`);
  }
  if (updates.maxUsers !== undefined) {
    await db.run(sql`UPDATE institution_codes SET max_users = ${updates.maxUsers} WHERE id = ${id}`);
  }
  if (updates.durationDays !== undefined) {
    await db.run(sql`UPDATE institution_codes SET duration_days = ${updates.durationDays} WHERE id = ${id}`);
  }
  if (updates.notes !== undefined) {
    await db.run(sql`UPDATE institution_codes SET notes = ${updates.notes} WHERE id = ${id}`);
  }
}

/**
 * يحذف كود (فقط لو ما أحد فعّله)
 */
export async function deleteCode(id: number): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  const activations = await db
    .select()
    .from(sql`code_activations`)
    .where(sql`code_id = ${id}`)
    .limit(1) as any[];
  if (activations.length > 0) {
    return { success: false, error: 'لا يمكن حذف كود تم تفعيله من قبل مستخدمين' };
  }
  await db.run(sql`DELETE FROM institution_codes WHERE id = ${id}`);
  return { success: true };
}

/**
 * يجلب كل المستخدمين لكود معين (للأدمن)
 */
export async function getCodeUsers(codeId: number): Promise<{
  parentId: string;
  parentEmail: string;
  childName: string | null;
  childAgeGroup: string | null;
  activatedAt: string;
  expiresAt: string;
  status: string;
}[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(sql`code_activations ca JOIN parents p ON ca.parent_id = p.id LEFT JOIN children c ON c.parent_id = ca.parent_id`)
    .where(sql`ca.code_id = ${codeId}`)
    .orderBy(sql`ca.activated_at DESC`) as any[];

  return rows.map((r: any) => ({
    parentId: r.parent_id as string,
    parentEmail: r.email as string,
    childName: r.name as string | null,
    childAgeGroup: r.age_group as string | null,
    activatedAt: r.activated_at as string,
    expiresAt: r.expires_at as string,
    status: r.status as string,
  }));
}
