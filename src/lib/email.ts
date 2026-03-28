import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAdminOtp(toEmail: string, code: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: 'بنيان <onboarding@resend.dev>',
    to: toEmail,
    subject: `رمز الدخول: ${code}`,
    html: `
      <div dir="rtl" style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="width:56px;height:56px;background:#059669;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#fff;">ب</div>
          <h1 style="font-size:18px;color:#111827;margin:12px 0 4px;">لوحة تحكم بُنيان</h1>
        </div>
        <div style="background:#fff;border-radius:12px;padding:24px;text-align:center;border:1px solid #e5e7eb;">
          <p style="color:#6b7280;margin:0 0 16px;font-size:14px;">رمز الدخول الخاص بك (صالح لمدة 10 دقائق):</p>
          <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#059669;background:#f0fdf4;padding:16px 24px;border-radius:8px;display:inline-block;">${code}</div>
          <p style="color:#9ca3af;margin:16px 0 0;font-size:12px;">لا تشارك هذا الرمز مع أحد. إذا لم تطلبه فتجاهل هذا البريد.</p>
        </div>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
}
