import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockRun = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect, run: mockRun }),
}));

vi.mock('@/lib/db/schema', () => ({
  sessions: {
    id: 'id',
    childId: 'child_id',
    startedAt: 'started_at',
    completedAt: 'completed_at',
    skillArea: 'skill_area',
    score: 'score',
    totalQuestions: 'total_questions',
  },
}));

const { checkComebackStatus, checkFirstVisit, checkSkillImprovement } = await import('@/lib/mascot/bunaa-triggers');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(result: unknown[]) {
  const chain: any = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    then: (resolve: (v: unknown[]) => void) => resolve(result),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

// ─── checkFirstVisit ────────────────────────────────────────────────────────

describe('checkFirstVisit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when child has 0 completed sessions', async () => {
    mockSelect.mockReturnValue(makeChain([{ cnt: 0 }]));
    expect(await checkFirstVisit('child-1')).toBe(true);
  });

  it('returns false when child has completed sessions', async () => {
    mockSelect.mockReturnValue(makeChain([{ cnt: 5 }]));
    expect(await checkFirstVisit('child-1')).toBe(false);
  });

  it('returns true when count is null (treated as 0)', async () => {
    mockSelect.mockReturnValue(makeChain([{ cnt: null }]));
    // (row?.cnt ?? 0) === 0 → true
    expect(await checkFirstVisit('child-1')).toBe(true);
  });

  it('returns false on DB error', async () => {
    mockSelect.mockImplementation(() => { throw new Error('DB error'); });
    expect(await checkFirstVisit('child-1')).toBe(false);
  });
});

// ─── checkComebackStatus ────────────────────────────────────────────────────

describe('checkComebackStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns isComeback=false when no sessions exist', async () => {
    mockSelect.mockReturnValue(makeChain([{ lastDate: null }]));
    const result = await checkComebackStatus('child-1');
    expect(result.isComeback).toBe(false);
    expect(result.daysSinceLastActivity).toBe(0);
  });

  it('returns isComeback=true when last activity was 5 days ago', async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
    mockSelect.mockReturnValue(makeChain([{ lastDate: fiveDaysAgo }]));
    const result = await checkComebackStatus('child-1');
    expect(result.isComeback).toBe(true);
    expect(result.daysSinceLastActivity).toBeGreaterThanOrEqual(4);
  });

  it('returns isComeback=false when last activity was today', async () => {
    const today = new Date().toISOString();
    mockSelect.mockReturnValue(makeChain([{ lastDate: today }]));
    const result = await checkComebackStatus('child-1');
    expect(result.isComeback).toBe(false);
    expect(result.daysSinceLastActivity).toBe(0);
  });

  it('returns isComeback=true when last activity was exactly 3 days ago', async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    mockSelect.mockReturnValue(makeChain([{ lastDate: threeDaysAgo }]));
    const result = await checkComebackStatus('child-1');
    expect(result.isComeback).toBe(true);
    expect(result.daysSinceLastActivity).toBeGreaterThanOrEqual(2);
  });

  it('returns isComeback=false when last activity was 2 days ago', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    mockSelect.mockReturnValue(makeChain([{ lastDate: twoDaysAgo }]));
    const result = await checkComebackStatus('child-1');
    expect(result.isComeback).toBe(false);
  });

  it('returns isComeback=false on error', async () => {
    mockSelect.mockImplementation(() => { throw new Error('DB error'); });
    const result = await checkComebackStatus('child-1');
    expect(result.isComeback).toBe(false);
    expect(result.daysSinceLastActivity).toBe(0);
  });
});

// ─── checkSkillImprovement ──────────────────────────────────────────────────

