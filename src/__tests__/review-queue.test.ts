import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect, insert: mockInsert, update: mockUpdate }),
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
    createdAt: 'created_at',
  },
  questions: {
    id: 'id',
  },
}));

const { upsertReviewItem, markReviewProgress, getReviewStats } = await import('@/lib/review-queue');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

function makeInsertChain() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

function makeUpdateChain() {
  return { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
}

// ─── upsertReviewItem ────────────────────────────────────────────────────────

describe('upsertReviewItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts new item when not existing', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    mockInsert.mockReturnValue(makeInsertChain());

    await upsertReviewItem({
      guestId: 'g1',
      questionId: 'q1',
      lastWrongAt: '2026-01-01T00:00:00Z',
    });

    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it('updates existing item when found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      { id: 1, guestId: 'g1', questionId: 'q1', timesWrong: 1, timesReviewed: 0 },
    ]));
    mockUpdate.mockReturnValue(makeUpdateChain());

    await upsertReviewItem({
      guestId: 'g1',
      questionId: 'q1',
      lastWrongAt: '2026-01-01T00:00:00Z',
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('does nothing without guestId or childId', async () => {
    await upsertReviewItem({
      questionId: 'q1',
      lastWrongAt: '2026-01-01T00:00:00Z',
    });

    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

// ─── markReviewProgress ──────────────────────────────────────────────────────

describe('markReviewProgress', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does nothing when item not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    await markReviewProgress({ guestId: 'g1', questionId: 'q1' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('increments timesReviewed', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      { id: 1, timesReviewed: 0 },
    ]));
    mockUpdate.mockReturnValue(makeUpdateChain());

    await markReviewProgress({ guestId: 'g1', questionId: 'q1' });
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it('marks as mastered when timesReviewed reaches 3', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      { id: 1, timesReviewed: 2 },
    ]));
    const setFn = vi.fn().mockReturnThis();
    const whereFn = vi.fn().mockResolvedValue(undefined);
    mockUpdate.mockReturnValue({ set: setFn, where: whereFn });

    await markReviewProgress({ guestId: 'g1', questionId: 'q1' });

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(setFn).toHaveBeenCalledWith(expect.objectContaining({
      timesReviewed: 3,
      mastered: 1,
    }));
  });
});

// ─── getReviewStats ──────────────────────────────────────────────────────────

describe('getReviewStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns zeros when no items', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ total: 0, mastered: 0, pending: 0 }]),
    };
    mockSelect.mockReturnValue(chain);

    const stats = await getReviewStats({ guestId: 'g1' });
    expect(stats).toEqual({ total: 0, mastered: 0, pending: 0 });
  });

  it('returns correct counts', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ total: 10, mastered: 3, pending: 5 }]),
    };
    mockSelect.mockReturnValue(chain);

    const stats = await getReviewStats({ childId: 'c1' });
    expect(stats).toEqual({ total: 10, mastered: 3, pending: 5 });
  });

  it('throws when no identifier provided', async () => {
    await expect(getReviewStats({})).rejects.toThrow('Either guestId or childId is required');
  });
});
