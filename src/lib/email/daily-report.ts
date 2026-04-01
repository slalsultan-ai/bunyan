import { Resend } from 'resend';
import { getDb } from '@/lib/db';
import { sessions, parents, children, otpCodes } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

// ═══ Types ═══

export interface DailyStats {
  date: string; // YYYY-MM-DD in Riyadh
  dateAr: string; // Arabic formatted date

  // KPIs
  newSessions: number;
  completedSessions: number;
  completionRate: number;
  newUsers: number;
  totalRegistered: number;

  // Yesterday for comparison
  yesterdayNewSessions: number;
  yesterdayCompleted: number;
  yesterdayCompletionRate: number;
  yesterdayNewUsers: number;

  // Session breakdown
  guestSessions: number;
  registeredSessions: number;
  ageGroupDist: { ageGroup: string; count: number; avgScore: number }[];
  skillDist: { skill: string; count: number }[];
  avgSessionTimeMs: number;

  // New users detail
  newUsersList: { email: string; city: string | null; childrenCount: number }[];

  // Top performers
  topScore: { childName: string; score: number; total: number; ageGroup: string } | null;
  fastestSession: { childName: string; timeMs: number; score: number; total: number } | null;

  // Alerts
  fakeSessions: number;
  lowCompletionRate: boolean;
  otpErrors: number;

  // Weekly chart (last 7 days)
  weeklyChart: { dayAr: string; date: string; sessions: number }[];
}

// ═══ Helpers ═══

const RIYADH_TZ = 'Asia/Riyadh';

/** Get start of "today" in Riyadh as ISO string (UTC) */
export function getRiyadhDayBounds(refDate: Date = new Date()) {
  // Format the date in Riyadh timezone to get the local date
  const riyadhDate = refDate.toLocaleDateString('en-CA', { timeZone: RIYADH_TZ }); // YYYY-MM-DD
  // Riyadh is UTC+3, so midnight Riyadh = 21:00 UTC previous day
  const startUtc = new Date(`${riyadhDate}T00:00:00+03:00`);
  const endUtc = new Date(`${riyadhDate}T23:59:59.999+03:00`);
  return { riyadhDate, startUtc, endUtc };
}

const AR_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export function formatDateArabic(date: Date): string {
  const d = new Date(date.toLocaleString('en-US', { timeZone: RIYADH_TZ }));
  const dayName = AR_DAYS[d.getDay()];
  const day = d.getDate();
  const month = AR_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName} ${day} ${month} ${year}`;
}

const SKILL_AR: Record<string, string> = {
  quantitative: 'كمي',
  verbal: 'لفظي',
  logical_patterns: 'منطقي',
  mixed: 'مزيج',
};

function pctChange(today: number, yesterday: number): { text: string; color: string } {
  if (yesterday === 0 && today === 0) return { text: '—', color: '#6B7280' };
  if (yesterday === 0) return { text: `↑ جديد`, color: '#059669' };
  const diff = ((today - yesterday) / yesterday) * 100;
  if (diff === 0) return { text: '—', color: '#6B7280' };
  const rounded = Math.round(diff);
  if (diff > 0) return { text: `↑ +${rounded}%`, color: '#059669' };
  return { text: `↓ ${rounded}%`, color: '#DC2626' };
}

function ptChange(today: number, yesterday: number): { text: string; color: string } {
  const diff = today - yesterday;
  if (diff === 0) return { text: '—', color: '#6B7280' };
  if (diff > 0) return { text: `↑ +${diff}%`, color: '#059669' };
  return { text: `↓ ${diff}%`, color: '#DC2626' };
}

function msToMinSec(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')} دقيقة`;
}

// ═══ Data Aggregation ═══

