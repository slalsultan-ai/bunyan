import { describe, it, expect } from 'vitest';
import { generateChildPdf, ReportData } from '@/lib/pdf/child-report';

function makeReportData(overrides: Partial<ReportData> = {}): ReportData {
  return {
    child: { name: 'Ahmed', age: 8, ageGroup: '6-9', createdAt: '2026-01-01' },
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
      { week: 'Week 1', sessions: 5, accuracy: 70, points: 150 },
      { week: 'Week 2', sessions: 3, accuracy: 75, points: 120 },
      { week: 'Week 3', sessions: 4, accuracy: 72, points: 140 },
      { week: 'Week 4', sessions: 3, accuracy: 80, points: 130 },
    ],
    strengths: ['Pattern Recognition (90%)', 'Number Patterns (85%)'],
    weaknesses: ['Word Problems (45%)', 'Context Errors (50%)'],
    recommendations: [
      'Focus on word problems - accuracy at 45%',
      'Excellent performance in pattern recognition!',
      'Try to practice daily to maintain streak',
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
      recommendations: ['Start practicing to see your level!'],
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
      weeklyData: [{ week: 'Week 1', sessions: 1, accuracy: 70, points: 50 }],
    });
    const buffer = await generateChildPdf(data);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.toString('ascii', 0, 5)).toBe('%PDF-');
  });
});
