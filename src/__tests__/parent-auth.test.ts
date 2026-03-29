import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
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

vi.mock('@/lib/db/schema', () => ({
  parents: {},
  parentSessions: {},
}));

import { cookies } from 'next/headers';
const { computeAgeGroup, createParentSession, getParentSession } =
  await import('@/lib/parent-auth');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    orderBy: vi.fn().mockReturnThis(),
  };
}

function makeInsertChain() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  };
}

function makeDeleteChain() {
  return {
    where: vi.fn().mockReturnThis(),
    // For and() compound where
  };
}

function mockCookies(token?: string) {
  (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
    get: vi.fn().mockReturnValue(token ? { value: token } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  });
}

// ─── computeAgeGroup ─────────────────────────────────────────────────────────

describe('computeAgeGroup', () => {
  it('returns 4-5 for age 4', () => expect(computeAgeGroup(4)).toBe('4-5'));
  it('returns 4-5 for age 5', () => expect(computeAgeGroup(5)).toBe('4-5'));
  it('returns 6-9 for age 6', () => expect(computeAgeGroup(6)).toBe('6-9'));
  it('returns 6-9 for age 9', () => expect(computeAgeGroup(9)).toBe('6-9'));
  it('returns 10-12 for age 10', () => expect(computeAgeGroup(10)).toBe('10-12'));
  it('returns 10-12 for age 12', () => expect(computeAgeGroup(12)).toBe('10-12'));
  it('covers boundary 5→6 correctly', () => {
    expect(computeAgeGroup(5)).toBe('4-5');
    expect(computeAgeGroup(6)).toBe('6-9');
  });
  it('covers boundary 9→10 correctly', () => {
    expect(computeAgeGroup(9)).toBe('6-9');
    expect(computeAgeGroup(10)).toBe('10-12');
  });
});

// ─── createParentSession ─────────────────────────────────────────────────────

describe('createParentSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a UUID-format token', async () => {
    const del = { where: vi.fn().mockReturnThis() };
    mockDelete.mockReturnValue(del);
    mockInsert.mockReturnValue(makeInsertChain());

    const token = await createParentSession('parent-123');
    expect(token).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('inserts session into DB', async () => {
    const del = { where: vi.fn().mockReturnThis() };
    mockDelete.mockReturnValue(del);
    const ins = makeInsertChain();
    mockInsert.mockReturnValue(ins);

    await createParentSession('parent-456');
    expect(mockInsert).toHaveBeenCalledOnce();
    expect(ins.values).toHaveBeenCalledOnce();
  });
});

// ─── getParentSession ─────────────────────────────────────────────────────────

describe('getParentSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no cookie', async () => {
    mockCookies(undefined);
    expect(await getParentSession()).toBeNull();
  });

  it('returns null when session not found in DB', async () => {
    mockCookies('some-token');
    mockSelect.mockReturnValue(makeSelectChain([]));
    expect(await getParentSession()).toBeNull();
  });

  it('returns null when session is expired', async () => {
    mockCookies('valid-token');
    const expiredAt = new Date(Date.now() - 1000).toISOString();
    mockSelect.mockReturnValue(makeSelectChain([{
      parentId: 'p1',
      expiresAt: expiredAt,
      token: 'valid-token',
      email: 'test@test.com',
    }]));
    const del = { where: vi.fn().mockReturnThis() };
    mockDelete.mockReturnValue(del);

    expect(await getParentSession()).toBeNull();
  });

  it('returns session data when valid', async () => {
    mockCookies('good-token');
    const futureAt = new Date(Date.now() + 60_000).toISOString();
    mockSelect.mockReturnValue(makeSelectChain([{
      parentId: 'p1',
      expiresAt: futureAt,
      token: 'good-token',
      email: 'parent@example.com',
    }]));

    const session = await getParentSession();
    expect(session).not.toBeNull();
    expect(session?.parentId).toBe('p1');
    expect(session?.email).toBe('parent@example.com');
  });
});
