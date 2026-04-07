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

function makeSelectChain(result: unknown[]) {
  // The chain resolves as a thenable at any level
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

// ─── checkFirstVisit ─────────────────────────────────────────────────────────

describe('checkFirstVisit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when child has 0 completed sessions', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ cnt: 0 }]));
    expect(await checkFirstVisit('child-1')).toBe(true);
  });

  it('returns false when child has completed sessions', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ cnt: 5 }]));
    expect(await checkFirstVisit('child-1')).toBe(false);
  });

  it('returns false on DB error', async () => {
    mockSelect.mockImplementation(() => { throw new Error('DB error'); });
    expect(await checkFirstVisit('child-1')).toBe(false);
  });
});

// ─── checkComebackStatus ─────────────────────────────────────────────────────

describe('checkComebackStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns isComeback=false when no sessions exist', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ lastDate: null }]));
    const result = await checkComebackStatus('child-1');
    expect(result.isComeback).toBe(false);
  });

  it('returns isComeback=true when last activity was 5 days ago', async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
    mockSelect.mockReturnValue(makeSelectChain([{ lastDate: fiveDaysAgo }]));
    const result = await checkComebackStatus('child-1');
    expect(result.isComeback).toBe(true);
    expect(result.daysSinceLastActivity).toBeGreaterThanOrEqual(4);
  });

  it('returns isComeback=false when last activity was today', async () => {
    const today = new Date().toISOString();
    mockSelect.mockReturnValue(makeSelectChain([{ lastDate: today }]));
    const result = await checkComebackStatus('child-1');
    expect(result.isComeback).toBe(false);
    expect(result.daysSinceLastActivity).toBe(0);
  });

  it('returns isComeback=false on error', async () => {
    mockSelect.mockImplementation(() => { throw new Error('DB error'); });
    const result = await checkComebackStatus('child-1');
    expect(result.isComeback).toBe(false);
  });
});
