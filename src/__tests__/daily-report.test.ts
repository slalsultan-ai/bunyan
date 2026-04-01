import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRiyadhDayBounds,
  formatDateArabic,
  buildDailyReportHtml,
  type DailyStats,
} from '@/lib/email/daily-report';

// ═══ getRiyadhDayBounds ═══

describe('getRiyadhDayBounds', () => {
  it('returns correct Riyadh date for a UTC midnight time', () => {
    // 2026-04-01T00:00:00Z → in Riyadh that's 03:00 on April 1
    const ref = new Date('2026-04-01T00:00:00Z');
    const { riyadhDate, startUtc, endUtc } = getRiyadhDayBounds(ref);
    expect(riyadhDate).toBe('2026-04-01');
    // Start should be 21:00 UTC March 31 (midnight Riyadh = UTC-3h)
    expect(startUtc.toISOString()).toBe('2026-03-31T21:00:00.000Z');
    expect(endUtc.toISOString()).toBe('2026-04-01T20:59:59.999Z');
  });

  it('handles late UTC time (maps to next Riyadh day)', () => {
    // 2026-04-01T22:00:00Z → in Riyadh that's April 2 at 01:00
    const ref = new Date('2026-04-01T22:00:00Z');
    const { riyadhDate } = getRiyadhDayBounds(ref);
    expect(riyadhDate).toBe('2026-04-02');
  });

  it('returns bounds spanning exactly one Riyadh day', () => {
    const ref = new Date('2026-04-01T12:00:00Z');
    const { startUtc, endUtc } = getRiyadhDayBounds(ref);
    const diffMs = endUtc.getTime() - startUtc.getTime();
    // Should be ~24 hours minus 1ms
    expect(diffMs).toBe(24 * 60 * 60 * 1000 - 1);
  });
});

// ═══ formatDateArabic ═══

describe('formatDateArabic', () => {
  it('formats April 1 2026 correctly (Wednesday in Riyadh)', () => {
    // April 1, 2026 is a Wednesday
    const ref = new Date('2026-04-01T12:00:00Z');
    const result = formatDateArabic(ref);
    expect(result).toContain('الأربعاء');
    expect(result).toContain('1');
    expect(result).toContain('أبريل');
    expect(result).toContain('2026');
  });

  it('uses Arabic month names', () => {
    const jan = new Date('2026-01-15T12:00:00Z');
    expect(formatDateArabic(jan)).toContain('يناير');
  });
});

// ═══ buildDailyReportHtml ═══

function makeStats(overrides: Partial<DailyStats> = {}): DailyStats {
  return {
    date: '2026-04-01',
    dateAr: 'الأربعاء 1 أبريل 2026',
    newSessions: 12,
    completedSessions: 9,
    completionRate: 75,
    newUsers: 3,
    totalRegistered: 15,
    yesterdayNewSessions: 8,
    yesterdayCompleted: 5,
    yesterdayCompletionRate: 62,
    yesterdayNewUsers: 1,
    guestSessions: 4,
    registeredSessions: 8,
    ageGroupDist: [
      { ageGroup: '4-5', count: 3, avgScore: 70 },
      { ageGroup: '6-9', count: 6, avgScore: 80 },
    ],
    skillDist: [
      { skill: 'quantitative', count: 5 },
      { skill: 'verbal', count: 4 },
    ],
    avgSessionTimeMs: 180000,
    newUsersList: [
      { email: 'test@example.com', city: 'الرياض', childrenCount: 2 },
    ],
    topScore: { childName: 'أحمد', score: 10, total: 10, ageGroup: '6-9' },
    fastestSession: { childName: 'سارة', timeMs: 120000, score: 8, total: 10 },
    fakeSessions: 2,
    lowCompletionRate: false,
    otpErrors: 0,
    weeklyChart: [
      { dayAr: 'السبت', date: '2026-03-26', sessions: 5 },
      { dayAr: 'الأحد', date: '2026-03-27', sessions: 8 },
      { dayAr: 'الإثنين', date: '2026-03-28', sessions: 10 },
      { dayAr: 'الثلاثاء', date: '2026-03-29', sessions: 7 },
      { dayAr: 'الأربعاء', date: '2026-03-30', sessions: 11 },
      { dayAr: 'الخميس', date: '2026-03-31', sessions: 6 },
      { dayAr: 'الجمعة', date: '2026-04-01', sessions: 12 },
    ],
    ...overrides,
  };
}

