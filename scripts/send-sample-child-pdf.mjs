// One-off: generate a sample child PDF and email it to ADMIN_EMAIL via Resend.
// Run: npx tsx scripts/send-sample-child-pdf.mjs
import { readFileSync } from 'fs';
import { Resend } from 'resend';
import { generateChildPdf } from '../src/lib/pdf/child-report.tsx';

// Load .env.local manually (dotenv reads .env by default)
try {
  const envLocal = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of envLocal.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch {}

const data = {
  child: { name: 'عبدالله', age: 5, ageGroup: '4-5', createdAt: '2026-01-01' },
  stats: {
    totalSessions: 14, totalQuestions: 140, overallAccuracy: 80,
    totalPoints: 2110, currentLevel: 3, currentStreak: 7,
    badges: ['starter', 'persistent', 'math_genius'],
    longestCorrectStreak: 12, avgSessionsPerWeek: 7,
    avgQuestionsPerDay: 10, bestDayOfWeek: 'الثلاثاء',
  },
  skills: {
    quantitative: { accuracy: 75, totalAnswered: 57, trend: 'up',
      strongest: { name: 'الجمع', accuracy: 92 },
      weakest: { name: 'الطرح', accuracy: 33 } },
    verbal: { accuracy: 86, totalAnswered: 42, trend: 'up',
      strongest: { name: 'المتضادات', accuracy: 100 }, weakest: null },
    logical_patterns: { accuracy: 80, totalAnswered: 41, trend: 'stable',
      strongest: { name: 'التصنيف', accuracy: 90 },
      weakest: { name: 'الأنماط', accuracy: 65 } },
  },
  weeklyData: [
    { week: 'الأسبوع 1', sessions: 2, accuracy: 64, points: 200 },
    { week: 'الأسبوع 2', sessions: 4, accuracy: 72, points: 480 },
    { week: 'الأسبوع 3', sessions: 4, accuracy: 80, points: 600 },
    { week: 'الأسبوع 4', sessions: 4, accuracy: 89, points: 830 },
  ],
  strengths: ['المتضادات (100%)', 'المسائل الكلامية (100%)', 'أعضاء الجسم (100%)'],
  weaknesses: ['الطرح (33%)', 'المقارنة (33%)', 'الأنماط (65%)'],
  recommendations: [],
  peerComparison: { averageAccuracy: 68, percentile: 72, isEstimated: false },
  strongPoints: [
    { name: 'المتضادات', accuracy: 100 },
    { name: 'المسائل الكلامية', accuracy: 100 },
    { name: 'أعضاء الجسم', accuracy: 100 },
  ],
  weakPoints: [
    { name: 'الطرح', accuracy: 33, skillArea: 'quantitative' },
    { name: 'المقارنة', accuracy: 33, skillArea: 'quantitative' },
    { name: 'الأنماط', accuracy: 65, skillArea: 'logical_patterns' },
  ],
  generatedAt: new Date().toISOString(),
  nextReportDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
};

console.log('Generating PDF...');
const pdfBuffer = await generateChildPdf(data);
console.log(`PDF size: ${pdfBuffer.length} bytes`);

const adminEmail = process.env.ADMIN_EMAIL;
const apiKey = process.env.RESEND_API_KEY;
if (!adminEmail || !apiKey) throw new Error('Missing ADMIN_EMAIL or RESEND_API_KEY');

const resend = new Resend(apiKey);
const { data: sent, error } = await resend.emails.send({
  from: 'بُنيان <noreply@bunyan.guru>',
  to: adminEmail,
  subject: '📄 نموذج تقرير الطفل PDF — النسخة الجديدة (7 صفحات)',
  html: `
    <div dir="rtl" style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px;">
      <h2 style="color: #076B3E;">نموذج تقرير الطفل PDF</h2>
      <p>مرفق النسخة الجديدة من تقرير الطفل بتصميم احترافي — 7 صفحات.</p>
      <ul style="line-height: 1.8;">
        <li><strong>صفحة 1:</strong> الغلاف (أفاتار، معلومات الطفل)</li>
        <li><strong>صفحة 2:</strong> لوحة المؤشرات + مقارنة مع الأقران</li>
        <li><strong>صفحة 3:</strong> تحليل المهارات + رادار تشارت</li>
        <li><strong>صفحة 4:</strong> التقدم الأسبوعي (line + bar charts)</li>
        <li><strong>صفحة 5:</strong> نقاط القوة والتحسين + تمارين منزلية</li>
        <li><strong>صفحة 6:</strong> خطة التدريب الأسبوعية + التوقعات</li>
        <li><strong>صفحة 7:</strong> رسالة لولي الأمر بنصائح مخصصة</li>
      </ul>
      <p style="color: #6B7280; font-size: 12px;">البيانات في النموذج تجريبية لطفل "عبدالله، 5 سنوات".</p>
    </div>
  `,
  attachments: [
    {
      filename: 'bunyan-child-report-sample.pdf',
      content: pdfBuffer.toString('base64'),
    },
  ],
});

if (error) {
  console.error('Failed to send:', error);
  process.exit(1);
}
console.log('✓ Email sent:', sent?.id);
console.log('✓ To:', adminEmail);
