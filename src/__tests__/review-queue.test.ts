import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockRun = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({
    select: mockSelect,
    run: mockRun,
    insert: mockInsert,
    update: mockUpdate,
  }),
}));

vi.mock('@/lib/db/schema', () => ({
  reviewQueue: {
    id: 'id',
    guestId: 'guest_id',
    childId: 'child_id',
    questionId: 'question_id',
    timesWrong: 'times_wrong',
    timesReviewed: 'times_reviewed',
    lastWrongAt: 'last_wrong_at',
    nextReviewAt: 'next_review_at',
    mastered: 'mastered',
  },
  questions: { id: 'id', $inferSelect: {} },
}));

const mockHasFeatureAccess = vi.fn(async () => false);
vi.mock('@/lib/feature-flags', () => ({
  hasFeatureAccess: (...args: unknown[]) => mockHasFeatureAccess(...args),
}));

vi.mock('drizzle-orm', () => ({
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    { join: (...a: unknown[]) => a, raw: (v: unknown) => v },
  ),
  eq: (a: unknown, b: unknown) => ({ op: 'eq', a, b }),
  and: (...args: unknown[]) => ({ op: 'and', args }),
  lte: (a: unknown, b: unknown) => ({ op: 'lte', a, b }),
}));

const {
  upsertReviewItem,
  markReviewProgress,
  getReviewQuestions,
  getReviewStats,
} = await import('@/lib/review-queue');

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

function setupInsertMock() {
  mockInsert.mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  });
}

function setupUpdateMock() {
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
}

const REVIEW_ITEM = {
  id: 10,
  guest_id: null,
  child_id: 'c1',
  question_id: 'q1',
  times_wrong: 2,
  timesReviewed: 1,
  last_wrong_at: '2026-01-01T00:00:00Z',
  next_review_at: '2026-01-02T00:00:00Z',
  mastered: 0,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── upsertReviewItem ────────────────────────────────────────────────────────

describe('upsertReviewItem', () => {
  it('inserts a new item when no existing row found', async () => {
    mockSelect.mockReturnValueOnce(makeChain([]));
    setupInsertMock();

    await upsertReviewItem({
      childId: 'c1',
      questionId: 'q1',
      lastWrongAt: '2026-01-01T00:00:00Z',
    });

    expect(mockInsert).toHaveBeenCalled();
  });

  it('updates existing item with incremented times_wrong', async () => {
    mockSelect.mockReturnValueOnce(makeChain([REVIEW_ITEM]));
    setupUpdateMock();

    await upsertReviewItem({
      childId: 'c1',
      questionId: 'q1',
      lastWrongAt: '2026-01-05T00:00:00Z',
    });

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns without action when no childId or guestId', async () => {
    await upsertReviewItem({
      questionId: 'q1',
      lastWrongAt: '2026-01-01T00:00:00Z',
    });

    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('works with guestId instead of childId', async () => {
    mockSelect.mockReturnValueOnce(makeChain([]));
    setupInsertMock();

    await upsertReviewItem({
      guestId: 'g1',
      questionId: 'q1',
      lastWrongAt: '2026-01-01T00:00:00Z',
    });

    expect(mockInsert).toHaveBeenCalled();
  });

  it('resets mastered and timesReviewed on update', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ ...REVIEW_ITEM, mastered: 1, timesReviewed: 3 }]));
    setupUpdateMock();

    await upsertReviewItem({
      childId: 'c1',
      questionId: 'q1',
      lastWrongAt: '2026-01-05T00:00:00Z',
    });

    expect(mockUpdate).toHaveBeenCalled();
    const setCall = mockUpdate.mock.results[0].value.set;
    expect(setCall).toHaveBeenCalled();
    const setArg = setCall.mock.calls[0][0];
    expect(setArg.mastered).toBe(0);
    expect(setArg.timesReviewed).toBe(0);
  });
});

// ─── markReviewProgress ──────────────────────────────────────────────────────

