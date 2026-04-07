import { getDb } from './db';
import { sql } from 'drizzle-orm';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface GrantRequest {
  id: number;
  requestNumber: string;
  institutionName: string;
  institutionType: string;
  institutionTypeOther: string | null;
  studentCount: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string | null;
  status: string;
  adminNotes: string | null;
  reviewedAt: string | null;
  generatedCode: string | null;
  createdAt: string;
}

function mapRow(row: any): GrantRequest {
  return {
    id: row.id as number,
    requestNumber: row.request_number as string,
    institutionName: row.institution_name as string,
    institutionType: row.institution_type as string,
    institutionTypeOther: row.institution_type_other as string | null,
    studentCount: row.student_count as number,
    contactName: row.contact_name as string,
    contactPhone: row.contact_phone as string,
    contactEmail: row.contact_email as string,
    notes: row.notes as string | null,
    status: row.status as string,
    adminNotes: row.admin_notes as string | null,
    reviewedAt: row.reviewed_at as string | null,
    generatedCode: row.generated_code as string | null,
    createdAt: row.created_at as string,
  };
}

/**
 * يولّد رقم طلب فريد
 */
async function generateRequestNumber(): Promise<string> {
  const db = getDb();
  const year = new Date().getFullYear();
  const prefix = `GR-${year}-%`;
  const rows = await db.all<Record<string, unknown>>(
    sql`SELECT COUNT(*) as cnt FROM grant_requests WHERE request_number LIKE ${prefix}`
  );
  const count = ((rows[0]?.cnt as number) ?? 0) + 1;
  return `GR-${year}-${String(count).padStart(4, '0')}`;
}

/**
 * يرسل طلب منحة جديد
 */
