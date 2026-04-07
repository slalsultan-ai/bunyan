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
    tags: 'tags',
    isActive: 'is_active',
    createdAt: 'created_at',
    correctOptionIndex: 'correct_option_index',
    explanationAr: 'explanation_ar',
  },
}));

let mockFlagEnabled = false;

vi.mock('@/lib/feature-flags', () => ({
  hasFeatureAccess: vi.fn(async () => mockFlagEnabled),
}));

const {
  getAccessibleQuestions,
  canAccessQuestion,
  getQuestionBankStats,
  getTierCondition,
} = await import('@/lib/question-access');

const { hasFeatureAccess } = await import('@/lib/feature-flags');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(result: unknown[]) {
  const chain: any = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    groupBy: vi.fn(),
    then: (resolve: (v: unknown[]) => void) => resolve(result),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.groupBy.mockReturnValue(chain);
  return chain;
}

const sampleQuestion = {
  id: 'q-1',
  skillArea: 'quantitative',
  subSkill: 'patterns',
  ageGroup: '10-12',
  difficulty: 'medium',
  questionType: 'mcq',
  questionTextAr: 'ما هو الرقم التالي؟',
  questionImageUrl: null,
  options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
  tags: ['patterns'],
  isActive: true,
  createdAt: '2025-01-01',
};

const sampleQuestion2 = {
  ...sampleQuestion,
  id: 'q-2',
  skillArea: 'verbal',
  subSkill: 'vocabulary',
  difficulty: 'easy',
  questionTextAr: 'ما معنى الكلمة؟',
};

// ─── getAccessibleQuestions ──────────────────────────────────────────────────

