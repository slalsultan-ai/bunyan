import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bunyan.guru';

function getMotivation(pct: number): { emoji: string; text: string } {
  if (pct === 100) return { emoji: '🏆', text: 'ممتاز! أجاب على جميع الأسئلة بشكل صحيح' };
  if (pct >= 80) return { emoji: '🌟', text: 'أداء رائع! استمروا على هذا المستوى' };
  if (pct >= 60) return { emoji: '💪', text: 'جهد طيب! مع التدريب ستتحسن النتائج' };
  return { emoji: '🌱', text: 'بداية جيدة! التدريب المستمر هو مفتاح التميز' };
}

function buildAchievementHtml(
  childName: string,
  score: number,
  total: number,
  badges: string[],
): string {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const motivation = getMotivation(pct);

  const badgesHtml = badges.length > 0
    ? `
      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#92400E;">🏅 شارات جديدة</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
          ${badges.map(b => `<span style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:20px;padding:6px 14px;font-size:13px;font-weight:700;color:#92400E;">${b}</span>`).join('')}
        </div>
      </div>`
    : '';

  // Progress bar color based on score
  const barColor = pct >= 80 ? '#059669' : pct >= 60 ? '#F59E0B' : '#EF4444';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>🌟 ${childName} أكمل جلسة تدريبية!</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Tahoma,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#1B6B4A 0%,#15803d 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
      <div style="display:inline-block;width:52px;height:52px;background:rgba(255,255,255,0.18);border-radius:12px;line-height:52px;font-size:26px;font-weight:900;color:#fff;margin-bottom:14px;">ب</div>
      <h1 style="margin:0 0 6px;color:#fff;font-size:22px;font-weight:800;">${motivation.emoji} أحسنت ${childName}!</h1>
      <p style="margin:0;color:#a7f3d0;font-size:14px;">أكمل جلسة تدريبية بنجاح</p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="background:#fff;padding:32px;">

      <!-- Score Card -->
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:14px;padding:28px;text-align:center;margin-bottom:24px;">
        <div style="font-size:52px;font-weight:900;color:#1B6B4A;margin-bottom:4px;">${score}<span style="font-size:28px;color:#6B7280;font-weight:600;">/${total}</span></div>

        <!-- Progress Bar -->
        <div style="background:#E5E7EB;border-radius:8px;height:14px;width:80%;margin:16px auto 12px;overflow:hidden;">
          <div style="background:${barColor};height:100%;width:${pct}%;border-radius:8px;min-width:${pct > 0 ? '8px' : '0'};"></div>
        </div>
        <p style="color:#6B7280;font-size:14px;margin:0;">نسبة النجاح: <strong style="color:#1B6B4A;">${pct}٪</strong></p>
      </div>

      <!-- Motivation -->
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:center;">
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.8;font-weight:600;">${motivation.text}</p>
      </div>

      ${badgesHtml}

      <!-- CTA -->
      <div style="text-align:center;margin:28px 0 20px;">
        <a href="${APP_URL}/dashboard"
           style="display:inline-block;background:#059669;color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
          📈 شاهد التقدم الكامل
        </a>
      </div>

      <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;line-height:1.6;">
        التدريب اليومي لعشر دقائق يُحدث فارقاً كبيراً في نتائج أطفالكم 💪
      </p>

    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
      <p style="margin:0 0 6px;color:#059669;font-weight:700;font-size:13px;">
        فريق بُنيان •
        <a href="${APP_URL}" style="color:#059669;text-decoration:none;">bunyan.guru</a>
      </p>
      <p style="margin:8px 0 0;color:#9CA3AF;font-size:11px;">كل بُنيان يبدأ بلبنة</p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`;
}

export async function sendAchievementEmail(
  parentEmail: string,
  childName: string,
  score: number,
  total: number,
  badges: string[]
): Promise<void> {
  const html = buildAchievementHtml(childName, score, total, badges);

  const { error } = await resend.emails.send({
    from: 'بُنيان <noreply@bunyan.guru>',
    to: parentEmail,
    subject: `🌟 ${childName} أكمل جلسة تدريبية!`,
    html,
  });

  if (error) throw new Error(error.message);
}
