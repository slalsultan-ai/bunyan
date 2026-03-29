import { Resend } from 'resend';
import type { WeeklyContent } from '@/lib/db/seed-weekly-content';

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bunyan.guru';

const OPTION_LABELS = ['أ', 'ب', 'ج', 'د'];

interface ChildWithContent {
  name: string;
  age: number;
  ageGroup: string;
  content: WeeklyContent | null;
}

function renderQuestion(type: 'quantitative' | 'verbal', q: WeeklyContent['quantitativeQuestion']): string {
  if (!q) return '';
  const icon = type === 'quantitative' ? '🔢' : '📖';
  const label = type === 'quantitative' ? 'سؤال كمي' : 'سؤال لفظي';
  return `
    <div style="margin-bottom:18px;">
      <p style="font-weight:700;color:#1e293b;margin:0 0 8px;font-size:14px;">${icon} ${label}:</p>
      <p style="color:#374151;margin:0 0 10px;font-size:14px;line-height:1.7;">${q.question}</p>
      ${q.options ? `
        <div style="margin:8px 0;">
          ${q.options.map((opt, i) => `
            <span style="display:inline-block;background:${i === q.correctIndex ? '#d1fae5' : '#f1f5f9'};color:${i === q.correctIndex ? '#065f46' : '#475569'};border-radius:8px;padding:4px 10px;margin:3px;font-size:13px;font-weight:${i === q.correctIndex ? '700' : '400'};">${OPTION_LABELS[i] || String(i + 1)}) ${opt}</span>
          `).join('')}
        </div>
      ` : ''}
      <p style="color:#059669;font-size:12px;margin:8px 0 0;background:#f0fdf4;padding:8px;border-radius:8px;">✅ ${q.explanation}</p>
    </div>
  `;
}

function renderChildSection(child: ChildWithContent, index: number): string {
  const { name, content } = child;
  if (!content) return '';

  const avatars = ['👦', '👧', '🧒'];
  const avatar = avatars[index % avatars.length];

  return `
    <div style="margin-bottom:32px;">
      <div style="background:#059669;color:#fff;padding:12px 20px;border-radius:12px 12px 0 0;font-size:16px;font-weight:800;">
        ${avatar} تمارين ${name}
        <span style="font-size:12px;font-weight:400;opacity:0.85;margin-right:8px;">(${child.ageGroup} سنوات)</span>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:20px;">

        ${renderQuestion('quantitative', content.quantitativeQuestion)}
        ${renderQuestion('verbal', content.verbalQuestion)}

        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px;margin-bottom:14px;">
          <p style="font-weight:700;color:#92400e;margin:0 0 6px;font-size:14px;">🧩 لعبة الأسبوع: ${content.weeklyGame.title}</p>
          <p style="color:#78350f;margin:0 0 6px;font-size:13px;">${content.weeklyGame.description}</p>
          <p style="color:#92400e;margin:0;font-size:13px;font-style:italic;">${content.weeklyGame.howToPlay}</p>
        </div>

        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;">
          <p style="font-weight:700;color:#1e40af;margin:0 0 6px;font-size:14px;">💡 ${content.weeklyTip.title}</p>
          <p style="color:#1d4ed8;margin:0;font-size:13px;line-height:1.6;">${content.weeklyTip.content}</p>
        </div>

        ${content.bonusActivity ? `
          <div style="background:#fdf4ff;border:1px solid #e9d5ff;border-radius:10px;padding:14px;margin-top:14px;">
            <p style="font-weight:700;color:#6b21a8;margin:0 0 6px;font-size:14px;">⭐ نشاط إضافي: ${content.bonusActivity.title}</p>
            <p style="color:#7e22ce;margin:0;font-size:13px;">${content.bonusActivity.description}</p>
          </div>
        ` : ''}

      </div>
    </div>
  `;
}

export async function sendWeeklyEmail(
  toEmail: string,
  weekNumber: number,
  childrenWithContent: ChildWithContent[],
  unsubscribeToken: string,
): Promise<string> {
  const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${unsubscribeToken}`;

  const childSections = childrenWithContent
    .filter(c => c.content !== null)
    .map((c, i) => renderChildSection(c, i))
    .join('<hr style="border:none;border-top:2px dashed #e2e8f0;margin:8px 0;" />');

  if (!childSections) throw new Error('No content to send');

  const html = `
    <div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;">

      <div style="background:#059669;padding:28px 24px;text-align:center;border-radius:16px 16px 0 0;">
        <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#fff;margin-bottom:12px;">ب</div>
        <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 4px;">📚 تمارين بُنيان الأسبوعية</h1>
        <p style="color:#a7f3d0;margin:0;font-size:14px;">الأسبوع ${weekNumber} من ٨</p>
      </div>

      <div style="background:#fff;padding:28px 24px;">
        <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.7;">
          السلام عليكم ورحمة الله،<br>
          إليك تمارين هذا الأسبوع المخصصة لأطفالك:
        </p>

        ${childSections}

        <div style="text-align:center;margin:28px 0;">
          <a href="${APP_URL}/practice" style="display:inline-block;background:#059669;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
            🎯 تدرب الآن على بُنيان
          </a>
        </div>
      </div>

      <div style="background:#f1f5f9;padding:20px 24px;text-align:center;border-radius:0 0 16px 16px;">
        <p style="color:#059669;font-weight:700;font-size:14px;margin:0 0 4px;">💪 استمر! كل تمرين يبني لبنة في بُنيان طفلك.</p>
        <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">
          — فريق بُنيان •
          <a href="${APP_URL}" style="color:#059669;text-decoration:none;">bunyan.guru</a>
        </p>
        <p style="margin:12px 0 0;">
          <a href="${unsubscribeUrl}" style="color:#94a3b8;font-size:11px;text-decoration:underline;">إلغاء الاشتراك في البريد الأسبوعي</a>
        </p>
      </div>

    </div>
  `;

  const childNames = childrenWithContent.map(c => c.name).join(' و');
  const subject = childrenWithContent.length === 1
    ? `📚 تمارين ${childNames} الأسبوعية — الأسبوع ${weekNumber}`
    : `📚 تمارين أطفالك الأسبوعية — الأسبوع ${weekNumber}`;

  const { data, error } = await resend.emails.send({
    from: 'بُنيان <noreply@bunyan.guru>',
    to: toEmail,
    subject,
    html,
  });

  if (error) throw new Error(error.message);
  return data?.id || '';
}
