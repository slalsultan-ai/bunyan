import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRateLimit = vi.fn();
const mockGetIp = vi.fn().mockReturnValue('1.2.3.4');
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mockRateLimit,
  getIp: mockGetIp,
}));

const mockSendParentOtp = vi.fn();
vi.mock('@/lib/email/otp', () => ({ sendParentOtp: mockSendParentOtp }));

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect, insert: mockInsert, delete: mockDelete }),
}));

vi.mock('@/lib/db/schema', () => ({ otpCodes: {} }));
vi.mock('@/lib/parent-auth', () => ({
  hashCode: vi.fn().mockResolvedValue('hashed'),
}));

const { POST } = await import('@/app/api/auth/send-otp/route');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(body: unknown, headers: Record<string, string> = {}) {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: { get: (k: string) => headers[k] ?? null },
    nextUrl: { searchParams: new URLSearchParams() },
  } as unknown as import('next/server').NextRequest;
}

function makeDeleteChain() {
  return { where: vi.fn().mockResolvedValue(undefined) };
}

function makeInsertChain() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/send-otp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: rate limit allows
    mockRateLimit.mockReturnValue({ allowed: true });
    mockDelete.mockReturnValue(makeDeleteChain());
    mockInsert.mockReturnValue(makeInsertChain());
    mockSendParentOtp.mockResolvedValue(undefined);
  });

  it('returns 429 when IP rate-limited', async () => {
    mockRateLimit.mockReturnValueOnce({ allowed: false, retryAfter: 60 });
    const res = await POST(makeReq({ email: 'a@b.com' }));
    expect(res.status).toBe(429);
  });

  it('returns 400 for missing email', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await POST(makeReq({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('returns 429 when email rate-limited', async () => {
    // First call (IP): allowed. Second call (email): not allowed.
    mockRateLimit
      .mockReturnValueOnce({ allowed: true })
      .mockReturnValueOnce({ allowed: false });
    const res = await POST(makeReq({ email: 'x@y.com' }));
    expect(res.status).toBe(429);
  });

  it('returns 200 and calls sendParentOtp on success', async () => {
    const res = await POST(makeReq({ email: 'valid@email.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockSendParentOtp).toHaveBeenCalledOnce();
    expect(mockSendParentOtp).toHaveBeenCalledWith('valid@email.com', expect.any(String));
  });

  it('returns 500 when email send fails', async () => {
    mockSendParentOtp.mockRejectedValue(new Error('SMTP error'));
    const res = await POST(makeReq({ email: 'ok@test.com' }));
    expect(res.status).toBe(500);
  });

  it('normalises email to lowercase', async () => {
    await POST(makeReq({ email: 'UPPER@CASE.COM' }));
    expect(mockSendParentOtp).toHaveBeenCalledWith('upper@case.com', expect.any(String));
  });

  it('returns 400 for malformed JSON body', async () => {
    const req = {
      json: vi.fn().mockRejectedValue(new SyntaxError('bad json')),
      headers: { get: () => '1.2.3.4' },
    } as unknown as import('next/server').NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
