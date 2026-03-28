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

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect, insert: mockInsert, delete: mockDelete }),
}));

vi.mock('@/lib/db/schema', () => ({
  siteContent: { key: 'key', value: 'value' },
}));

import { cookies } from 'next/headers';
const { isAdminAuthenticated, createAdminSession, invalidateAdminSession } =
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

function mockCookies(token?: string) {
  (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
    get: vi.fn().mockReturnValue(token ? { value: token } : undefined),
  });
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
    mockCookies('wrong-token');
    mockSelect.mockReturnValue(makeSelectChain([{ key: 'admin_session', value: 'correct-token' }]));
    expect(await isAdminAuthenticated()).toBe(false);
  });

  it('returns true when token matches DB session', async () => {
    mockCookies('abc-123');
    mockSelect.mockReturnValue(makeSelectChain([{ key: 'admin_session', value: 'abc-123' }]));
    expect(await isAdminAuthenticated()).toBe(true);
  });

  it('returns false when DB throws', async () => {
    mockCookies('some-token');
    mockSelect.mockReturnValue({ from: vi.fn().mockReturnThis(), where: vi.fn().mockRejectedValue(new Error('DB error')) });
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
    expect(token).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('stores the session in DB', async () => {
    const chain = makeInsertChain();
    mockInsert.mockReturnValue(chain);
    await createAdminSession();
    expect(mockInsert).toHaveBeenCalledOnce();
    expect(chain.onConflictDoUpdate).toHaveBeenCalledOnce();
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
