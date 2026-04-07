import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockRun = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect, run: mockRun, insert: mockInsert }),
}));

vi.mock('@/lib/db/schema', () => ({
  questions: {
    id: 'id',
    skillArea: 'skill_area',
    subSkill: 'sub_skill',
    difficulty: 'difficulty',
    questionType: 'question_type',
    questionTextAr: 'question_text_ar',
    questionImageUrl: 'question_image_url',
    options: 'options',
    correctOptionIndex: 'correct_option_index',
    explanationAr: 'explanation_ar',
  },
}));

vi.mock('@/lib/feature-flags', () => ({
  hasFeatureAccess: vi.fn(async () => true),
}));

const { calculateGrade, generateRecommendations } = await import('@/lib/mock-tests');

// ─── calculateGrade ──────────────────────────────────────────────────────────

describe('calculateGrade', () => {
  it('returns ممتاز for >= 90%', () => {
    expect(calculateGrade(90)).toBe('ممتاز');
    expect(calculateGrade(100)).toBe('ممتاز');
    expect(calculateGrade(95)).toBe('ممتاز');
  });

  it('returns جيد جداً for 80-89%', () => {
    expect(calculateGrade(80)).toBe('جيد جداً');
    expect(calculateGrade(89)).toBe('جيد جداً');
  });

  it('returns جيد for 70-79%', () => {
    expect(calculateGrade(70)).toBe('جيد');
    expect(calculateGrade(79)).toBe('جيد');
  });

  it('returns مقبول for 60-69%', () => {
    expect(calculateGrade(60)).toBe('مقبول');
    expect(calculateGrade(69)).toBe('مقبول');
  });

  it('returns يحتاج تحسين for < 60%', () => {
    expect(calculateGrade(59)).toBe('يحتاج تحسين');
    expect(calculateGrade(0)).toBe('يحتاج تحسين');
    expect(calculateGrade(30)).toBe('يحتاج تحسين');
  });
});

// ─── generateRecommendations ─────────────────────────────────────────────────

describe('generateRecommendations', () => {
  it('returns strongest section praise', () => {
    const recs = generateRecommendations({
      accuracy: 80,
      quantitative_score: 90,
      verbal_score: 70,
      logical_score: 80,
      time_spent_seconds: 1500,
      durationMinutes: 30,
    });

    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]).toContain('ممتاز');
    expect(recs[0]).toContain('الكمي');
  });

  it('flags weak section below 70%', () => {
    const recs = generateRecommendations({
      accuracy: 60,
      quantitative_score: 80,
      verbal_score: 60,
      logical_score: 40,
      time_spent_seconds: 1500,
      durationMinutes: 30,
    });

    const weakRec = recs.find(r => r.includes('تركيز'));
    expect(weakRec).toBeDefined();
    expect(weakRec).toContain('المنطقي');
  });

  it('warns about quick completion', () => {
    const recs = generateRecommendations({
      accuracy: 80,
      quantitative_score: 80,
      verbal_score: 80,
      logical_score: 80,
      time_spent_seconds: 600, // 10 min out of 30
      durationMinutes: 30,
    });

    const timeRec = recs.find(r => r.includes('بسرعة'));
    expect(timeRec).toBeDefined();
  });

  it('suggests harder test for >= 80%', () => {
    const recs = generateRecommendations({
      accuracy: 85,
      quantitative_score: 85,
      verbal_score: 85,
      logical_score: 85,
      time_spent_seconds: 1500,
      durationMinutes: 30,
    });

    const nextRec = recs.find(r => r.includes('أصعب'));
    expect(nextRec).toBeDefined();
  });

  it('suggests review for < 80%', () => {
    const recs = generateRecommendations({
      accuracy: 65,
      quantitative_score: 70,
      verbal_score: 60,
      logical_score: 65,
      time_spent_seconds: 1500,
      durationMinutes: 30,
    });

    const reviewRec = recs.find(r => r.includes('راجع'));
    expect(reviewRec).toBeDefined();
  });
});
