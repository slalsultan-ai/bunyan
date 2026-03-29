import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateOtpChallenge = vi.fn();
const mockSendAdminOtp = vi.fn();

vi.mock('@/lib/admin-auth', () => ({
  createOtpChallenge: (...args: unknown[]) => mockCreateOtpChallenge(...args),
}));

vi.mock('@/lib/email', () => ({
  sendAdminOtp: (...args: unknown[]) => mockSendAdminOtp(...args),
}));

const { POST } = await import('@/app/api/admin/login/route');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let reqCounter = 0;
function makeReq(body: unknown, headers: Record<string, string> = {}) {
  const defaultHeaders = { 'x-forwarded-for': `test-login-${++reqCounter}`, ...headers };
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: {
      get: (k: string) => defaultHeaders[k] ?? null,
    },
  } as unknown as import('next/server').NextRequest;
}

const ADMIN_EMAIL = 'admin@bunyan.guru';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('ADMIN_EMAIL', ADMIN_EMAIL);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/admin/login', () => {
  it('returns success even for wrong email (anti-enumeration)', async () => {
    const res = await POST(makeReq({ email: 'wrong@example.com' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    // Should NOT create OTP or send email
    expect(mockCreateOtpChallenge).not.toHaveBeenCalled();
    expect(mockSendAdminOtp).not.toHaveBeenCalled();
  });

  it('creates OTP and sends email for correct admin email', async () => {
    mockCreateOtpChallenge.mockResolvedValue('123456');
    mockSendAdminOtp.mockResolvedValue(undefined);
    const res = await POST(makeReq({ email: ADMIN_EMAIL }));
    expect(res.status).toBe(200);
    expect(mockCreateOtpChallenge).toHaveBeenCalledOnce();
    expect(mockSendAdminOtp).toHaveBeenCalledWith(ADMIN_EMAIL, '123456');
  });

  it('is case-insensitive for email matching', async () => {
    mockCreateOtpChallenge.mockResolvedValue('123456');
    mockSendAdminOtp.mockResolvedValue(undefined);
    const res = await POST(makeReq({ email: ADMIN_EMAIL.toUpperCase() }));
    expect(res.status).toBe(200);
    expect(mockCreateOtpChallenge).toHaveBeenCalledOnce();
  });

  it('returns success even if email is missing (anti-enumeration)', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(200);
    expect(mockCreateOtpChallenge).not.toHaveBeenCalled();
  });

  it('returns success even if OTP creation fails (anti-enumeration)', async () => {
    mockCreateOtpChallenge.mockRejectedValue(new Error('DB error'));
    const res = await POST(makeReq({ email: ADMIN_EMAIL }));
    expect(res.status).toBe(200);
    // Error is caught silently
  });

  it('returns success even if email sending fails (anti-enumeration)', async () => {
    mockCreateOtpChallenge.mockResolvedValue('123456');
    mockSendAdminOtp.mockRejectedValue(new Error('Email service down'));
    const res = await POST(makeReq({ email: ADMIN_EMAIL }));
    expect(res.status).toBe(200);
  });

  it('rate limits after 3 requests from same IP', async () => {
    const ip = `login-test-ip-${Date.now()}`;
    const headers = { 'x-forwarded-for': ip };

    for (let i = 0; i < 3; i++) {
      const res = await POST(makeReq({ email: 'a@b.com' }, headers));
      expect(res.status).toBe(200);
    }

    // 4th should be rate limited
    const res = await POST(makeReq({ email: 'a@b.com' }, headers));
    expect(res.status).toBe(429);
  });

  it('returns 500 when ADMIN_EMAIL env is not set', async () => {
    vi.stubEnv('ADMIN_EMAIL', '');
    const res = await POST(makeReq({ email: 'admin@test.com' }));
    expect(res.status).toBe(500);
  });
});