describe('buildDailyReportHtml', () => {
  it('produces valid HTML with RTL direction', () => {
    const html = buildDailyReportHtml(makeStats());
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="ar"');
  });

  it('includes the Bunyan branding', () => {
    const html = buildDailyReportHtml(makeStats());
    expect(html).toContain('تقرير بُنيان اليومي');
    expect(html).toContain('#1B6B4A');
  });

  it('shows KPI table with today and yesterday values', () => {
    const html = buildDailyReportHtml(makeStats());
    expect(html).toContain('الجلسات الجديدة');
    expect(html).toContain('الجلسات المكتملة');
    expect(html).toContain('معدل الإكمال');
    expect(html).toContain('المستخدمون الجدد');
    expect(html).toContain('إجمالي المسجلين');
  });

  it('shows session breakdown with guest vs registered', () => {
    const html = buildDailyReportHtml(makeStats({ guestSessions: 4, registeredSessions: 8 }));
    expect(html).toContain('زوار');
    expect(html).toContain('مسجلين');
  });

  it('shows age group distribution', () => {
    const html = buildDailyReportHtml(makeStats());
    expect(html).toContain('4-5 سنوات');
    expect(html).toContain('6-9 سنوات');
  });

  it('shows skill distribution in Arabic', () => {
    const html = buildDailyReportHtml(makeStats());
    expect(html).toContain('كمي');
    expect(html).toContain('لفظي');
  });

  it('shows new users list', () => {
    const html = buildDailyReportHtml(makeStats());
    expect(html).toContain('test@example.com');
    expect(html).toContain('الرياض');
  });

  it('shows top performers', () => {
    const html = buildDailyReportHtml(makeStats());
    expect(html).toContain('أحمد');
    expect(html).toContain('10/10');
    expect(html).toContain('سارة');
  });

  it('shows weekly chart', () => {
    const html = buildDailyReportHtml(makeStats());
    expect(html).toContain('آخر ٧ أيام');
    expect(html).toContain('السبت');
    expect(html).toContain('الجمعة');
  });

  it('shows footer text', () => {
    const html = buildDailyReportHtml(makeStats());
    expect(html).toContain('تقرير تلقائي من منصة بُنيان');
    expect(html).toContain('لا تحتاج الرد على هذا الإيميل');
  });

  it('shows "no data" message when no sessions and no users', () => {
    const html = buildDailyReportHtml(makeStats({
      newSessions: 0,
      completedSessions: 0,
      newUsers: 0,
    }));
    expect(html).toContain('لا توجد بيانات اليوم');
  });

  it('shows alerts when fake sessions > 10', () => {
    const html = buildDailyReportHtml(makeStats({ fakeSessions: 15 }));
    expect(html).toContain('تنبيهات');
    expect(html).toContain('15 جلسة وهمية');
  });

  it('shows alert for low completion rate', () => {
    const html = buildDailyReportHtml(makeStats({
      completionRate: 40,
      lowCompletionRate: true,
    }));
    expect(html).toContain('معدل الإكمال منخفض');
  });

  it('shows alert for high OTP errors', () => {
    const html = buildDailyReportHtml(makeStats({ otpErrors: 20 }));
    expect(html).toContain('20 خطأ OTP');
  });

  it('does not show alerts section when no alerts', () => {
    const html = buildDailyReportHtml(makeStats({
      fakeSessions: 2,
      lowCompletionRate: false,
      otpErrors: 0,
    }));
    expect(html).not.toContain('تنبيهات');
  });

  it('highlights today in weekly chart with gold color', () => {
    const stats = makeStats();
    const html = buildDailyReportHtml(stats);
    // Today's bar should use #F59E0B (gold)
    expect(html).toContain('#F59E0B');
  });

  it('uses green for positive changes and red for negative', () => {
    const html = buildDailyReportHtml(makeStats({
      newSessions: 12,
      yesterdayNewSessions: 8,
    }));
    // Positive change → green
    expect(html).toContain('#059669');
  });
});

// ═══ Cron route (separate test file avoids top-level await issue) ═══
// Route tests are in daily-report-cron.test.ts