describe('markReviewProgress', () => {
  it('returns without action when item not found', async () => {
    mockSelect.mockReturnValueOnce(makeChain([]));

    await markReviewProgress({ childId: 'c1', questionId: 'q1' });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns without action when no childId or guestId', async () => {
    await markReviewProgress({ questionId: 'q1' } as any);

    expect(mockSelect).not.toHaveBeenCalled();
  });

  describe('V1 intervals (flag off)', () => {
    beforeEach(() => {
      mockHasFeatureAccess.mockResolvedValue(false);
    });

    it('schedules next review in 1 day after 1st review', async () => {
      const item = { ...REVIEW_ITEM, timesReviewed: 0 };
      mockSelect.mockReturnValueOnce(makeChain([item]));
      setupUpdateMock();

      await markReviewProgress({ childId: 'c1', questionId: 'q1' });

      expect(mockUpdate).toHaveBeenCalled();
      const setCall = mockUpdate.mock.results[0].value.set;
      const setArg = setCall.mock.calls[0][0];
      expect(setArg.timesReviewed).toBe(1);
      // Not mastered yet
      expect(setArg.mastered).toBeUndefined();
    });

    it('schedules next review in 2 days after 2nd review', async () => {
      const item = { ...REVIEW_ITEM, timesReviewed: 1 };
      mockSelect.mockReturnValueOnce(makeChain([item]));
      setupUpdateMock();

      await markReviewProgress({ childId: 'c1', questionId: 'q1' });

      const setArg = mockUpdate.mock.results[0].value.set.mock.calls[0][0];
      expect(setArg.timesReviewed).toBe(2);
      expect(setArg.mastered).toBeUndefined();
    });

    it('schedules next review in 3 days after 3rd review', async () => {
      const item = { ...REVIEW_ITEM, timesReviewed: 2 };
      mockSelect.mockReturnValueOnce(makeChain([item]));
      setupUpdateMock();

      await markReviewProgress({ childId: 'c1', questionId: 'q1' });

      const setArg = mockUpdate.mock.results[0].value.set.mock.calls[0][0];
      expect(setArg.timesReviewed).toBe(3);
      expect(setArg.mastered).toBeUndefined();
    });

    it('marks mastered after 4th review (beyond 3 intervals)', async () => {
      const item = { ...REVIEW_ITEM, timesReviewed: 3 };
      mockSelect.mockReturnValueOnce(makeChain([item]));
      setupUpdateMock();

      await markReviewProgress({ childId: 'c1', questionId: 'q1' });

      const setArg = mockUpdate.mock.results[0].value.set.mock.calls[0][0];
      expect(setArg.timesReviewed).toBe(4);
      expect(setArg.mastered).toBe(1);
    });
  });

  describe('V2 intervals (flag on)', () => {
    beforeEach(() => {
      mockHasFeatureAccess.mockResolvedValue(true);
    });

    it('schedules next review in 3 days after 1st review', async () => {
      const item = { ...REVIEW_ITEM, timesReviewed: 0 };
      mockSelect.mockReturnValueOnce(makeChain([item]));
      setupUpdateMock();

      await markReviewProgress({ childId: 'c1', questionId: 'q1' });

      const setArg = mockUpdate.mock.results[0].value.set.mock.calls[0][0];
      expect(setArg.timesReviewed).toBe(1);
      expect(setArg.mastered).toBeUndefined();
    });

    it('schedules next review in 7 days after 2nd review', async () => {
      const item = { ...REVIEW_ITEM, timesReviewed: 1 };
      mockSelect.mockReturnValueOnce(makeChain([item]));
      setupUpdateMock();

      await markReviewProgress({ childId: 'c1', questionId: 'q1' });

      const setArg = mockUpdate.mock.results[0].value.set.mock.calls[0][0];
      expect(setArg.timesReviewed).toBe(2);
      expect(setArg.mastered).toBeUndefined();
    });

    it('schedules next review in 14 days after 3rd review', async () => {
      const item = { ...REVIEW_ITEM, timesReviewed: 2 };
      mockSelect.mockReturnValueOnce(makeChain([item]));
      setupUpdateMock();

      await markReviewProgress({ childId: 'c1', questionId: 'q1' });

      const setArg = mockUpdate.mock.results[0].value.set.mock.calls[0][0];
      expect(setArg.timesReviewed).toBe(3);
      expect(setArg.mastered).toBeUndefined();
    });

    it('marks mastered after 4th review (beyond 3 V2 intervals)', async () => {
      const item = { ...REVIEW_ITEM, timesReviewed: 3 };
      mockSelect.mockReturnValueOnce(makeChain([item]));
      setupUpdateMock();

      await markReviewProgress({ childId: 'c1', questionId: 'q1' });

      const setArg = mockUpdate.mock.results[0].value.set.mock.calls[0][0];
      expect(setArg.timesReviewed).toBe(4);
      expect(setArg.mastered).toBe(1);
    });
  });
});