export async function submitGrantRequest(data: {
  institutionName: string;
  institutionType: string;
  institutionTypeOther?: string;
  studentCount: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes?: string;
}): Promise<{ requestNumber: string }> {
  const db = getDb();
  const requestNumber = await generateRequestNumber();

  await db.run(sql`
    INSERT INTO grant_requests (
      request_number, institution_name, institution_type, institution_type_other,
      student_count, contact_name, contact_phone, contact_email, notes
    ) VALUES (
      ${requestNumber}, ${data.institutionName}, ${data.institutionType},
      ${data.institutionTypeOther || null}, ${data.studentCount},
      ${data.contactName}, ${data.contactPhone}, ${data.contactEmail},
      ${data.notes || null}
    )
  `);

  // أرسل إيميل تنبيه للأدمن
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const typeLabels: Record<string, string> = {
      school: 'مدرسة',
      training_center: 'مركز تدريب',
      charity: 'جمعية خيرية',
      other: 'أخرى',
    };
    try {
      await resend.emails.send({
        from: 'بُنيان <noreply@bunyan.guru>',
        to: adminEmail,
        subject: `طلب منحة جديد — ${requestNumber}`,
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="width:56px;height:56px;background:#059669;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#fff;">ب</div>
              <h1 style="font-size:20px;color:#111827;margin:12px 0 4px;">طلب منحة جديد</h1>
              <p style="color:#6b7280;font-size:14px;margin:0;">${requestNumber}</p>
            </div>
            <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
                <tr><td style="padding:8px 0;font-weight:600;">المؤسسة:</td><td style="padding:8px 0;">${data.institutionName}</td></tr>
                <tr><td style="padding:8px 0;font-weight:600;">النوع:</td><td style="padding:8px 0;">${typeLabels[data.institutionType] || data.institutionType}</td></tr>
                <tr><td style="padding:8px 0;font-weight:600;">عدد الطلاب:</td><td style="padding:8px 0;">${data.studentCount}</td></tr>
                <tr><td style="padding:8px 0;font-weight:600;">المسؤول:</td><td style="padding:8px 0;">${data.contactName}</td></tr>
                <tr><td style="padding:8px 0;font-weight:600;">الجوال:</td><td style="padding:8px 0;">${data.contactPhone}</td></tr>
                <tr><td style="padding:8px 0;font-weight:600;">البريد:</td><td style="padding:8px 0;">${data.contactEmail}</td></tr>
                ${data.notes ? `<tr><td style="padding:8px 0;font-weight:600;">ملاحظات:</td><td style="padding:8px 0;">${data.notes}</td></tr>` : ''}
              </table>
            </div>
            <div style="text-align:center;margin-top:20px;">
              <a href="https://bunyan.guru/admin/grants" style="display:inline-block;background:#059669;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">راجع الطلب في لوحة التحكم</a>
            </div>
          </div>
        `,
      });
    } catch (e) {
      console.error('[grant-requests] Failed to send admin notification:', e);
    }
  }

  return { requestNumber };
}

/**
 * يجلب كل طلبات المنح
 */
export async function getAllGrantRequests(statusFilter?: string): Promise<GrantRequest[]> {
  const db = getDb();
  let rows: Record<string, unknown>[];
  if (statusFilter) {
    rows = await db.all<Record<string, unknown>>(
      sql`SELECT * FROM grant_requests WHERE status = ${statusFilter} ORDER BY created_at DESC`
    );
  } else {
    rows = await db.all<Record<string, unknown>>(
      sql`SELECT * FROM grant_requests ORDER BY created_at DESC`
    );
  }
  return rows.map(mapRow);
}

/**
 * يجلب طلب منحة بالـ ID
 */
export async function getGrantRequestById(id: number): Promise<GrantRequest | null> {
  const db = getDb();
  const rows = await db.all<Record<string, unknown>>(
    sql`SELECT * FROM grant_requests WHERE id = ${id} LIMIT 1`
  );
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

/**
 * يراجع طلب منحة (للأدمن)
 */
export async function reviewGrantRequest(
  requestId: number,
  action: 'approve' | 'reject',
  adminNotes?: string,
  codeData?: { code: string; durationDays: number; maxUsers: number }
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  const request = await getGrantRequestById(requestId);
  if (!request) throw new Error('طلب غير موجود');

  if (action === 'approve' && codeData) {
    const codeUpper = codeData.code.toUpperCase().trim();
    await db.run(sql`
      INSERT INTO institution_codes (code, institution_name, institution_type, institution_type_other, max_users, duration_days, notes)
      VALUES (${codeUpper}, ${request.institutionName}, ${request.institutionType}, ${request.institutionTypeOther || null}, ${codeData.maxUsers}, ${codeData.durationDays}, ${'منحة: ' + request.requestNumber})
    `);

    await db.run(sql`
      UPDATE grant_requests
      SET status = 'approved', admin_notes = ${adminNotes || null}, reviewed_at = ${now}, generated_code = ${codeUpper}
      WHERE id = ${requestId}
    `);

    const expiresDate = new Date(Date.now() + codeData.durationDays * 24 * 60 * 60 * 1000);
    const formattedDate = expiresDate.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

    try {
      await resend.emails.send({
        from: 'بُنيان <noreply@bunyan.guru>',
        to: request.contactEmail,
        subject: 'تمت الموافقة على طلب المنحة — بُنيان',
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="width:56px;height:56px;background:#059669;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#fff;">ب</div>
              <h1 style="font-size:20px;color:#111827;margin:12px 0 4px;">تمت الموافقة على طلب المنحة</h1>
            </div>
            <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
              <p style="color:#374151;font-size:15px;line-height:1.8;">أهلاً <strong>${request.contactName}</strong>،</p>
              <p style="color:#374151;font-size:15px;line-height:1.8;">يسعدنا إبلاغكم بالموافقة على طلب المنحة لـ <strong>${request.institutionName}</strong>.</p>
              <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:10px;padding:20px;text-align:center;margin:20px 0;">
                <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">كود التفعيل</p>
                <div style="font-size:28px;font-weight:900;letter-spacing:4px;color:#059669;">${codeUpper}</div>
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
                <tr><td style="padding:6px 0;font-weight:600;">عدد المستخدمين:</td><td style="padding:6px 0;">${codeData.maxUsers}</td></tr>
                <tr><td style="padding:6px 0;font-weight:600;">صالح حتى:</td><td style="padding:6px 0;">${formattedDate}</td></tr>
              </table>
              <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-top:20px;">
                <p style="font-weight:700;color:#111827;margin:0 0 8px;font-size:14px;">كيفية الاستخدام:</p>
                <ol style="color:#374151;font-size:13px;line-height:2;margin:0;padding-right:20px;">
                  <li>شاركوا الكود مع أولياء الأمور</li>
                  <li>يسجّلون في bunyan.guru</li>
                  <li>يدخلون الكود في صفحة الاشتراكات</li>
                </ol>
              </div>
            </div>
            <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:20px;">بُنيان — كل بُنيان يبدأ بلبنة</p>
          </div>
        `,
      });
    } catch (e) {
      console.error('[grant-requests] Failed to send approval email:', e);
    }
  } else {
    await db.run(sql`
      UPDATE grant_requests
      SET status = 'rejected', admin_notes = ${adminNotes || null}, reviewed_at = ${now}
      WHERE id = ${requestId}
    `);

    try {
      await resend.emails.send({
        from: 'بُنيان <noreply@bunyan.guru>',
        to: request.contactEmail,
        subject: 'بخصوص طلب المنحة — بُنيان',
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="width:56px;height:56px;background:#059669;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#fff;">ب</div>
              <h1 style="font-size:20px;color:#111827;margin:12px 0 4px;">بخصوص طلب المنحة</h1>
            </div>
            <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
              <p style="color:#374151;font-size:15px;line-height:1.8;">أهلاً <strong>${request.contactName}</strong>،</p>
              <p style="color:#374151;font-size:15px;line-height:1.8;">شكراً لاهتمامكم ببُنيان. للأسف لم نتمكن من الموافقة على الطلب حالياً.</p>
              ${adminNotes ? `<p style="color:#374151;font-size:14px;line-height:1.8;background:#f9fafb;padding:12px;border-radius:8px;">${adminNotes}</p>` : ''}
              <p style="color:#374151;font-size:15px;line-height:1.8;">يمكنكم التواصل معنا لمناقشة خيارات أخرى.</p>
            </div>
            <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:20px;">بُنيان — كل بُنيان يبدأ بلبنة</p>
          </div>
        `,
      });
    } catch (e) {
      console.error('[grant-requests] Failed to send rejection email:', e);
    }
  }
}