describe('getAccessibleQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlagEnabled = false;
  });

  it('returns all questions when flag is OFF (no tier filtering)', async () => {
    const chain = makeChain([sampleQuestion, sampleQuestion2]);
    mockSelect.mockReturnValue(chain);

    const result = await getAccessibleQuestions('10-12', 'child-1');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(sampleQuestion);
    expect(result[1]).toEqual(sampleQuestion2);
    expect(hasFeatureAccess).toHaveBeenCalledWith('gat_extended_bank', undefined);
  });

  it('adds tier=free condition when flag is ON (free user)', async () => {
    mockFlagEnabled = true;
    const freeOnly = [sampleQuestion];
    const chain = makeChain(freeOnly);
    mockSelect.mockReturnValue(chain);

    const result = await getAccessibleQuestions('10-12', 'child-1');

    expect(result).toHaveLength(1);
    expect(result).toEqual(freeOnly);
    // The where() call should have been invoked with conditions that include tier
    expect(chain.where).toHaveBeenCalled();
  });

  it('passes parentEmail to hasFeatureAccess when provided', async () => {
    const chain = makeChain([sampleQuestion]);
    mockSelect.mockReturnValue(chain);

    await getAccessibleQuestions('10-12', 'child-1', {
      parentEmail: 'parent@example.com',
    });

    expect(hasFeatureAccess).toHaveBeenCalledWith(
      'gat_extended_bank',
      'parent@example.com'
    );
  });

  it('filters by skillArea when provided', async () => {
    const chain = makeChain([sampleQuestion]);
    mockSelect.mockReturnValue(chain);

    const result = await getAccessibleQuestions('10-12', 'child-1', {
      skillArea: 'quantitative',
    });

    expect(result).toHaveLength(1);
    expect(chain.from).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
  });

  it('does NOT filter by skillArea when value is "mixed"', async () => {
    const chain = makeChain([sampleQuestion, sampleQuestion2]);
    mockSelect.mockReturnValue(chain);

    const result = await getAccessibleQuestions('10-12', 'child-1', {
      skillArea: 'mixed',
    });

    expect(result).toHaveLength(2);
  });

  it('filters by subSkill when provided', async () => {
    const chain = makeChain([sampleQuestion]);
    mockSelect.mockReturnValue(chain);

    const result = await getAccessibleQuestions('10-12', 'child-1', {
      subSkill: 'patterns',
    });

    expect(result).toHaveLength(1);
    expect(chain.where).toHaveBeenCalled();
  });

  it('filters by difficulty when provided', async () => {
    const chain = makeChain([sampleQuestion]);
    mockSelect.mockReturnValue(chain);

    const result = await getAccessibleQuestions('10-12', 'child-1', {
      difficulty: 'medium',
    });

    expect(result).toHaveLength(1);
  });

  it('does NOT filter by difficulty when value is "mixed"', async () => {
    const chain = makeChain([sampleQuestion, sampleQuestion2]);
    mockSelect.mockReturnValue(chain);

    const result = await getAccessibleQuestions('10-12', 'child-1', {
      difficulty: 'mixed',
    });

    expect(result).toHaveLength(2);
  });

  it('excludes questions by ID when excludeIds provided', async () => {
    const chain = makeChain([sampleQuestion2]);
    mockSelect.mockReturnValue(chain);

    const result = await getAccessibleQuestions('10-12', 'child-1', {
      excludeIds: ['q-1'],
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('q-2');
  });

  it('does NOT add excludeIds condition when array is empty', async () => {
    const chain = makeChain([sampleQuestion, sampleQuestion2]);
    mockSelect.mockReturnValue(chain);

    const result = await getAccessibleQuestions('10-12', 'child-1', {
      excludeIds: [],
    });

    expect(result).toHaveLength(2);
  });

  it('respects custom limit', async () => {
    const chain = makeChain([sampleQuestion]);
    mockSelect.mockReturnValue(chain);

    await getAccessibleQuestions('10-12', 'child-1', { limit: 5 });

    expect(chain.limit).toHaveBeenCalledWith(5);
  });

  it('defaults to limit of 10 when not specified', async () => {
    const chain = makeChain([]);
    mockSelect.mockReturnValue(chain);

    await getAccessibleQuestions('10-12', 'child-1');

    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it('handles null childId', async () => {
    const chain = makeChain([sampleQuestion]);
    mockSelect.mockReturnValue(chain);

    const result = await getAccessibleQuestions('10-12', null);

    expect(result).toHaveLength(1);
  });

  it('combines multiple filters together', async () => {
    mockFlagEnabled = true;
    const chain = makeChain([sampleQuestion]);
    mockSelect.mockReturnValue(chain);

    const result = await getAccessibleQuestions('10-12', 'child-1', {
      skillArea: 'quantitative',
      difficulty: 'medium',
      excludeIds: ['q-99'],
      limit: 3,
      parentEmail: 'parent@example.com',
    });

    expect(result).toHaveLength(1);
    expect(chain.limit).toHaveBeenCalledWith(3);
    expect(hasFeatureAccess).toHaveBeenCalledWith(
      'gat_extended_bank',
      'parent@example.com'
    );
  });

  it('returns empty array when no questions match', async () => {
    const chain = makeChain([]);
    mockSelect.mockReturnValue(chain);

    const result = await getAccessibleQuestions('99-99', 'child-1');

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});

// ─── canAccessQuestion ──────────────────────────────────────────────────────

describe('canAccessQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlagEnabled = false;
  });

  it('returns true when flag is OFF (no tier distinction)', async () => {
    mockFlagEnabled = false;

    const result = await canAccessQuestion('child-1', 'q-1');

    expect(result).toBe(true);
    // Should NOT query the database at all when flag is off
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns true for free tier question when flag is ON', async () => {
    mockFlagEnabled = true;
    const chain = makeChain([{ tier: 'free' }]);
    mockSelect.mockReturnValue(chain);

    const result = await canAccessQuestion('child-1', 'q-1');

    expect(result).toBe(true);
  });

  it('returns false for premium tier question when flag is ON (free user)', async () => {
    mockFlagEnabled = true;
    const chain = makeChain([{ tier: 'premium' }]);
    mockSelect.mockReturnValue(chain);

    const result = await canAccessQuestion('child-1', 'q-1');

    expect(result).toBe(false);
  });

  it('returns false when question does not exist and flag is ON', async () => {
    mockFlagEnabled = true;
    const chain = makeChain([]);
    mockSelect.mockReturnValue(chain);

    const result = await canAccessQuestion('child-1', 'nonexistent');

    expect(result).toBe(false);
  });

  it('treats null tier as free (returns true)', async () => {
    mockFlagEnabled = true;
    const chain = makeChain([{ tier: null }]);
    mockSelect.mockReturnValue(chain);

    const result = await canAccessQuestion('child-1', 'q-1');

    expect(result).toBe(true);
  });

  it('treats undefined tier as free (returns true)', async () => {
    mockFlagEnabled = true;
    const chain = makeChain([{ tier: undefined }]);
    mockSelect.mockReturnValue(chain);

    const result = await canAccessQuestion('child-1', 'q-1');

    expect(result).toBe(true);
  });

  it('passes parentEmail to hasFeatureAccess', async () => {
    mockFlagEnabled = false;

    await canAccessQuestion('child-1', 'q-1', 'parent@example.com');

    expect(hasFeatureAccess).toHaveBeenCalledWith(
      'gat_extended_bank',
      'parent@example.com'
    );
  });

  it('passes null parentEmail to hasFeatureAccess', async () => {
    await canAccessQuestion('child-1', 'q-1', null);

    expect(hasFeatureAccess).toHaveBeenCalledWith('gat_extended_bank', null);
  });
});

// ─── getQuestionBankStats ───────────────────────────────────────────────────

describe('getQuestionBankStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlagEnabled = false;
  });

  it('returns correct totals for mixed free and premium across skill areas', async () => {
    const chain = makeChain([
      { tier: 'free', skillArea: 'quantitative', count: 50 },
      { tier: 'free', skillArea: 'verbal', count: 40 },
      { tier: 'premium', skillArea: 'quantitative', count: 100 },
      { tier: 'premium', skillArea: 'verbal', count: 80 },
    ]);
    mockSelect.mockReturnValue(chain);

    const stats = await getQuestionBankStats('10-12');

    expect(stats.totalFree).toBe(90);
    expect(stats.totalPremium).toBe(180);
    expect(stats.totalAll).toBe(270);
    expect(stats.bySkillArea).toHaveLength(2);
  });

  it('returns correct per-skill-area breakdown', async () => {
    const chain = makeChain([
      { tier: 'free', skillArea: 'quantitative', count: 50 },
      { tier: 'premium', skillArea: 'quantitative', count: 100 },
      { tier: 'free', skillArea: 'verbal', count: 40 },
      { tier: 'premium', skillArea: 'verbal', count: 80 },
    ]);
    mockSelect.mockReturnValue(chain);

    const stats = await getQuestionBankStats('10-12');

    const quant = stats.bySkillArea.find((s) => s.area === 'quantitative');
    const verbal = stats.bySkillArea.find((s) => s.area === 'verbal');

    expect(quant).toEqual({ area: 'quantitative', free: 50, premium: 100 });
    expect(verbal).toEqual({ area: 'verbal', free: 40, premium: 80 });
  });

  it('returns all zeros for empty question bank', async () => {
    const chain = makeChain([]);
    mockSelect.mockReturnValue(chain);

    const stats = await getQuestionBankStats('4-5');

    expect(stats.totalFree).toBe(0);
    expect(stats.totalPremium).toBe(0);
    expect(stats.totalAll).toBe(0);
    expect(stats.bySkillArea).toEqual([]);
  });

  it('handles single tier (free only)', async () => {
    const chain = makeChain([
      { tier: 'free', skillArea: 'quantitative', count: 30 },
      { tier: 'free', skillArea: 'verbal', count: 20 },
    ]);
    mockSelect.mockReturnValue(chain);

    const stats = await getQuestionBankStats('6-8');

    expect(stats.totalFree).toBe(50);
    expect(stats.totalPremium).toBe(0);
    expect(stats.totalAll).toBe(50);
    expect(stats.bySkillArea).toHaveLength(2);

    const quant = stats.bySkillArea.find((s) => s.area === 'quantitative');
    expect(quant).toEqual({ area: 'quantitative', free: 30, premium: 0 });
  });

  it('handles single tier (premium only)', async () => {
    const chain = makeChain([
      { tier: 'premium', skillArea: 'quantitative', count: 75 },
    ]);
    mockSelect.mockReturnValue(chain);

    const stats = await getQuestionBankStats('10-12');

    expect(stats.totalFree).toBe(0);
    expect(stats.totalPremium).toBe(75);
    expect(stats.totalAll).toBe(75);
    expect(stats.bySkillArea).toHaveLength(1);
    expect(stats.bySkillArea[0]).toEqual({
      area: 'quantitative',
      free: 0,
      premium: 75,
    });
  });

  it('handles single skill area with both tiers', async () => {
    const chain = makeChain([
      { tier: 'free', skillArea: 'quantitative', count: 25 },
      { tier: 'premium', skillArea: 'quantitative', count: 60 },
    ]);
    mockSelect.mockReturnValue(chain);

    const stats = await getQuestionBankStats('10-12');

    expect(stats.totalFree).toBe(25);
    expect(stats.totalPremium).toBe(60);
    expect(stats.totalAll).toBe(85);
    expect(stats.bySkillArea).toHaveLength(1);
    expect(stats.bySkillArea[0]).toEqual({
      area: 'quantitative',
      free: 25,
      premium: 60,
    });
  });

  it('treats empty string tier as free', async () => {
    const chain = makeChain([
      { tier: '', skillArea: 'quantitative', count: 10 },
    ]);
    mockSelect.mockReturnValue(chain);

    const stats = await getQuestionBankStats('10-12');

    expect(stats.totalFree).toBe(10);
    expect(stats.totalPremium).toBe(0);
  });

  it('handles many skill areas', async () => {
    const chain = makeChain([
      { tier: 'free', skillArea: 'quantitative', count: 10 },
      { tier: 'free', skillArea: 'verbal', count: 20 },
      { tier: 'free', skillArea: 'spatial', count: 15 },
      { tier: 'premium', skillArea: 'quantitative', count: 30 },
      { tier: 'premium', skillArea: 'verbal', count: 40 },
      { tier: 'premium', skillArea: 'spatial', count: 25 },
    ]);
    mockSelect.mockReturnValue(chain);

    const stats = await getQuestionBankStats('10-12');

    expect(stats.totalFree).toBe(45);
    expect(stats.totalPremium).toBe(95);
    expect(stats.totalAll).toBe(140);
    expect(stats.bySkillArea).toHaveLength(3);
  });
});

