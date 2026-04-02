import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetParentSession = vi.fn();
vi.mock('@/lib/parent-auth', () => ({
  getParentSession: () => mockGetParentSession(),
}));

const mockHasFeatureAccess = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  hasFeatureAccess: (key: string, email: string | null) => mockHasFeatureAccess(key, email),
}));

const mockGetReviewQuestions = vi.fn();
const mockGetReviewStats = vi.fn();
vi.mock('@/lib/review-queue', () => ({
  getReviewQuestions: (p: unknown) => mockGetReviewQuestions(p),
  getReviewStats: (p: unknown) => mockGetReviewStats(p),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

const { GET: getQuestions } = await import('@/app/api/review/questions/route');
const { GET: getStats } = await import('@/app/api/review/stats/route');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/review/questions');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return { nextUrl: url } as unknown as import('next/server').NextRequest;
}

// ─── GET /api/review/questions ───────────────────────────────────────────────

describe('GET /api/review/questions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when feature flag not accessible', async () => {
    mockGetParentSession.mockResolvedValue(null);
    mockHasFeatureAccess.mockResolvedValue(false);
    const res = await getQuestions(makeReq({ guestId: 'g1' }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when no guestId or childId', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'test@test.com' });
    mockHasFeatureAccess.mockResolvedValue(true);
    const res = await getQuestions(makeReq());
    expect(res.status).toBe(400);
  });

  it('returns questions with answer keys stripped', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'test@test.com' });
    mockHasFeatureAccess.mockResolvedValue(true);
    mockGetReviewQuestions.mockResolvedValue([
      {
        id: 'q1',
        skillArea: 'quantitative',
        subSkill: 'math',
        ageGroup: '6-9',
        difficulty: 'easy',
        questionType: 'text',
        questionTextAr: 'ما هو 1+1؟',
        options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
        correctOptionIndex: 1,
        explanationAr: 'الجواب 2',
        isActive: true,
      },
    ]);

    const res = await getQuestions(makeReq({ guestId: 'g1' }));
    const data = await res.json();

    expect(data.questions).toHaveLength(1);
    expect(data.questions[0]).not.toHaveProperty('correctOptionIndex');
    expect(data.questions[0]).not.toHaveProperty('explanationAr');
    expect(data.questions[0].id).toBe('q1');
  });
});

// ─── GET /api/review/stats ────────────────────────────────────────────────���─

describe('GET /api/review/stats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when feature flag not accessible', async () => {
    mockGetParentSession.mockResolvedValue(null);
    mockHasFeatureAccess.mockResolvedValue(false);
    const res = await getStats(makeReq({ guestId: 'g1' }));
    expect(res.status).toBe(403);
  });

  it('returns stats for valid request', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'test@test.com' });
    mockHasFeatureAccess.mockResolvedValue(true);
    mockGetReviewStats.mockResolvedValue({ pending: 5, mastered: 3, total: 8 });

    const res = await getStats(makeReq({ guestId: 'g1' }));
    const data = await res.json();

    expect(data).toEqual({ pending: 5, mastered: 3, total: 8 });
  });
});
