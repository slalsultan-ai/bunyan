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
  siteContent: { key: 'key', value: 'value' },
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
    where: vi.fn().mockResolvedValue(result),
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

  it('returns false when token does not match DB session (new format)', async () => {
    const dbToken = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    mockCookies('f47ac10b-58cc-4372-a567-0e02b2c3d478'); // off by one char
    mockSelect.mockReturnValue(makeSelectChain([{
      key: 'admin_session',
      value: { token: dbToken, expiresAt: Date.now() + 60_000 },
    }]));
    expect(await isAdminAuthenticated()).toBe(false);
  });

  it('returns true when token matches valid session (new format)', async () => {
    const token = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    mockCookies(token);
    mockSelect.mockReturnValue(makeSelectChain([{
      key: 'admin_session',
      value: { token, expiresAt: Date.now() + 60_000 },
    }]));
    expect(await isAdminAuthenticated()).toBe(true);
  });

  it('returns false when session is expired (new format)', async () => {
    const token = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    mockCookies(token);
    mockSelect.mockReturnValue(makeSelectChain([{
      key: 'admin_session',
      value: { token, expiresAt: Date.now() - 1000 },
    }]));
    mockDelete.mockReturnValue(makeDeleteChain());
    expect(await isAdminAuthenticated()).toBe(false);
  });

  it('returns true for legacy plain-string session format', async () => {
    mockCookies('abc-123');
    mockSelect.mockReturnValue(makeSelectChain([{
      key: 'admin_session',
      value: 'abc-123',
    }]));
    expect(await isAdminAuthenticated()).toBe(true);
  });

  it('returns false when DB throws', async () => {
    mockCookies('some-token');
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockRejectedValue(new Error('DB error')),
    });
    expect(await isAdminAuthenticated()).toBe(false);
  });

  it('returns false when cookie and DB token have different lengths', async () => {
    mockCookies('short');
    mockSelect.mockReturnValue(makeSelectChain([{
      key: 'admin_session',
      value: { token: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', expiresAt: Date.now() + 60_000 },
    }]));
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

  it('stores the session in DB with token and expiresAt', async () => {
    const chain = makeInsertChain();
    mockInsert.mockReturnValue(chain);
    const before = Date.now();
    await createAdminSession();

    expect(mockInsert).toHaveBeenCalledOnce();
    const insertCall = chain.values.mock.calls[0]?.[0] ?? chain.values.mock.contexts;
    // Verify onConflictDoUpdate was called (upsert)
    expect(chain.onConflictDoUpdate).toHaveBeenCalledOnce();
  });

  it('generates unique tokens on each call', async () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 10; i++) {
      mockInsert.mockReturnValue(makeInsertChain());
      tokens.add(await createAdminSession());
    }
    expect(tokens.size).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// invalidateAdminSession
// ---------------------------------------------------------------------------

describe('invalidateAdminSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the session from DB', async () => {
    const chain = makeDeleteChain();
    mockDelete.mockReturnValue(chain);
    await invalidateAdminSession();
    expect(mockDelete).toHaveBeenCalledOnce();
    expect(chain.where).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// createOtpChallenge
// ---------------------------------------------------------------------------

describe('createOtpChallenge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a 6-digit numeric string', async () => {
    mockInsert.mockReturnValue(makeInsertChain());
    const code = await createOtpChallenge();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('code is between 100000 and 999999', async () => {
    for (let i = 0; i < 20; i++) {
      mockInsert.mockReturnValue(makeInsertChain());
      const code = await createOtpChallenge();
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it('stores hashed code in DB (not plaintext)', async () => {
    const chain = makeInsertChain();
    mockInsert.mockReturnValue(chain);
    const code = await createOtpChallenge();

    // The values call receives { key, value: { codeHash, expiresAt, attempts } }
    const call = chain.values.mock.calls[0]?.[0];
    expect(call.key).toBe('admin_otp');
    expect(call.value.codeHash).toBeDefined();
    expect(call.value.codeHash).not.toBe(code);
    expect(call.value.codeHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('sets expiresAt ~10 minutes in the future', async () => {
    const chain = makeInsertChain();
    mockInsert.mockReturnValue(chain);
    const before = Date.now();
    await createOtpChallenge();

    const call = chain.values.mock.calls[0]?.[0];
    const tenMin = 10 * 60 * 1000;
    expect(call.value.expiresAt).toBeGreaterThanOrEqual(before + tenMin - 100);
    expect(call.value.expiresAt).toBeLessThanOrEqual(before + tenMin + 500);
  });

  it('initializes attempts to 0', async () => {
    const chain = makeInsertChain();
    mockInsert.mockReturnValue(chain);
    await createOtpChallenge();
    const call = chain.values.mock.calls[0]?.[0];
    expect(call.value.attempts).toBe(0);
  });

  it('uses upsert to overwrite any existing OTP', async () => {
    const chain = makeInsertChain();
    mockInsert.mockReturnValue(chain);
    await createOtpChallenge();
    expect(chain.onConflictDoUpdate).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// verifyOtpChallenge
// ---------------------------------------------------------------------------

describe('verifyOtpChallenge', () => {
  beforeEach(() => vi.clearAllMocks());

  async function setupOtp(code: string, overrides: Partial<{ expiresAt: number; attempts: number }> = {}) {
    const codeHash = await hashCode(code);
    const record = {
      codeHash,
      expiresAt: overrides.expiresAt ?? Date.now() + 5 * 60 * 1000,
      attempts: overrides.attempts ?? 0,
    };
    mockSelect.mockReturnValue(makeSelectChain([{ value: record }]));
    return record;
  }

  it('returns "ok" for correct code', async () => {
    await setupOtp('654321');
    mockDelete.mockReturnValue(makeDeleteChain());
    expect(await verifyOtpChallenge('654321')).toBe('ok');
  });

  it('returns "invalid" when no OTP exists in DB', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    expect(await verifyOtpChallenge('123456')).toBe('invalid');
  });

  it('returns "expired" when OTP is past expiresAt', async () => {
    await setupOtp('123456', { expiresAt: Date.now() - 1000 });
    mockDelete.mockReturnValue(makeDeleteChain());
    expect(await verifyOtpChallenge('123456')).toBe('expired');
  });

  it('deletes expired OTP from DB', async () => {
    await setupOtp('123456', { expiresAt: Date.now() - 1000 });
    mockDelete.mockReturnValue(makeDeleteChain());
    await verifyOtpChallenge('123456');
    expect(mockDelete).toHaveBeenCalled();
  });

  it('returns "max_attempts" when attempts >= 3', async () => {
    await setupOtp('123456', { attempts: 3 });
    mockDelete.mockReturnValue(makeDeleteChain());
    expect(await verifyOtpChallenge('123456')).toBe('max_attempts');
  });

  it('returns "max_attempts" when attempts > 3', async () => {
    await setupOtp('123456', { attempts: 5 });
    mockDelete.mockReturnValue(makeDeleteChain());
    expect(await verifyOtpChallenge('123456')).toBe('max_attempts');
  });

  it('deletes OTP when max attempts exceeded', async () => {
    await setupOtp('123456', { attempts: 3 });
    mockDelete.mockReturnValue(makeDeleteChain());
    await verifyOtpChallenge('123456');
    expect(mockDelete).toHaveBeenCalled();
  });

  it('returns "invalid" for wrong code', async () => {
    await setupOtp('123456');
    mockUpdate.mockReturnValue(makeUpdateChain());
    expect(await verifyOtpChallenge('999999')).toBe('invalid');
  });

  it('increments attempts on wrong code', async () => {
    await setupOtp('123456', { attempts: 1 });
    mockUpdate.mockReturnValue(makeUpdateChain());
    await verifyOtpChallenge('999999');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('deletes OTP after successful verification (prevents reuse)', async () => {
    await setupOtp('123456');
    mockDelete.mockReturnValue(makeDeleteChain());
    await verifyOtpChallenge('123456');
    expect(mockDelete).toHaveBeenCalled();
  });

  it('still validates at attempts = 2 (under limit)', async () => {
    await setupOtp('123456', { attempts: 2 });
    mockDelete.mockReturnValue(makeDeleteChain());
    expect(await verifyOtpChallenge('123456')).toBe('ok');
  });

  it('blocks at attempts = 3 even with correct code', async () => {
    await setupOtp('123456', { attempts: 3 });
    mockDelete.mockReturnValue(makeDeleteChain());
    expect(await verifyOtpChallenge('123456')).toBe('max_attempts');
  });
});
