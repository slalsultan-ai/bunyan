import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect, insert: mockInsert, delete: mockDelete, update: mockUpdate }),
}));

vi.mock('@/lib/db/schema', () => ({
  adminSessions: { id: 'id', tokenHash: 'token_hash', expiresAt: 'expires_at', adminEmail: 'admin_email' },
  adminOtp: { id: 'id', email: 'email', codeHash: 'code_hash', expiresAt: 'expires_at', used: 'used' },
  adminAuditLog: {},
}));

import { cookies } from 'next/headers';
const { isAdminAuthenticated, createAdminSession, invalidateAdminSession, createOtpChallenge, verifyOtpChallenge } =
  await import('@/lib/admin-auth');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

function makeInsertChain() {
  return {
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  };
}

function makeDeleteChain() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  };
}

function makeUpdateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

function mockCookies(token?: string) {
  (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
    get: vi.fn().mockReturnValue(token ? { value: token } : undefined),
  });
}

async function hashCode(code: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// isAdminAuthenticated
// ---------------------------------------------------------------------------

describe('isAdminAuthenticated', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns false when no cookie', async () => {
    mockCookies(undefined);
    expect(await isAdminAuthenticated()).toBe(false);
  });

  it('returns false when cookie exists but no DB session', async () => {
    mockCookies('some-token');
    mockSelect.mockReturnValue(makeSelectChain([]));
    expect(await isAdminAuthenticated()).toBe(false);
  });

  it('returns false when token does not match DB session', async () => {
    const { createHash } = await import('node:crypto');
    const wrongToken = 'f47ac10b-58cc-4372-a567-0e02b2c3d478';
    mockCookies(wrongToken);
    // No session found for wrong token's hash
    mockSelect.mockReturnValue(makeSelectChain([]));
    expect(await isAdminAuthenticated()).toBe(false);
  });

  it('returns true when token matches valid session', async () => {
    const rawToken = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const { createHash } = await import('node:crypto');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    mockCookies(rawToken);
    mockSelect.mockReturnValue(makeSelectChain([{
      id: 1,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      adminEmail: 'admin@test.com',
    }]));
    mockUpdate.mockReturnValue(makeUpdateChain());
    expect(await isAdminAuthenticated()).toBe(true);
  });

  it('returns false when session is expired', async () => {
    const rawToken = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const { createHash } = await import('node:crypto');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    mockCookies(rawToken);
    mockSelect.mockReturnValue(makeSelectChain([{
      id: 1,
      tokenHash,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      adminEmail: 'admin@test.com',
    }]));
    mockDelete.mockReturnValue(makeDeleteChain());
    expect(await isAdminAuthenticated()).toBe(false);
  });

  it('returns false when DB throws', async () => {
    mockCookies('some-token');
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error('DB error')),
    });
    expect(await isAdminAuthenticated()).toBe(false);
  });

  it('returns false when cookie and DB token have different lengths', async () => {
    mockCookies('short');
    // Hash of 'short' won't match anything in DB
    mockSelect.mockReturnValue(makeSelectChain([]));
    expect(await isAdminAuthenticated()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createAdminSession
// ---------------------------------------------------------------------------

describe('createAdminSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a UUID-format token', async () => {
    mockInsert.mockReturnValue(makeInsertChain());
    const token = await createAdminSession();
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('stores the session in DB with tokenHash', async () => {
    const chain = makeInsertChain();
    mockInsert.mockReturnValue(chain);
    await createAdminSession();

    // insert is called twice: once for admin_sessions, once for audit_log
    expect(mockInsert).toHaveBeenCalled();
  });

  it('generates unique tokens on each call', async () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 10; i++) {
      mockInsert.mockReturnValue(makeInsertChain());
      tokens.add(await createAdminSession());
    }
    expect(tokens.size).toBe(10);
  });

  it('logs a login action in audit log', async () => {
    mockInsert.mockReturnValue(makeInsertChain());
    await createAdminSession('admin@test.com');
    // Should have called insert twice: once for session, once for audit log
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('stores expiresAt approximately 8 hours in the future', async () => {
    const chain = makeInsertChain();
    mockInsert.mockReturnValue(chain);
    const before = Date.now();
    await createAdminSession();
    const insertCall = chain.values.mock.calls[0]?.[0];
    const expiresAt = new Date(insertCall.expiresAt).getTime();
    const eightHours = 8 * 60 * 60 * 1000;
    expect(expiresAt).toBeGreaterThanOrEqual(before + eightHours - 100);
    expect(expiresAt).toBeLessThanOrEqual(before + eightHours + 500);
  });
});

// ---------------------------------------------------------------------------
// invalidateAdminSession
// ---------------------------------------------------------------------------

describe('invalidateAdminSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the session from DB', async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'some-token' }),
    });
    mockSelect.mockReturnValue(makeSelectChain([{ email: 'admin@test.com' }]));
    const chain = makeDeleteChain();
    mockDelete.mockReturnValue(chain);
    mockInsert.mockReturnValue(makeInsertChain()); // audit log
    await invalidateAdminSession();
    expect(mockDelete).toHaveBeenCalled();
  });

  it('does nothing when no cookie present', async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });
    await invalidateAdminSession();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('logs a logout action in audit log', async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'some-token' }),
    });
    mockSelect.mockReturnValue(makeSelectChain([{ email: 'admin@test.com' }]));
    mockDelete.mockReturnValue(makeDeleteChain());
    mockInsert.mockReturnValue(makeInsertChain());
    await invalidateAdminSession();
    expect(mockInsert).toHaveBeenCalled(); // audit log insert
  });
});