export async function gatherDailyStats(refDate: Date = new Date()): Promise<DailyStats> {
  const db = getDb();

  const { riyadhDate, startUtc, endUtc } = getRiyadhDayBounds(refDate);
  const todayStart = startUtc.toISOString();
  const todayEnd = endUtc.toISOString();

  // Yesterday bounds
  const yesterday = new Date(refDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const { startUtc: yStart, endUtc: yEnd } = getRiyadhDayBounds(yesterday);
  const yStartIso = yStart.toISOString();
  const yEndIso = yEnd.toISOString();

  // Run all queries in parallel
  const [
    [todayCounts],
    [yesterdayCounts],
    [todayNewUsersCount],
    [yesterdayNewUsersCount],
    [totalRegistered],
    todayAgeGroup,
    todaySkill,
    [todaySessionTypes],
    [avgTime],
    newUsersList,
    topScoreRows,
    fastestRows,
    [fakeCount],
    [otpErrorCount],
    weeklyData,
  ] = await Promise.all([
    // Today's session counts
    db.select({
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END)`,
    }).from(sessions).where(sql`started_at >= ${todayStart} AND started_at <= ${todayEnd}`),

    // Yesterday's session counts
    db.select({
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END)`,
    }).from(sessions).where(sql`started_at >= ${yStartIso} AND started_at <= ${yEndIso}`),

    // New users today
    db.select({ v: sql<number>`COUNT(*)` }).from(parents)
      .where(sql`created_at >= ${todayStart} AND created_at <= ${todayEnd}`),

    // New users yesterday
    db.select({ v: sql<number>`COUNT(*)` }).from(parents)
      .where(sql`created_at >= ${yStartIso} AND created_at <= ${yEndIso}`),

    // Total registered
    db.select({ v: sql<number>`COUNT(*)` }).from(parents),

    // Age group distribution (today, completed only)
    db.select({
      ageGroup: sessions.ageGroup,
      count: sql<number>`COUNT(*)`,
      avgScore: sql<number>`ROUND(AVG(CAST(score AS REAL) / NULLIF(total_questions, 0) * 100))`,
    }).from(sessions)
      .where(sql`started_at >= ${todayStart} AND started_at <= ${todayEnd} AND completed_at IS NOT NULL`)
      .groupBy(sessions.ageGroup),

    // Skill distribution (today)
    db.select({
      skill: sessions.skillArea,
      count: sql<number>`COUNT(*)`,
    }).from(sessions)
      .where(sql`started_at >= ${todayStart} AND started_at <= ${todayEnd}`)
      .groupBy(sessions.skillArea),

    // Guest vs registered sessions (today)
    db.select({
      guest: sql<number>`SUM(CASE WHEN parent_id IS NULL THEN 1 ELSE 0 END)`,
      registered: sql<number>`SUM(CASE WHEN parent_id IS NOT NULL THEN 1 ELSE 0 END)`,
    }).from(sessions).where(sql`started_at >= ${todayStart} AND started_at <= ${todayEnd}`),

    // Average session time (today, completed)
    db.select({
      avg: sql<number>`AVG(time_taken_ms)`,
    }).from(sessions)
      .where(sql`started_at >= ${todayStart} AND started_at <= ${todayEnd} AND completed_at IS NOT NULL AND time_taken_ms > 0`),

    // New users list with children count
    db.select({
      email: parents.email,
      city: parents.city,
      childrenCount: sql<number>`(SELECT COUNT(*) FROM children WHERE parent_id = ${parents.id})`,
    }).from(parents)
      .where(sql`${parents.createdAt} >= ${todayStart} AND ${parents.createdAt} <= ${todayEnd}`),

    // Top score today
    db.select({
      childName: sql<string>`COALESCE((SELECT name FROM children WHERE id = ${sessions.childId}), 'زائر')`,
      score: sessions.score,
      total: sessions.totalQuestions,
      ageGroup: sessions.ageGroup,
    }).from(sessions)
      .where(sql`started_at >= ${todayStart} AND started_at <= ${todayEnd} AND completed_at IS NOT NULL AND score IS NOT NULL`)
      .orderBy(sql`CAST(score AS REAL) / NULLIF(total_questions, 0) DESC`)
      .limit(1),

    // Fastest completed session today
    db.select({
      childName: sql<string>`COALESCE((SELECT name FROM children WHERE id = ${sessions.childId}), 'زائر')`,
      timeMs: sessions.timeTakenMs,
      score: sessions.score,
      total: sessions.totalQuestions,
    }).from(sessions)
      .where(sql`started_at >= ${todayStart} AND started_at <= ${todayEnd} AND completed_at IS NOT NULL AND time_taken_ms > 0`)
      .orderBy(sql`time_taken_ms ASC`)
      .limit(1),

    // Fake sessions today (no completion, no answers)
    db.select({
      v: sql<number>`COUNT(*)`,
    }).from(sessions)
      .where(sql`started_at >= ${todayStart} AND started_at <= ${todayEnd} AND completed_at IS NULL AND score IS NULL AND (SELECT COUNT(*) FROM session_answers WHERE session_id = sessions.id) = 0`),

    // OTP errors today
    db.select({
      v: sql<number>`SUM(CASE WHEN attempts >= 3 OR (used = 0 AND expires_at < ${todayEnd}) THEN 1 ELSE 0 END)`,
    }).from(otpCodes)
      .where(sql`created_at >= ${todayStart} AND created_at <= ${todayEnd}`),

    // Last 7 days sessions count
    (() => {
      const days: Date[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(refDate);
        d.setDate(d.getDate() - i);
        days.push(d);
      }
      return Promise.all(days.map(async d => {
        const { riyadhDate: rd, startUtc: s, endUtc: e } = getRiyadhDayBounds(d);
        const [row] = await db.select({
          cnt: sql<number>`COUNT(*)`,
        }).from(sessions).where(sql`started_at >= ${s.toISOString()} AND started_at <= ${e.toISOString()}`);
        const dayOfWeek = new Date(d.toLocaleString('en-US', { timeZone: RIYADH_TZ })).getDay();
        return { dayAr: AR_DAYS[dayOfWeek], date: rd, sessions: row.cnt ?? 0 };
      }));
    })(),
  ]);

  const newSessions = todayCounts.total ?? 0;
  const completedSessions = todayCounts.completed ?? 0;
  const completionRate = newSessions > 0 ? Math.round((completedSessions / newSessions) * 100) : 0;
  const yesterdayTotal = yesterdayCounts.total ?? 0;
  const yesterdayCompleted = yesterdayCounts.completed ?? 0;
  const yesterdayCompletionRate = yesterdayTotal > 0 ? Math.round((yesterdayCompleted / yesterdayTotal) * 100) : 0;

  return {
    date: riyadhDate,
    dateAr: formatDateArabic(refDate),
    newSessions,
    completedSessions,
    completionRate,
    newUsers: todayNewUsersCount.v ?? 0,
    totalRegistered: totalRegistered.v ?? 0,
    yesterdayNewSessions: yesterdayTotal,
    yesterdayCompleted,
    yesterdayCompletionRate,
    yesterdayNewUsers: yesterdayNewUsersCount.v ?? 0,
    guestSessions: todaySessionTypes.guest ?? 0,
    registeredSessions: todaySessionTypes.registered ?? 0,
    ageGroupDist: todayAgeGroup.map(r => ({ ageGroup: r.ageGroup, count: r.count, avgScore: r.avgScore ?? 0 })),
    skillDist: todaySkill.map(r => ({ skill: r.skill, count: r.count })),
    avgSessionTimeMs: avgTime.avg ?? 0,
    newUsersList: newUsersList.map(u => ({ email: u.email, city: u.city, childrenCount: u.childrenCount ?? 0 })),
    topScore: topScoreRows.length > 0 ? {
      childName: topScoreRows[0].childName,
      score: topScoreRows[0].score ?? 0,
      total: topScoreRows[0].total ?? 10,
      ageGroup: topScoreRows[0].ageGroup,
    } : null,
    fastestSession: fastestRows.length > 0 ? {
      childName: fastestRows[0].childName,
      timeMs: fastestRows[0].timeMs ?? 0,
      score: fastestRows[0].score ?? 0,
      total: fastestRows[0].total ?? 10,
    } : null,
    fakeSessions: fakeCount.v ?? 0,
    lowCompletionRate: completionRate < 50 && newSessions > 0,
    otpErrors: otpErrorCount.v ?? 0,
    weeklyChart: weeklyData,
  };
}