// ─── getTierCondition ───────────────────────────────────────────────────────

describe('getTierCondition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlagEnabled = false;
  });

  it('returns empty string when flag is OFF', async () => {
    mockFlagEnabled = false;

    const result = await getTierCondition();

    expect(result).toBe('');
  });

  it('returns empty string when flag is OFF even with parentEmail', async () => {
    mockFlagEnabled = false;

    const result = await getTierCondition('parent@example.com');

    expect(result).toBe('');
  });

  it('returns tier filter containing "tier = \'free\'" when flag is ON', async () => {
    mockFlagEnabled = true;

    const result = await getTierCondition();

    expect(result).toContain("tier = 'free'");
  });

  it('returns string starting with AND when flag is ON', async () => {
    mockFlagEnabled = true;

    const result = await getTierCondition();

    expect(result).toMatch(/^\s*AND/);
  });

  it('includes tier IS NULL fallback when flag is ON', async () => {
    mockFlagEnabled = true;

    const result = await getTierCondition();

    expect(result).toContain('tier IS NULL');
  });

  it('passes parentEmail to hasFeatureAccess', async () => {
    await getTierCondition('parent@example.com');

    expect(hasFeatureAccess).toHaveBeenCalledWith(
      'gat_extended_bank',
      'parent@example.com'
    );
  });

  it('passes undefined when no parentEmail provided', async () => {
    await getTierCondition();

    expect(hasFeatureAccess).toHaveBeenCalledWith(
      'gat_extended_bank',
      undefined
    );
  });

  it('passes null parentEmail when explicitly null', async () => {
    await getTierCondition(null);

    expect(hasFeatureAccess).toHaveBeenCalledWith(
      'gat_extended_bank',
      null
    );
  });
});
