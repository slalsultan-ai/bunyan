import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetParentSession = vi.fn();
vi.mock('@/lib/parent-auth', () => ({ getParentSession: mockGetParentSession }));

const mockUpdate = vi.fn();
vi.mock('@/lib/db', () => ({ getDb: () => ({ update: mockUpdate }) }));
vi.mock('@/lib/db/schema', () => ({ parents: {} }));

const { PUT } = await import('@/app/api/settings/email/route');

function makeReq(body: unknown) {
  return { json: vi.fn().mockResolvedValue(body) } as unknown as import('next/server').NextRequest;
}
function makeUpdateChain() {
  return { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
}

const SESSION = { parentId: 'p1', email: 'x@y.com' };

describe('PUT /api/settings/email', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockGetParentSession.mockResolvedValue(null);
    const res = await PUT(makeReq({ weeklyEmailEnabled: false }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when value is not boolean', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    const res = await PUT(makeReq({ weeklyEmailEnabled: 'yes' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when weeklyEmailEnabled is missing', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    const res = await PUT(makeReq({}));
    expect(res.status).toBe(400);
  });

  it('disables email when passed false', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    mockUpdate.mockReturnValue(makeUpdateChain());
    const res = await PUT(makeReq({ weeklyEmailEnabled: false }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it('enables email when passed true', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    mockUpdate.mockReturnValue(makeUpdateChain());
    const res = await PUT(makeReq({ weeklyEmailEnabled: true }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it('returns 400 for malformed JSON', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    const req = { json: vi.fn().mockRejectedValue(new SyntaxError('bad json')) } as unknown as import('next/server').NextRequest;
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });
});