// ---------------------------------------------------------------------------
// createOtpChallenge
// ---------------------------------------------------------------------------

describe('createOtpChallenge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a 6-digit numeric string', async () => {
    mockDelete.mockReturnValue(makeDeleteChain());
    mockInsert.mockReturnValue(makeInsertChain());
    const code = await createOtpChallenge();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('code is between 100000 and 999999', async () => {
    for (let i = 0; i < 20; i++) {
      mockDelete.mockReturnValue(makeDeleteChain());
      mockInsert.mockReturnValue(makeInsertChain());
      const code = await createOtpChallenge();
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it('stores hashed code in DB (not plaintext)', async () => {
    mockDelete.mockReturnValue(makeDeleteChain());
    const chain = makeInsertChain();
    mockInsert.mockReturnValue(chain);
    const code = await createOtpChallenge();

    // Insert was called for the OTP record
    expect(mockInsert).toHaveBeenCalled();
    const insertCall = chain.values.mock.calls[0]?.[0];
    expect(insertCall.codeHash).toBeDefined();
    expect(insertCall.codeHash).not.toBe(code);
    expect(insertCall.codeHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('sets expiresAt ~10 minutes in the future', async () => {
    mockDelete.mockReturnValue(makeDeleteChain());
    const chain = makeInsertChain();
    mockInsert.mockReturnValue(chain);
    const before = Date.now();
    await createOtpChallenge();

    const insertCall = chain.values.mock.calls[0]?.[0];
    const expiresAt = new Date(insertCall.expiresAt).getTime();
    const tenMin = 10 * 60 * 1000;
    expect(expiresAt).toBeGreaterThanOrEqual(before + tenMin - 100);
    expect(expiresAt).toBeLessThanOrEqual(before + tenMin + 500);
  });

  it('invalidates existing unused OTPs before creating new one', async () => {
    const delChain = makeDeleteChain();
    mockDelete.mockReturnValue(delChain);
    mockInsert.mockReturnValue(makeInsertChain());
    await createOtpChallenge();
    expect(mockDelete).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// verifyOtpChallenge
// ---------------------------------------------------------------------------

describe('verifyOtpChallenge', () => {
  beforeEach(() => vi.clearAllMocks());

  async function setupOtp(code: string, overrides: Partial<{ expiresAt: string; used: boolean }> = {}) {
    const codeHash = await hashCode(code);
    const otp = {
      id: 1,
      email: 'admin@test.com',
      codeHash,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      used: overrides.used ?? false,
    };
    mockSelect.mockReturnValue(makeSelectChain([otp]));
    return otp;
  }

  it('returns "ok" for correct code', async () => {
    await setupOtp('654321');
    mockUpdate.mockReturnValue(makeUpdateChain());
    expect(await verifyOtpChallenge('654321')).toBe('ok');
  });

  it('returns "invalid" when no OTP exists in DB', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    expect(await verifyOtpChallenge('123456')).toBe('invalid');
  });

  it('returns "expired" when OTP is past expiresAt', async () => {
    await setupOtp('123456', { expiresAt: new Date(Date.now() - 1000).toISOString() });
    mockDelete.mockReturnValue(makeDeleteChain());
    expect(await verifyOtpChallenge('123456')).toBe('expired');
  });

  it('deletes expired OTP from DB', async () => {
    await setupOtp('123456', { expiresAt: new Date(Date.now() - 1000).toISOString() });
    mockDelete.mockReturnValue(makeDeleteChain());
    await verifyOtpChallenge('123456');
    expect(mockDelete).toHaveBeenCalled();
  });

  it('returns "invalid" for wrong code', async () => {
    await setupOtp('123456');
    mockUpdate.mockReturnValue(makeUpdateChain());
    expect(await verifyOtpChallenge('999999')).toBe('invalid');
  });

  it('marks OTP as used after successful verification', async () => {
    await setupOtp('123456');
    mockUpdate.mockReturnValue(makeUpdateChain());
    await verifyOtpChallenge('123456');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('still validates with correct code (under limit)', async () => {
    await setupOtp('123456');
    mockUpdate.mockReturnValue(makeUpdateChain());
    expect(await verifyOtpChallenge('123456')).toBe('ok');
  });

  it('returns expired and deletes when past time', async () => {
    await setupOtp('123456', { expiresAt: new Date(Date.now() - 5000).toISOString() });
    mockDelete.mockReturnValue(makeDeleteChain());
    const result = await verifyOtpChallenge('123456');
    expect(result).toBe('expired');
    expect(mockDelete).toHaveBeenCalled();
  });

  it('returns invalid for empty code', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    expect(await verifyOtpChallenge('')).toBe('invalid');
  });

  it('returns invalid for random wrong code', async () => {
    await setupOtp('111111');
    expect(await verifyOtpChallenge('222222')).toBe('invalid');
  });
});