// ═══ HTML Email Builder ═══

export function buildDailyReportHtml(stats: DailyStats): string {
  const kpiRows = [
    {
      label: 'الجلسات الجديدة',
      today: stats.newSessions,
      yesterday: stats.yesterdayNewSessions,
      change: pctChange(stats.newSessions, stats.yesterdayNewSessions),
    },
    {
      label: 'الجلسات المكتملة',
      today: stats.completedSessions,
      yesterday: stats.yesterdayCompleted,
      change: pctChange(stats.completedSessions, stats.yesterdayCompleted),
    },
    {
      label: 'معدل الإكمال',
      today: `${stats.completionRate}%`,
      yesterday: `${stats.yesterdayCompletionRate}%`,
      change: ptChange(stats.completionRate, stats.yesterdayCompletionRate),
    },
    {
      label: 'المستخدمون الجدد',
      today: stats.newUsers,
      yesterday: stats.yesterdayNewUsers,
      change: pctChange(stats.newUsers, stats.yesterdayNewUsers),
    },
    {
      label: 'إجمالي المسجلين',
      today: stats.totalRegistered,
      yesterday: '—',
      change: { text: '—', color: '#6B7280' },
    },
  ];

  const hasData = stats.newSessions > 0 || stats.newUsers > 0;

  // Weekly chart - find max for scaling
  const maxWeekly = Math.max(...stats.weeklyChart.map(d => d.sessions), 1);

  // Alerts
  const alerts: string[] = [];
  if (stats.fakeSessions > 10) alerts.push(`⚠️ ${stats.fakeSessions} جلسة وهمية اليوم`);
  if (stats.lowCompletionRate) alerts.push(`⚠️ معدل الإكمال منخفض: ${stats.completionRate}%`);
  if (stats.otpErrors > 10) alerts.push(`⚠️ ${stats.otpErrors} خطأ OTP اليوم`);

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Arial,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1B6B4A 0%,#15803d 100%);border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:20px;">
    <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#fff;margin-bottom:12px;">ب</div>
    <h1 style="color:#fff;font-size:22px;margin:0 0 6px;">📊 تقرير بُنيان اليومي</h1>
    <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;">${stats.dateAr}</p>
  </div>

  ${!hasData ? `
  <!-- No Data -->
  <div style="background:#fff;border-radius:12px;padding:40px 24px;text-align:center;border:1px solid #E5E7EB;margin-bottom:20px;">
    <p style="font-size:18px;color:#6B7280;margin:0;">لا توجد بيانات اليوم</p>
  </div>
  ` : `
  <!-- KPIs Table -->
  <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid #E5E7EB;margin-bottom:20px;">
    <h2 style="font-size:16px;color:#1B6B4A;margin:0 0 16px;border-bottom:2px solid #F59E0B;padding-bottom:8px;">📈 أرقام رئيسية</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr style="background:#F9FAFB;">
        <th style="padding:10px 8px;text-align:right;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB;">المقياس</th>
        <th style="padding:10px 8px;text-align:center;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB;">اليوم</th>
        <th style="padding:10px 8px;text-align:center;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB;">أمس</th>
        <th style="padding:10px 8px;text-align:center;color:#6B7280;font-weight:600;border-bottom:1px solid #E5E7EB;">التغيّر</th>
      </tr>
      ${kpiRows.map(r => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #F3F4F6;font-weight:600;color:#111827;">${r.label}</td>
        <td style="padding:10px 8px;text-align:center;border-bottom:1px solid #F3F4F6;font-weight:700;color:#1B6B4A;font-size:16px;">${r.today}</td>
        <td style="padding:10px 8px;text-align:center;border-bottom:1px solid #F3F4F6;color:#6B7280;">${r.yesterday}</td>
        <td style="padding:10px 8px;text-align:center;border-bottom:1px solid #F3F4F6;font-weight:600;color:${r.change.color};">${r.change.text}</td>
      </tr>`).join('')}
    </table>
  </div>

  <!-- Session Breakdown -->
  <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid #E5E7EB;margin-bottom:20px;">
    <h2 style="font-size:16px;color:#1B6B4A;margin:0 0 16px;border-bottom:2px solid #F59E0B;padding-bottom:8px;">📋 تفصيل الجلسات</h2>

    <div style="display:flex;gap:12px;margin-bottom:16px;">
      <div style="flex:1;background:#F0FDF4;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:11px;color:#6B7280;margin-bottom:4px;">زوار</div>
        <div style="font-size:22px;font-weight:800;color:#1B6B4A;">${stats.guestSessions}</div>
      </div>
      <div style="flex:1;background:#FFFBEB;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:11px;color:#6B7280;margin-bottom:4px;">مسجلين</div>
        <div style="font-size:22px;font-weight:800;color:#92400E;">${stats.registeredSessions}</div>
      </div>
      <div style="flex:1;background:#EFF6FF;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:11px;color:#6B7280;margin-bottom:4px;">متوسط الوقت</div>
        <div style="font-size:14px;font-weight:700;color:#1E40AF;">${msToMinSec(stats.avgSessionTimeMs)}</div>
      </div>
    </div>

    ${stats.ageGroupDist.length > 0 ? `
    <h3 style="font-size:13px;color:#374151;margin:16px 0 8px;">الفئات العمرية</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      ${stats.ageGroupDist.map(a => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #F3F4F6;font-weight:600;">${a.ageGroup} سنوات</td>
        <td style="padding:6px 8px;text-align:center;border-bottom:1px solid #F3F4F6;">${a.count} جلسة</td>
        <td style="padding:6px 8px;text-align:center;border-bottom:1px solid #F3F4F6;color:#1B6B4A;font-weight:600;">${a.avgScore}% متوسط</td>
      </tr>`).join('')}
    </table>` : ''}

    ${stats.skillDist.length > 0 ? `
    <h3 style="font-size:13px;color:#374151;margin:16px 0 8px;">المهارات</h3>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      ${stats.skillDist.map(s => `
      <span style="background:#F3F4F6;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600;color:#374151;">
        ${SKILL_AR[s.skill] || s.skill} <span style="color:#1B6B4A;font-weight:800;">${s.count}</span>
      </span>`).join('')}
    </div>` : ''}
  </div>

  ${stats.newUsersList.length > 0 ? `
  <!-- New Users -->
  <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid #E5E7EB;margin-bottom:20px;">
    <h2 style="font-size:16px;color:#1B6B4A;margin:0 0 16px;border-bottom:2px solid #F59E0B;padding-bottom:8px;">👥 المستخدمون الجدد (${stats.newUsers})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr style="background:#F9FAFB;">
        <th style="padding:8px;text-align:right;color:#6B7280;font-weight:600;">البريد</th>
        <th style="padding:8px;text-align:center;color:#6B7280;font-weight:600;">المدينة</th>
        <th style="padding:8px;text-align:center;color:#6B7280;font-weight:600;">الأطفال</th>
      </tr>
      ${stats.newUsersList.map(u => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #F3F4F6;direction:ltr;text-align:right;">${u.email}</td>
        <td style="padding:8px;text-align:center;border-bottom:1px solid #F3F4F6;">${u.city || '—'}</td>
        <td style="padding:8px;text-align:center;border-bottom:1px solid #F3F4F6;font-weight:700;color:#1B6B4A;">${u.childrenCount}</td>
      </tr>`).join('')}
    </table>
  </div>` : ''}

  ${stats.topScore || stats.fastestSession ? `
  <!-- Top Performers -->
  <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid #E5E7EB;margin-bottom:20px;">
    <h2 style="font-size:16px;color:#1B6B4A;margin:0 0 16px;border-bottom:2px solid #F59E0B;padding-bottom:8px;">🏆 أعلى أداء اليوم</h2>
    <div style="display:flex;gap:12px;">
      ${stats.topScore ? `
      <div style="flex:1;background:linear-gradient(135deg,#FFFBEB,#FEF3C7);border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:24px;margin-bottom:4px;">🥇</div>
        <div style="font-size:14px;font-weight:800;color:#92400E;margin-bottom:4px;">${stats.topScore.childName}</div>
        <div style="font-size:20px;font-weight:900;color:#1B6B4A;">${stats.topScore.score}/${stats.topScore.total}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:4px;">${stats.topScore.ageGroup} سنوات</div>
      </div>` : ''}
      ${stats.fastestSession ? `
      <div style="flex:1;background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:24px;margin-bottom:4px;">⚡</div>
        <div style="font-size:14px;font-weight:800;color:#1E40AF;margin-bottom:4px;">${stats.fastestSession.childName}</div>
        <div style="font-size:16px;font-weight:900;color:#1B6B4A;">${msToMinSec(stats.fastestSession.timeMs)}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:4px;">${stats.fastestSession.score}/${stats.fastestSession.total}</div>
      </div>` : ''}
    </div>
  </div>` : ''}

  ${alerts.length > 0 ? `
  <!-- Alerts -->
  <div style="background:#FEF2F2;border-radius:12px;padding:20px;border:1px solid #FECACA;margin-bottom:20px;">
    <h2 style="font-size:16px;color:#DC2626;margin:0 0 12px;">🚨 تنبيهات</h2>
    ${alerts.map(a => `<p style="margin:0 0 6px;font-size:14px;color:#991B1B;">${a}</p>`).join('')}
  </div>` : ''}
  `}

  <!-- Weekly Chart -->
  <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid #E5E7EB;margin-bottom:20px;">
    <h2 style="font-size:16px;color:#1B6B4A;margin:0 0 16px;border-bottom:2px solid #F59E0B;padding-bottom:8px;">📊 آخر ٧ أيام</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      ${stats.weeklyChart.map(d => {
        const barWidth = maxWeekly > 0 ? Math.round((d.sessions / maxWeekly) * 100) : 0;
        const isToday = d.date === stats.date;
        return `
      <tr>
        <td style="padding:6px 8px;width:60px;font-weight:${isToday ? '800' : '400'};color:${isToday ? '#1B6B4A' : '#374151'};">${d.dayAr}</td>
        <td style="padding:6px 8px;">
          <div style="background:#E5E7EB;border-radius:6px;height:22px;width:100%;overflow:hidden;">
            <div style="background:${isToday ? '#F59E0B' : '#1B6B4A'};height:100%;width:${barWidth}%;border-radius:6px;min-width:${d.sessions > 0 ? '8px' : '0'};"></div>
          </div>
        </td>
        <td style="padding:6px 8px;width:36px;text-align:center;font-weight:700;color:${isToday ? '#1B6B4A' : '#374151'};">${d.sessions}</td>
      </tr>`;
      }).join('')}
    </table>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:20px;color:#9CA3AF;font-size:12px;">
    <p style="margin:0;">تقرير تلقائي من منصة بُنيان — لا تحتاج الرد على هذا الإيميل</p>
    <p style="margin:8px 0 0;direction:ltr;">bunyan.guru</p>
  </div>

</div>
</body>
</html>`;
}

// ═══ Send Email ═══

export async function sendDailyReport(stats: DailyStats): Promise<string> {
  const html = buildDailyReportHtml(stats);

  const { data, error } = await getResend().emails.send({
    from: 'بُنيان <noreply@bunyan.guru>',
    to: 'sl.alsultan@gmail.com',
    subject: `📊 تقرير بُنيان — ${stats.dateAr}`,
    html,
  });

  if (error) throw new Error(error.message);
  return data?.id || '';
}
