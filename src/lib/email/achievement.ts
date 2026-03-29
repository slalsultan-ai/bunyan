import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bunyan.guru';

export async function sendAchievementEmail(
  parentEmail: string,
  childName: string,
  score: number,
  total: number,
  badges: string[]
): Promise<void> {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const badgesHtml =
    badges.length > 0
      ? `<p style="color:#059669;font-size:15px;font-weight:700;margin:16px 0 0;">🏅 شارات جديدة: ${badges.join('، ')}</p>`
      : '';

  const { error } = await resend.emails.send({
    from: 'بُنيان <noreply@bunyan.guru>',
    to: parentEmail,
    subject: `🌟 ${childName} أكمل جلسة تدريبية!`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px;">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="width:60px;height:60px;background:#059669;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;color:#fff;">ب</div>
          <h1 style="font-size:22px;color:#111827;margin:14px 0 4px;font-weight:800;">أحسنت ${childName}!</h1>
        </div>
        <div style="background:#fff;border-radius:14px;padding:28px;text-align:center;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <div style="font-size:48px;font-weight:900;color:#059669;margin-bottom:8px;">${score}/${total}</div>
          <p style="color:#6b7280;font-size:14px;margin:0;">نسبة النجاح: <strong>${pct}٪</strong></p>
          ${badgesHtml}
          <a href="${APP_URL}/dashboard" style="display:inline-block;margin-top:24px;background:#059669;color:#fff;font-weight:700;font-size:15px;padding:12px 32px;border-radius:10px;text-decoration:none;">شاهد التقدم</a>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:20px;">بُنيان — كل بُنيان يبدأ بلبنة</p>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
}
