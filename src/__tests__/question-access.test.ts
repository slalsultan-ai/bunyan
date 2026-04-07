import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockRun = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect, run: mockRun }),
}));

vi.mock('@/lib/db/schema', () => ({
  questions: {
    id: 'id',
    skillArea: 'skill_area',
    subSkill: 'sub_skill',
    ageGroup: 'age_group',
    difficulty: 'difficulty',
    questionType: 'question_type',
    questionTextAr: 'question_text_ar',
    questionImageUrl: 'question_image_url',
    options: 'options',
    correctOptionIndex: 'correct_option_index',
    explanationAr: 'explanation_ar',
    tags: 'tags',
    isActive: 'is_active',
    createdAt: 'created_at',
  },
}));

let mockFlagEnabled = false;

vi.mock('@/lib/feature-flags', () => ({
  hasFeatureAccess: vi.fn(async () => mockFlagEnabled),
}));

const { getAccessibleQuestions, canAccessQuestion, getQuestionBankStats, getTierCondition } = await import('@/lib/question-access');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockResolvedValue(result),
  };
}

// ─── getTierCondition ────────────────────────────────────────────────────────

describe('getTierCondition', () => {
  beforeEach(() => { vi.clearAllMocks(); mockFlagEnabled = false; });

  it('returns empty string when flag is off', async () => {
    mockFlagEnabled = false;
    const result = await getTierCondition();
    expect(result).toBe('');
  });

  it('returns tier filter when flag is on', async () => {
    mockFlagEnabled = true;
    const result = await getTierCondition();
    expect(result).toContain("tier = 'free'");
  });
});

// ─── canAccessQuestion ───────────────────────────────────────────────────────

describe('canAccessQuestion', () => {
  beforeEach(() => { vi.clearAllMocks(); mockFlagEnabled = false; });

  it('returns true when flag is off (no tier distinction)', async () => {
    mockFlagEnabled = false;
    const result = await canAccessQuestion('child-1', 'q-1');
    expect(result).toBe(true);
  });

  it('returns true for free question when flag is on', async () => {
    mockFlagEnabled = true;
    mockSelect.mockReturnValue(makeChain([{ tier: 'free' }]));
    const result = await canAccessQuestion('child-1', 'q-1');
    expect(result).toBe(true);
  });

  it('returns false for premium question when flag is on (free user)', async () => {
    mockFlagEnabled = true;
    mockSelect.mockReturnValue(makeChain([{ tier: 'premium' }]));
    const result = await canAccessQuestion('child-1', 'q-1');
    expect(result).toBe(false);
  });

  it('returns false when question does not exist', async () => {
    mockFlagEnabled = true;
    mockSelect.mockReturnValue(makeChain([]));
    const result = await canAccessQuestion('child-1', 'nonexistent');
    expect(result).toBe(false);
  });
});

// ─── getQuestionBankStats ────────────────────────────────────────────────────

describe('getQuestionBankStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns correct totals', async () => {
    mockSelect.mockReturnValue(makeChain([
      { tier: 'free', skillArea: 'quantitative', count: 50 },
      { tier: 'free', skillArea: 'verbal', count: 40 },
      { tier: 'premium', skillArea: 'quantitative', count: 100 },
      { tier: 'premium', skillArea: 'verbal', count: 80 },
    ]));

    const stats = await getQuestionBankStats('10-12');
    expect(stats.totalFree).toBe(90);
    expect(stats.totalPremium).toBe(180);
    expect(stats.totalAll).toBe(270);
    expect(stats.bySkillArea).toHaveLength(2);
  });

  it('returns zeros for empty bank', async () => {
    mockSelect.mockReturnValue(makeChain([]));
    const stats = await getQuestionBankStats('4-5');
    expect(stats.totalFree).toBe(0);
    expect(stats.totalPremium).toBe(0);
  });
});
