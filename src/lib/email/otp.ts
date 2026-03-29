import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendParentOtp(toEmail: string, code: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: 'بُنيان <noreply@bunyan.guru>',
    to: toEmail,
    subject: `${code} — رمز التحقق من بُنيان`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px;">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="width:60px;height:60px;background:#059669;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;color:#fff;">ب</div>
          <h1 style="font-size:22px;color:#111827;margin:14px 0 4px;font-weight:800;">بُنيان</h1>
          <p style="color:#6b7280;font-size:13px;margin:0;">منصة تدريب أبنائك على اختبار القدرات</p>
        </div>
        <div style="background:#fff;border-radius:14px;padding:28px;text-align:center;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <p style="color:#374151;margin:0 0 20px;font-size:15px;line-height:1.6;">أهلاً! إليك رمز التحقق للدخول إلى بُنيان.</p>
          <div style="font-size:40px;font-weight:900;letter-spacing:10px;color:#059669;background:#f0fdf4;padding:20px 28px;border-radius:10px;display:inline-block;border:2px solid #bbf7d0;">${code}</div>
          <p style="color:#6b7280;margin:20px 0 0;font-size:13px;">الرمز صالح لمدة <strong>١٠ دقائق</strong> فقط.</p>
          <p style="color:#9ca3af;margin:8px 0 0;font-size:12px;">إذا لم تطلب هذا الرمز، تجاهل هذا البريد.</p>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:20px;">© بُنيان — bunyan.guru</p>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
}
