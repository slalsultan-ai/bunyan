import { Resend } from 'resend';
import type { WeeklyContent } from '@/lib/db/seed-weekly-content';
import { generateWeeklyPdf } from './pdf';

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bunyan.guru';

export interface ChildWithContent {
  name: string;
  age: number;
  ageGroup: string;
  content: WeeklyContent | null;
}

// ─── Email HTML ───────────────────────────────────────────────────────────────

function buildHtml(
  weekNumber: number,
  children: ChildWithContent[],
  unsubscribeToken: string,
): string {
  const unsubUrl = `${APP_URL}/api/unsubscribe?token=${unsubscribeToken}`;
  const validChildren = children.filter(c => c.content !== null);

  const childRows = validChildren.map(c => `
    <tr>
      <td style="padding:6px 0;font-size:14px;color:#374151;text-align:right;">
        ${c.name}
      </td>
      <td style="padding:6px 0;font-size:13px;color:#6b7280;text-align:right;padding-right:12px;">
        ${c.ageGroup} سنوات
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>تمارين بُنيان — الأسبوع ${weekNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Tahoma,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="background:#059669;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
      <div style="display:inline-block;width:52px;height:52px;background:rgba(255,255,255,0.18);border-radius:12px;line-height:52px;font-size:26px;font-weight:900;color:#fff;margin-bottom:14px;">ب</div>
      <h1 style="margin:0 0 6px;color:#fff;font-size:22px;font-weight:800;">📚 تمارين بُنيان الأسبوعية</h1>
      <p style="margin:0;color:#a7f3d0;font-size:13px;">الأسبوع ${weekNumber} من 8</p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="background:#fff;padding:32px;">

      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.8;">
        السلام عليكم ورحمة الله وبركاته،<br>
        إليكم تمارين هذا الأسبوع من بُنيان لأطفالكم. <strong>الأسئلة والأنشطة مرفقة بملف PDF</strong> يمكنكم طباعته أو حفظه.
      </p>

      <!-- Children list -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#059669;">📋 محتوى هذا الأسبوع:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${childRows}
        </table>
      </div>

      <!-- What's inside -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#92400e;">📎 الملف المرفق يحتوي على:</p>
        <ul style="margin:0;padding-right:20px;color:#78350f;font-size:13px;line-height:2;">
          <li>سؤال كمي (رياضيات ومنطق)</li>
          <li>سؤال لفظي (لغة وإدراك)</li>
          <li>لعبة عائلية للأسبوع</li>
          <li>نصيحة تربوية مختارة</li>
        </ul>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:28px 0 20px;">
        <a href="${APP_URL}/practice"
           style="display:inline-block;background:#059669;color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
          🎯 تدرب الآن على بُنيان
        </a>
      </div>

      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
        التدريب اليومي لعشر دقائق يُحدث فارقاً كبيراً في نتائج أطفالكم 💪
      </p>

    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
      <p style="margin:0 0 6px;color:#059669;font-weight:700;font-size:13px;">
        فريق بُنيان •
        <a href="${APP_URL}" style="color:#059669;text-decoration:none;">bunyan.guru</a>
      </p>
      <p style="margin:10px 0 0;">
        <a href="${unsubUrl}" style="color:#9ca3af;font-size:11px;text-decoration:underline;">
          إلغاء الاشتراك في البريد الأسبوعي
        </a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function sendWeeklyEmail(
  toEmail: string,
  weekNumber: number,
  childrenWithContent: ChildWithContent[],
  unsubscribeToken: string,
): Promise<string> {
  const validChildren = childrenWithContent.filter(c => c.content !== null);
  if (validChildren.length === 0) throw new Error('No content to send');

  // Generate PDF attachment
  const pdfBuffer = await generateWeeklyPdf(
    weekNumber,
    validChildren as Array<{ name: string; age: number; ageGroup: string; content: WeeklyContent }>,
  );

  const html = buildHtml(weekNumber, childrenWithContent, unsubscribeToken);

  const childNames = validChildren.map(c => c.name).join(' و');
  const subject = validChildren.length === 1
    ? `📚 تمارين ${childNames} الأسبوعية — الأسبوع ${weekNumber}`
    : `📚 تمارين أطفالك الأسبوعية — الأسبوع ${weekNumber}`;

  const { data, error } = await resend.emails.send({
    from: 'بُنيان <noreply@bunyan.guru>',
    to: toEmail,
    subject,
    html,
    attachments: [
      {
        filename: `bunyan-week-${weekNumber}.pdf`,
        content: pdfBuffer.toString('base64'),
      },
    ],
  });

  if (error) throw new Error(error.message);
  return data?.id || '';
}
