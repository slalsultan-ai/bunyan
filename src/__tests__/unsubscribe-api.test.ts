import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect, update: mockUpdate }),
}));

vi.mock('@/lib/db/schema', () => ({ parents: {} }));

const { GET } = await import('@/app/api/unsubscribe/route');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(token?: string) {
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  return {
    nextUrl: { searchParams: params },
  } as unknown as import('next/server').NextRequest;
}

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

function makeUpdateChain() {
  return { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/unsubscribe', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when no token provided', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
  });

  it('returns 404 when token not found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const res = await GET(makeReq('unknown-token'));
    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).toContain('غير صحيح');
  });

  it('unsubscribes and returns 200 when token found', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{
      id: 'p1', email: 'user@test.com', unsubscribeToken: 'valid-token',
    }]));
    mockUpdate.mockReturnValue(makeUpdateChain());

    const res = await GET(makeReq('valid-token'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('تم إلغاء');
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it('response HTML is RTL and contains bunyan link', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{
      id: 'p1', email: 'x@y.com', unsubscribeToken: 'tok',
    }]));
    mockUpdate.mockReturnValue(makeUpdateChain());

    const res = await GET(makeReq('tok'));
    const html = await res.text();
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('bunyan');
    expect(html).toContain('✅');
  });
});
