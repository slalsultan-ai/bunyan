import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockVerifyOtpChallenge = vi.fn();
const mockCreateAdminSession = vi.fn();

vi.mock('@/lib/admin-auth', () => ({
  verifyOtpChallenge: (...args: unknown[]) => mockVerifyOtpChallenge(...args),
  createAdminSession: (...args: unknown[]) => mockCreateAdminSession(...args),
}));

const { POST } = await import('@/app/api/admin/verify/route');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let reqCounter = 0;
function makeReq(body: unknown, headers: Record<string, string> = {}) {
  // Use unique IP per request by default to avoid rate limit collisions between tests
  const defaultHeaders = { 'x-forwarded-for': `test-verify-${++reqCounter}`, ...headers };
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: {
      get: (k: string) => defaultHeaders[k] ?? null,
    },
  } as unknown as import('next/server').NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/admin/verify', () => {
  it('returns 400 when code is missing', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('returns 400 when code is not a string', async () => {
    const res = await POST(makeReq({ code: 123456 }));
    expect(res.status).toBe(400);
  });

  it('returns 401 when OTP is invalid', async () => {
    mockVerifyOtpChallenge.mockResolvedValue('invalid');
    const res = await POST(makeReq({ code: '999999' }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('غير صحيح');
  });

  it('returns 401 when OTP is expired', async () => {
    mockVerifyOtpChallenge.mockResolvedValue('expired');
    const res = await POST(makeReq({ code: '123456' }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('انتهت');
  });

  it('returns 401 when max attempts exceeded', async () => {
    mockVerifyOtpChallenge.mockResolvedValue('max_attempts');
    const res = await POST(makeReq({ code: '123456' }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('تجاوزت');
  });

  it('returns 200 with admin_token cookie on success', async () => {
    mockVerifyOtpChallenge.mockResolvedValue('ok');
    mockCreateAdminSession.mockResolvedValue('session-token-uuid');
    const res = await POST(makeReq({ code: '123456' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Check that admin_token cookie is set
    const setCookie = res.headers.getSetCookie?.() ?? [];
    const adminCookie = setCookie.find((c: string) => c.startsWith('admin_token='));
    expect(adminCookie).toBeDefined();
    expect(adminCookie).toContain('HttpOnly');
  });

  it('returns 500 when session creation fails', async () => {
    mockVerifyOtpChallenge.mockResolvedValue('ok');
    mockCreateAdminSession.mockRejectedValue(new Error('DB error'));
    const res = await POST(makeReq({ code: '123456' }));
    expect(res.status).toBe(500);
  });

  it('trims whitespace from code', async () => {
    mockVerifyOtpChallenge.mockResolvedValue('ok');
    mockCreateAdminSession.mockResolvedValue('token');
    await POST(makeReq({ code: '  123456  ' }));
    expect(mockVerifyOtpChallenge).toHaveBeenCalledWith('123456');
  });

  it('rate limits after 5 attempts from same IP', async () => {
    mockVerifyOtpChallenge.mockResolvedValue('invalid');
    const ip = `test-ip-${Date.now()}`;
    const headers = { 'x-forwarded-for': ip };

    // First 5 should be allowed (even if invalid)
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeReq({ code: '999999' }, headers));
      expect(res.status).toBe(401); // invalid, not rate-limited
    }

    // 6th should be rate limited
    const res = await POST(makeReq({ code: '999999' }, headers));
    expect(res.status).toBe(429);
  });

  it('handles malformed JSON body gracefully', async () => {
    const req = {
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
      headers: { get: (k: string) => k === 'x-forwarded-for' ? `malformed-${++reqCounter}` : null },
    } as unknown as import('next/server').NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