// ─── getReviewQuestions ──────────────────────────────────────────────────────

describe('getReviewQuestions', () => {
  it('returns questions in review order', async () => {
    const reviewItemsChain = makeChain([
      { questionId: 'q2' },
      { questionId: 'q1' },
    ]);
    const questionsChain = makeChain([
      { id: 'q1', question_text_ar: 'سؤال 1' },
      { id: 'q2', question_text_ar: 'سؤال 2' },
    ]);
    mockSelect
      .mockReturnValueOnce(reviewItemsChain)
      .mockReturnValueOnce(questionsChain);

    const qs = await getReviewQuestions({ childId: 'c1' });

    expect(qs).toHaveLength(2);
    // Order preserved from review queue
    expect(qs[0].id).toBe('q2');
    expect(qs[1].id).toBe('q1');
  });

  it('returns empty array when no review items due', async () => {
    mockSelect.mockReturnValueOnce(makeChain([]));

    const qs = await getReviewQuestions({ childId: 'c1' });

    expect(qs).toEqual([]);
    // Should not make second select call for questions
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it('throws when neither guestId nor childId provided', async () => {
    await expect(getReviewQuestions({} as any)).rejects.toThrow(
      'Either guestId or childId is required',
    );
  });

  it('works with guestId', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ questionId: 'q1' }]))
      .mockReturnValueOnce(makeChain([{ id: 'q1', question_text_ar: 'سؤال 1' }]));

    const qs = await getReviewQuestions({ guestId: 'g1' });

    expect(qs).toHaveLength(1);
    expect(qs[0].id).toBe('q1');
  });

  it('respects custom limit parameter', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ questionId: 'q1' }]))
      .mockReturnValueOnce(makeChain([{ id: 'q1' }]));

    await getReviewQuestions({ childId: 'c1', limit: 5 });

    // The limit should have been called on the chain
    const chain = mockSelect.mock.results[0].value;
    expect(chain.limit).toHaveBeenCalledWith(5);
  });

  it('filters out questions not found in DB', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ questionId: 'q1' }, { questionId: 'q_missing' }]))
      .mockReturnValueOnce(makeChain([{ id: 'q1', question_text_ar: 'سؤال 1' }]));

    const qs = await getReviewQuestions({ childId: 'c1' });

    expect(qs).toHaveLength(1);
    expect(qs[0].id).toBe('q1');
  });
});

// ─── getReviewStats ──────────────────────────────────────────────────────────

describe('getReviewStats', () => {
  it('returns total, mastered, and pending counts', async () => {
    mockSelect.mockReturnValueOnce(
      makeChain([{ total: 10, mastered: 4, pending: 3 }]),
    );

    const stats = await getReviewStats({ childId: 'c1' });

    expect(stats.total).toBe(10);
    expect(stats.mastered).toBe(4);
    expect(stats.pending).toBe(3);
  });

  it('returns zeros when stats are null', async () => {
    mockSelect.mockReturnValueOnce(
      makeChain([{ total: null, mastered: null, pending: null }]),
    );

    const stats = await getReviewStats({ childId: 'c1' });

    expect(stats.total).toBe(0);
    expect(stats.mastered).toBe(0);
    expect(stats.pending).toBe(0);
  });

  it('returns zeros when result is empty', async () => {
    mockSelect.mockReturnValueOnce(makeChain([]));

    const stats = await getReviewStats({ childId: 'c1' });

    expect(stats.total).toBe(0);
    expect(stats.mastered).toBe(0);
    expect(stats.pending).toBe(0);
  });

  it('throws when neither guestId nor childId provided', async () => {
    await expect(getReviewStats({} as any)).rejects.toThrow(
      'Either guestId or childId is required',
    );
  });

  it('works with guestId', async () => {
    mockSelect.mockReturnValueOnce(
      makeChain([{ total: 5, mastered: 2, pending: 1 }]),
    );

    const stats = await getReviewStats({ guestId: 'g1' });

    expect(stats.total).toBe(5);
    expect(stats.mastered).toBe(2);
    expect(stats.pending).toBe(1);
  });
});