describe('checkSkillImprovement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns improving=false when fewer than 4 sessions exist', async () => {
    mockSelect.mockReturnValue(makeChain([
      { skillArea: 'quantitative', score: 9, totalQuestions: 10 },
      { skillArea: 'quantitative', score: 8, totalQuestions: 10 },
      { skillArea: 'quantitative', score: 7, totalQuestions: 10 },
    ]));

    const result = await checkSkillImprovement('child-1');
    expect(result.improving).toBe(false);
    expect(result.skillName).toBeUndefined();
  });

  it('returns improving=true with skillName when recent 3 avg is 15%+ higher', async () => {
    mockSelect.mockReturnValue(makeChain([
      { skillArea: 'quantitative', score: 9, totalQuestions: 10 },  // recent
      { skillArea: 'quantitative', score: 8, totalQuestions: 10 },
      { skillArea: 'quantitative', score: 9, totalQuestions: 10 },
      { skillArea: 'quantitative', score: 3, totalQuestions: 10 },  // previous
      { skillArea: 'quantitative', score: 4, totalQuestions: 10 },
      { skillArea: 'quantitative', score: 3, totalQuestions: 10 },
    ]));

    const result = await checkSkillImprovement('child-1');
    // Recent avg: (9+8+9)/30 * 100 = 86.67%
    // Previous avg: (3+4+3)/30 * 100 = 33.33%
    // Improvement: 53.33% >= 15%
    expect(result.improving).toBe(true);
    expect(result.skillName).toBe('الكمي');
  });

  it('returns improving=false when recent sessions show no significant improvement', async () => {
    mockSelect.mockReturnValue(makeChain([
      { skillArea: 'quantitative', score: 5, totalQuestions: 10 },  // recent
      { skillArea: 'quantitative', score: 5, totalQuestions: 10 },
      { skillArea: 'quantitative', score: 5, totalQuestions: 10 },
      { skillArea: 'quantitative', score: 5, totalQuestions: 10 },  // previous
      { skillArea: 'quantitative', score: 5, totalQuestions: 10 },
      { skillArea: 'quantitative', score: 5, totalQuestions: 10 },
    ]));

    const result = await checkSkillImprovement('child-1');
    expect(result.improving).toBe(false);
  });

  it('returns improving=false on DB error', async () => {
    mockSelect.mockImplementation(() => { throw new Error('DB error'); });
    const result = await checkSkillImprovement('child-1');
    expect(result.improving).toBe(false);
  });

  it('returns improving=false when only 4 sessions and improvement is marginal', async () => {
    mockSelect.mockReturnValue(makeChain([
      { skillArea: 'verbal', score: 6, totalQuestions: 10 },  // recent
      { skillArea: 'verbal', score: 6, totalQuestions: 10 },
      { skillArea: 'verbal', score: 6, totalQuestions: 10 },
      { skillArea: 'verbal', score: 5, totalQuestions: 10 },  // previous (only 1)
    ]));

    const result = await checkSkillImprovement('child-1');
    // Recent avg: (6+6+6)/30 * 100 = 60%
    // Previous avg: 5/10 * 100 = 50%
    // Improvement: 10% < 15%
    expect(result.improving).toBe(false);
  });

  it('identifies the dominant skill from recent sessions in mixed results', async () => {
    mockSelect.mockReturnValue(makeChain([
      { skillArea: 'verbal', score: 10, totalQuestions: 10 },       // recent
      { skillArea: 'verbal', score: 9, totalQuestions: 10 },
      { skillArea: 'quantitative', score: 10, totalQuestions: 10 },
      { skillArea: 'verbal', score: 2, totalQuestions: 10 },        // previous
      { skillArea: 'quantitative', score: 3, totalQuestions: 10 },
      { skillArea: 'verbal', score: 1, totalQuestions: 10 },
    ]));

    const result = await checkSkillImprovement('child-1');
    // Recent avg: (10+9+10)/30 * 100 = 96.67%
    // Previous avg: (2+3+1)/30 * 100 = 20%
    // Improvement: 76.67% >= 15%
    expect(result.improving).toBe(true);
    // Dominant skill in recent 3: verbal appears twice, quantitative once
    expect(result.skillName).toBe('اللفظي');
  });

  it('returns improving=false when result array is empty', async () => {
    mockSelect.mockReturnValue(makeChain([]));
    const result = await checkSkillImprovement('child-1');
    expect(result.improving).toBe(false);
  });

  it('handles logical_patterns skill name correctly', async () => {
    mockSelect.mockReturnValue(makeChain([
      { skillArea: 'logical_patterns', score: 9, totalQuestions: 10 },
      { skillArea: 'logical_patterns', score: 9, totalQuestions: 10 },
      { skillArea: 'logical_patterns', score: 10, totalQuestions: 10 },
      { skillArea: 'logical_patterns', score: 2, totalQuestions: 10 },
      { skillArea: 'logical_patterns', score: 3, totalQuestions: 10 },
      { skillArea: 'logical_patterns', score: 2, totalQuestions: 10 },
    ]));

    const result = await checkSkillImprovement('child-1');
    expect(result.improving).toBe(true);
    expect(result.skillName).toBe('المنطقي');
  });
});
