import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetParentSession = vi.fn();
vi.mock('@/lib/parent-auth', () => ({
  getParentSession: () => mockGetParentSession(),
}));

const mockHasFeatureAccess = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  hasFeatureAccess: (key: string, email: string) => mockHasFeatureAccess(key, email),
}));

const mockSelect = vi.fn();
vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect }),
}));

vi.mock('@/lib/db/schema', () => ({
  children: {},
  sessions: {},
  sessionAnswers: {},
  questions: {},
  guestProgress: {},
  childParents: {},
}));

const mockGenerateChildPdf = vi.fn();
vi.mock('@/lib/pdf/child-report', () => ({
  generateChildPdf: (data: unknown) => mockGenerateChildPdf(data),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

const { GET } = await import('@/app/api/reports/child-pdf/route');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/reports/child-pdf');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return { nextUrl: url } as unknown as import('next/server').NextRequest;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/reports/child-pdf', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockGetParentSession.mockResolvedValue(null);
    const res = await GET(makeReq({ childId: '123' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when feature flag not accessible', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'test@test.com' });
    mockHasFeatureAccess.mockResolvedValue(false);
    const res = await GET(makeReq({ childId: '123' }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when childId missing', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'test@test.com' });
    mockHasFeatureAccess.mockResolvedValue(true);
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
  });

  it('returns 404 when child not found', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'test@test.com' });
    mockHasFeatureAccess.mockResolvedValue(true);

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    mockSelect.mockReturnValue(selectChain);

    const res = await GET(makeReq({ childId: 'nonexistent' }));
    expect(res.status).toBe(404);
  });

  it('returns PDF for valid request', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'test@test.com' });
    mockHasFeatureAccess.mockResolvedValue(true);

    // Child query
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // children query
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([{ id: 'c1', name: 'Ahmed', age: 8, ageGroup: '6-9', parentId: 'p1', createdAt: '2026-01-01' }]),
        };
      }
      if (callCount === 2) {
        // totals query
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ totalSessions: 5, totalCorrect: 40, totalAnswered: 50, totalPoints: 500 }]),
        };
      }
      if (callCount === 3) {
        // guest progress
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([{ currentLevel: 3, currentStreak: 2, badges: ['starter'] }]),
        };
      }
      // All subsequent queries return empty arrays via any chaining
      const emptyChain: Record<string, unknown> = {};
      const chainFn = vi.fn().mockImplementation(() => emptyChain);
      emptyChain.from = chainFn;
      emptyChain.innerJoin = chainFn;
      emptyChain.where = chainFn;
      emptyChain.groupBy = chainFn;
      emptyChain.orderBy = vi.fn().mockResolvedValue([]);
      emptyChain.limit = vi.fn().mockResolvedValue([]);
      // Make it thenable so await resolves to []
      emptyChain.then = (resolve: (v: unknown[]) => void) => Promise.resolve([]).then(resolve);
      return emptyChain;
    });

    mockGenerateChildPdf.mockResolvedValue(Buffer.from('fake-pdf'));

    const res = await GET(makeReq({ childId: 'c1' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(mockGenerateChildPdf).toHaveBeenCalledOnce();
  });
});
