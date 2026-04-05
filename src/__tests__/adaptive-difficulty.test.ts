import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pickDifficulty, recommendDifficulty } from '@/lib/adaptive-difficulty';

// ─── pickDifficulty (pure) ───────────────────────────────────────────────────

describe('pickDifficulty', () => {
  it('returns medium below minimum sample size', () => {
    expect(pickDifficulty(100, 2)).toBe('medium');
    expect(pickDifficulty(0, 4)).toBe('medium');
  });

  it('returns hard for accuracy >= 85%', () => {
    expect(pickDifficulty(85, 10)).toBe('hard');
    expect(pickDifficulty(95, 10)).toBe('hard');
    expect(pickDifficulty(100, 10)).toBe('hard');
  });

  it('returns easy for accuracy < 50%', () => {
    expect(pickDifficulty(0, 10)).toBe('easy');
    expect(pickDifficulty(49, 10)).toBe('easy');
  });

  it('returns medium for accuracy in [50, 85)', () => {
    expect(pickDifficulty(50, 10)).toBe('medium');
    expect(pickDifficulty(70, 10)).toBe('medium');
    expect(pickDifficulty(84, 10)).toBe('medium');
  });
});

// ─── recommendDifficulty (DB) ────────────────────────────────────────────────

const mockSelect = vi.fn();
vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect }),
}));
vi.mock('@/lib/db/schema', () => ({
  sessionAnswers: { isCorrect: 'is_correct', sessionId: 'session_id', id: 'id' },
  sessions: { id: 'id', childId: 'child_id', guestId: 'guest_id', completedAt: 'completed_at' },
}));

function chainResolvingTo(rows: Array<{ isCorrect: boolean }>) {
  const limit = vi.fn().mockResolvedValue(rows);
  return {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit,
  };
}

describe('recommendDifficulty', () => {
  beforeEach(() => mockSelect.mockReset());

  it('returns medium with empty history', async () => {
    mockSelect.mockReturnValue(chainResolvingTo([]));
    const r = await recommendDifficulty({ childId: 'c1' });
    expect(r).toEqual({ difficulty: 'medium', sampleSize: 0, accuracy: 0 });
  });

  it('returns medium when no identifier provided', async () => {
    const r = await recommendDifficulty({});
    expect(r).toEqual({ difficulty: 'medium', sampleSize: 0, accuracy: 0 });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns hard for high accuracy', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ isCorrect: i < 9 })); // 90%
    mockSelect.mockReturnValue(chainResolvingTo(rows));
    const r = await recommendDifficulty({ guestId: 'g1' });
    expect(r.difficulty).toBe('hard');
    expect(r.accuracy).toBe(90);
  });

  it('returns easy for low accuracy', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ isCorrect: i < 3 })); // 30%
    mockSelect.mockReturnValue(chainResolvingTo(rows));
    const r = await recommendDifficulty({ childId: 'c1' });
    expect(r.difficulty).toBe('easy');
    expect(r.accuracy).toBe(30);
  });
});
