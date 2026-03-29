import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRateLimit = vi.fn().mockReturnValue({ allowed: true });
const mockGetIp = vi.fn().mockReturnValue('1.2.3.4');
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mockRateLimit, getIp: mockGetIp }));

const mockHashCode = vi.fn();
const mockCreateParentSession = vi.fn().mockResolvedValue('session-token-xyz');
const mockSetParentCookie = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/parent-auth', () => ({
  hashCode: mockHashCode,
  createParentSession: mockCreateParentSession,
  setParentCookie: mockSetParentCookie,
}));

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
    update: mockUpdate,
  }),
}));

vi.mock('@/lib/db/schema', () => ({ otpCodes: {}, parents: {} }));

const { POST } = await import('@/app/api/auth/verify-otp/route');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(body: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => '1.2.3.4' },
  } as unknown as import('next/server').NextRequest;
}

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

function makeUpdateChain() {
  return { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
}

function makeInsertChain() {
  return { values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([{ id: 'new-parent', email: 'x@y.com', unsubscribeToken: 'tok' }]) };
}

const FUTURE = new Date(Date.now() + 600_000).toISOString();
const PAST = new Date(Date.now() - 1000).toISOString();

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/verify-otp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 for missing code', async () => {
    const res = await POST(makeReq({ email: 'a@b.com' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for code shorter than 6 digits', async () => {
    const res = await POST(makeReq({ email: 'a@b.com', code: '123' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when no OTP found in DB', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const res = await POST(makeReq({ email: 'a@b.com', code: '123456' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('غير صحيح');
  });

  it('returns 400 when OTP is expired', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{
      id: 'otp-1', email: 'a@b.com', codeHash: 'hash', expiresAt: PAST, attempts: 0, used: false,
    }]));
    mockDelete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    const res = await POST(makeReq({ email: 'a@b.com', code: '123456' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('صلاحية');
  });

  it('returns 400 when OTP attempts exceeded', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{
      id: 'otp-1', email: 'a@b.com', codeHash: 'hash', expiresAt: FUTURE, attempts: 3, used: false,
    }]));
    mockDelete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    const res = await POST(makeReq({ email: 'a@b.com', code: '123456' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('محاولات');
  });

  it('returns 400 and increments attempts on wrong code', async () => {
    mockHashCode.mockResolvedValue('wrong-hash');
    mockSelect.mockReturnValue(makeSelectChain([{
      id: 'otp-1', email: 'a@b.com', codeHash: 'correct-hash', expiresAt: FUTURE, attempts: 0, used: false,
    }]));
    mockUpdate.mockReturnValue(makeUpdateChain());
    const res = await POST(makeReq({ email: 'a@b.com', code: '999999' }));
    expect(res.status).toBe(400);
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it('creates new user and returns isNewUser=true for unknown email', async () => {
    mockHashCode.mockResolvedValue('correct-hash');
    // First select: OTP lookup
    // Second select: parent lookup (empty → new user)
    mockSelect
      .mockReturnValueOnce(makeSelectChain([{
        id: 'otp-1', email: 'new@user.com', codeHash: 'correct-hash', expiresAt: FUTURE, attempts: 0, used: false,
      }]))
      .mockReturnValueOnce(makeSelectChain([])); // parent not found

    mockUpdate.mockReturnValue(makeUpdateChain()); // mark OTP used
    mockInsert.mockReturnValue(makeInsertChain()); // insert parent

    const res = await POST(makeReq({ email: 'new@user.com', code: '123456' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isNewUser).toBe(true);
    expect(mockCreateParentSession).toHaveBeenCalledOnce();
    expect(mockSetParentCookie).toHaveBeenCalledOnce();
  });

  it('logs in existing user and returns isNewUser=false', async () => {
    mockHashCode.mockResolvedValue('correct-hash');
    mockSelect
      .mockReturnValueOnce(makeSelectChain([{
        id: 'otp-1', email: 'existing@user.com', codeHash: 'correct-hash', expiresAt: FUTURE, attempts: 0, used: false,
      }]))
      .mockReturnValueOnce(makeSelectChain([{
        id: 'parent-1', email: 'existing@user.com', weeklyEmailEnabled: true, unsubscribeToken: 'tok',
      }]));

    mockUpdate.mockReturnValue(makeUpdateChain());

    const res = await POST(makeReq({ email: 'existing@user.com', code: '123456' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isNewUser).toBe(false);
  });
});
