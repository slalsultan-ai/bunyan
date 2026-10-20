import { describe, it, expect, vi, beforeEach } from 'vitest';

const submitChallengeAnswer = vi.fn();
// selectAllFrom issues SELECT * via db.all; these tests drive the older select().from() mock chain.
vi.mock('@/lib/db/select-all', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectAllFrom: (db: any, table: string) => db.select().from(table),
}));

vi.mock('@/lib/feature-flags', () => ({ hasFeatureAccess: async () => true }));
vi.mock('@/lib/parent-auth', () => ({ getAuthenticatedParent: async () => ({ id: 'p1', email: 'p@example.com' }) }));
vi.mock('@/lib/daily-challenge', () => ({
  submitChallengeAnswer: (...a: unknown[]) => submitChallengeAnswer(...a),
  completeDailyChallenge: vi.fn(),
  getStreakInfo: async () => ({ current: 0 }),
  getTodayRiyadh: () => '2026-10-20',
}));
const selectChain = (rows: unknown[]) => ({ from: () => ({ where: () => Object.assign(Promise.resolve(rows), { limit: async () => rows }) }) });
vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: (arg?: unknown) => (arg ? selectChain([{ correctOptionIndex: 0 }]) : selectChain([])) }),
}));
vi.mock('@/lib/db/schema', () => ({ questions: { id: 'id', correctOptionIndex: 'correct_option_index' } }));

const { POST } = await import('@/app/api/daily-challenge/submit/route');
const req = (body: unknown) => ({ json: async () => body }) as unknown as import('next/server').NextRequest;

beforeEach(() => submitChallengeAnswer.mockClear());

describe('daily challenge scoring', () => {
  it('scores the saved key on the server', async () => {
    const res = await POST(req({ childId: 'c1', questionId: 'q1', selectedOption: 0 }));
    expect((await res.json()).isCorrect).toBe(true);
    expect(submitChallengeAnswer).toHaveBeenCalledWith('c1', '2026-10-20', 'q1', '0', true);
  });

  it('marks a different option wrong', async () => {
    const res = await POST(req({ childId: 'c1', questionId: 'q1', selectedOption: 2 }));
    expect((await res.json()).isCorrect).toBe(false);
  });

  it('rejects empty or non-index answers instead of counting them as option 0', async () => {
    for (const selectedOption of ['', false, [], 7]) {
      const res = await POST(req({ childId: 'c1', questionId: 'q1', selectedOption }));
      expect(res.status).toBe(400);
    }
    expect(submitChallengeAnswer).not.toHaveBeenCalled();
  });
});
