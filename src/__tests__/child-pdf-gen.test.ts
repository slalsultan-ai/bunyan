import { describe, it, expect } from 'vitest';
import { generateChildPdf, ReportData } from '@/lib/pdf/child-report';

function makeReportData(overrides: Partial<ReportData> = {}): ReportData {
  return {
    child: { name: 'أحمد', age: 8, ageGroup: '6-9', createdAt: '2026-01-01' },
    stats: {
      totalSessions: 15,
      totalQuestions: 150,
      overallAccuracy: 72,
      totalPoints: 1200,
      currentLevel: 5,
      currentStreak: 3,
      badges: ['starter', 'persistent'],
    },
    skills: {
      quantitative: { accuracy: 78, totalAnswered: 50, trend: 'up' },
      verbal: { accuracy: 65, totalAnswered: 45, trend: 'down' },
      logical_patterns: { accuracy: 85, totalAnswered: 55, trend: 'up' },
    },
    weeklyData: [
      { week: 'الأسبوع ١', sessions: 5, accuracy: 70, points: 150 },
      { week: 'الأسبوع ٢', sessions: 3, accuracy: 75, points: 120 },
      { week: 'الأسبوع ٣', sessions: 4, accuracy: 72, points: 140 },
      { week: 'الأسبوع ٤', sessions: 3, accuracy: 80, points: 130 },
    ],
    strengths: ['التعرف على الأنماط (90٪)', 'أنماط الأرقام (85٪)'],
    weaknesses: ['المسائل اللفظية (45٪)', 'أخطاء السياق (50٪)'],
    recommendations: [
      'ننصح بالتركيز على المسائل اللفظية — تحتاج تحسين',
      'أداء ممتاز في التعرف على الأنماط — استمر!',
      'حاول التدرب يومياً للحفاظ على سلسلة الأيام',
    ],
    ...overrides,
  };
}

describe('generateChildPdf', () => {
  it('generates a valid PDF buffer with 3 pages', async () => {
    const data = makeReportData();
    const buffer = await generateChildPdf(data);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100);
    // PDF starts with %PDF
    expect(buffer.toString('ascii', 0, 5)).toBe('%PDF-');
  });

  it('generates PDF for child with no sessions', async () => {
    const data = makeReportData({
      stats: {
        totalSessions: 0,
        totalQuestions: 0,
        overallAccuracy: 0,
        totalPoints: 0,
        currentLevel: 1,
        currentStreak: 0,
        badges: [],
      },
      skills: {
        quantitative: { accuracy: 0, totalAnswered: 0, trend: 'stable' },
        verbal: { accuracy: 0, totalAnswered: 0, trend: 'stable' },
        logical_patterns: { accuracy: 0, totalAnswered: 0, trend: 'stable' },
      },
      weeklyData: [],
      strengths: [],
      weaknesses: [],
      recommendations: ['ابدأ بالتدريب لمعرفة مستواك!'],
    });
    const buffer = await generateChildPdf(data);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.toString('ascii', 0, 5)).toBe('%PDF-');
  });

  it('generates PDF for child with single session', async () => {
    const data = makeReportData({
      stats: {
        totalSessions: 1,
        totalQuestions: 10,
        overallAccuracy: 70,
        totalPoints: 50,
        currentLevel: 1,
        currentStreak: 1,
        badges: ['starter'],
      },
      weeklyData: [{ week: 'الأسبوع ١', sessions: 1, accuracy: 70, points: 50 }],
    });
    const buffer = await generateChildPdf(data);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.toString('ascii', 0, 5)).toBe('%PDF-');
  });
});
