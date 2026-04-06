import { WeeklyDigestData } from '../weekly-digest';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bunyan.guru';

function trendArrow(change: number): string {
  if (change > 0) return `↑+${change}`;
  if (change < 0) return `↓${change}`;
  return '→';
}

function trendColor(trend: string): string {
  if (trend === 'improving') return '#059669';
  if (trend === 'declining') return '#DC2626';
  return '#6B7280';
}

function childSection(data: WeeklyDigestData): string {
  if (data.noActivity) {
    return `
      <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#9A3412;">لاحظنا أن ${data.child.name} لم يتدرب هذا الأسبوع</p>
        <p style="margin:0;font-size:13px;color:#C2410C;">لا بأس! كل بداية جديدة مهمة. 10 دقائق يومياً كافية تماماً.</p>
      </div>
    `;
  }

  return `
    <div style="margin-bottom:24px;">
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111827;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">
        ${data.child.name} (${data.child.ageGroup} سنوات)
      </h2>

      <!-- Stats grid -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td width="25%" style="padding:4px;">
            <div style="background:#F0FDF4;border-radius:10px;padding:12px;text-align:center;">
              <div style="font-size:22px;font-weight:800;color:#059669;">${data.thisWeek.sessions}</div>
              <div style="font-size:11px;color:#6B7280;margin-top:2px;">جلسة</div>
            </div>
          </td>
          <td width="25%" style="padding:4px;">
            <div style="background:#F0FDF4;border-radius:10px;padding:12px;text-align:center;">
              <div style="font-size:22px;font-weight:800;color:#059669;">${data.thisWeek.questions}</div>
              <div style="font-size:11px;color:#6B7280;margin-top:2px;">سؤال</div>
            </div>
          </td>
          <td width="25%" style="padding:4px;">
            <div style="background:#F0FDF4;border-radius:10px;padding:12px;text-align:center;">
              <div style="font-size:22px;font-weight:800;color:#059669;">${data.thisWeek.accuracy}%</div>
              <div style="font-size:11px;color:#6B7280;margin-top:2px;">دقة ${trendArrow(data.comparison.accuracyChange)}</div>
            </div>
          </td>
          <td width="25%" style="padding:4px;">
            <div style="background:#F0FDF4;border-radius:10px;padding:12px;text-align:center;">
              <div style="font-size:22px;font-weight:800;color:#059669;">${data.thisWeek.daysActive}</div>
              <div style="font-size:11px;color:#6B7280;margin-top:2px;">أيام نشاط</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Trend -->
      <div style="background:${data.comparison.trend === 'improving' ? '#F0FDF4' : data.comparison.trend === 'declining' ? '#FEF2F2' : '#F9FAFB'};border-radius:10px;padding:12px 16px;margin-bottom:12px;">
        <p style="margin:0;font-size:13px;color:${trendColor(data.comparison.trend)};font-weight:600;">
          ${data.comparison.trend === 'improving' ? '📈' : data.comparison.trend === 'declining' ? '📉' : '📊'} ${data.comparison.trendMessage}
        </p>
      </div>

      <!-- Highlights -->
      <div style="margin-bottom:12px;">
        ${data.highlights.bestSubSkill ? `<p style="margin:0 0 4px;font-size:13px;color:#374151;">⭐ الأقوى: ${data.highlights.bestSubSkill.name} (${data.highlights.bestSubSkill.accuracy}%)</p>` : ''}
        ${data.highlights.worstSubSkill ? `<p style="margin:0 0 4px;font-size:13px;color:#374151;">🎯 يحتاج تركيز: ${data.highlights.worstSubSkill.name} (${data.highlights.worstSubSkill.accuracy}%)</p>` : ''}
        ${data.highlights.streak > 0 ? `<p style="margin:0;font-size:13px;color:#374151;">🔥 سلسلة التحدي اليومي: ${data.highlights.streak} أيام</p>` : ''}
      </div>
    </div>
  `;
}

/**
 * Render the full weekly digest HTML email.
 * Supports multiple children in one email.
 */
export function renderWeeklyDigestEmail(allData: WeeklyDigestData[]): string {
  if (allData.length === 0) return '';
  const parentEmail = allData[0].parent.email;
  const period = allData[0].period;
  const anyActive = allData.some((d) => !d.noActivity);

  // Pick best recommendation from the child with lowest accuracy
  const activeChildren = allData.filter((d) => !d.noActivity);
  const recommendation = activeChildren.length > 0
    ? activeChildren.sort((a, b) => a.thisWeek.accuracy - b.thisWeek.accuracy)[0].recommendation
    : allData[0].recommendation;

  const predictionMessage = activeChildren.length > 0
    ? activeChildren[0].predictionMessage
    : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;max-width:600px;">
  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#059669,#047857);padding:28px 24px;text-align:center;">
      <div style="font-size:24px;font-weight:800;color:#FFFFFF;margin-bottom:4px;">بُنيان</div>
      <div style="font-size:13px;color:#A7F3D0;">ملخصك الأسبوعي</div>
    </td>
  </tr>

  <tr><td style="padding:24px;">
    <p style="margin:0 0 4px;font-size:15px;color:#374151;">أهلاً! 👋</p>
    <p style="margin:0 0 16px;font-size:13px;color:#6B7280;">هذا ملخص الأسبوع ${period.from} — ${period.to}</p>

    <!-- Children sections -->
    ${allData.map(childSection).join('')}

    <!-- Home activity recommendation -->
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#92400E;">🏠 نشاط منزلي مقترح لهذا الأسبوع</p>
      <p style="margin:0 0 8px;font-size:13px;color:#78350F;line-height:1.6;">${recommendation.activity}</p>
      <p style="margin:0;font-size:12px;color:#A16207;">⏱️ ${recommendation.duration} · 💡 ${recommendation.reason}</p>
    </div>

    ${predictionMessage ? `
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#1E40AF;">💪 ${predictionMessage}</p>
    </div>` : ''}

    <!-- CTA -->
    <div style="text-align:center;margin:24px 0 16px;">
      <a href="${APP_URL}/practice" style="display:inline-block;background:#059669;color:#FFFFFF;font-size:15px;font-weight:700;padding:12px 32px;border-radius:12px;text-decoration:none;">🚀 افتح بُنيان</a>
    </div>
  </td></tr>

  <!-- Footer -->
  <tr>
    <td style="background:#F9FAFB;padding:16px 24px;border-top:1px solid #E5E7EB;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;">بُنيان — كل بُنيان يبدأ بلبنة</p>
      <a href="${APP_URL}/api/digest/unsubscribe?parentId=${allData[0].parent.id}" style="font-size:11px;color:#D1D5DB;text-decoration:underline;">إلغاء الاشتراك</a>
    </td>
  </tr>
</table>
</td></tr></table>
</body></html>`;
}
