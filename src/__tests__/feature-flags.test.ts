import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect, update: mockUpdate }),
}));

vi.mock('@/lib/db/schema', () => ({
  featureFlags: {
    id: 'id',
    flagKey: 'flag_key',
    enabled: 'enabled',
    allowedEmails: 'allowed_emails',
  },
}));

const { hasFeatureAccess, getUserFeatures } = await import('@/lib/feature-flags');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockResolvedValue(result),
  };
}

function makeFlagRow(overrides: Partial<{
  id: number;
  flagKey: string;
  title: string;
  description: string | null;
  enabled: number | null;
  allowedEmails: string | null;
  createdAt: string;
  updatedAt: string;
}> = {}) {
  return {
    id: 1,
    flagKey: 'test_flag',
    title: 'Test Flag',
    description: null,
    enabled: 0,
    allowedEmails: '',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

// ─── hasFeatureAccess ────────────────────────────────────────────────────────

describe('hasFeatureAccess', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns false for non-existent flag (safe default)', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const result = await hasFeatureAccess('nonexistent');
    expect(result).toBe(false);
  });

  it('returns true when flag is globally enabled', async () => {
    mockSelect.mockReturnValue(makeSelectChain([makeFlagRow({ enabled: 1 })]));
    const result = await hasFeatureAccess('test_flag');
    expect(result).toBe(true);
  });

  it('returns true when flag is globally enabled + visitor (no email)', async () => {
    mockSelect.mockReturnValue(makeSelectChain([makeFlagRow({ enabled: 1 })]));
    const result = await hasFeatureAccess('test_flag', null);
    expect(result).toBe(true);
  });

  it('returns false when flag disabled + visitor (no email)', async () => {
    mockSelect.mockReturnValue(makeSelectChain([makeFlagRow({ enabled: 0 })]));
    const result = await hasFeatureAccess('test_flag', null);
    expect(result).toBe(false);
  });

  it('returns true when flag disabled + email in allowed list', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      makeFlagRow({ enabled: 0, allowedEmails: 'test@example.com,other@example.com' }),
    ]));
    const result = await hasFeatureAccess('test_flag', 'test@example.com');
    expect(result).toBe(true);
  });

  it('returns false when flag disabled + email NOT in allowed list', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      makeFlagRow({ enabled: 0, allowedEmails: 'other@example.com' }),
    ]));
    const result = await hasFeatureAccess('test_flag', 'nope@example.com');
    expect(result).toBe(false);
  });

  it('handles case-insensitive email matching', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      makeFlagRow({ enabled: 0, allowedEmails: 'Test@Example.com' }),
    ]));
    const result = await hasFeatureAccess('test_flag', 'test@example.com');
    expect(result).toBe(true);
  });

  it('returns false on DB error (safe default)', async () => {
    mockSelect.mockImplementation(() => { throw new Error('DB error'); });
    const result = await hasFeatureAccess('test_flag', 'test@example.com');
    expect(result).toBe(false);
  });
});

// ─── getUserFeatures ─────────────────────────────────────────────────────────

describe('getUserFeatures', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty object when no flags exist', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    // getUserFeatures calls .from().orderBy() not .from().where().limit()
    // Actually it calls .from() with no where/limit
    const chain = {
      from: vi.fn().mockResolvedValue([]),
    };
    mockSelect.mockReturnValue(chain);
    const result = await getUserFeatures();
    expect(result).toEqual({});
  });

  it('returns enabled flags for visitor', async () => {
    const chain = {
      from: vi.fn().mockResolvedValue([
        makeFlagRow({ flagKey: 'enabled_flag', enabled: 1 }),
        makeFlagRow({ flagKey: 'disabled_flag', enabled: 0, allowedEmails: 'test@test.com' }),
      ]),
    };
    mockSelect.mockReturnValue(chain);
    const result = await getUserFeatures(null);
    expect(result).toEqual({
      enabled_flag: true,
      disabled_flag: false,
    });
  });

  it('returns correct access for authenticated user', async () => {
    const chain = {
      from: vi.fn().mockResolvedValue([
        makeFlagRow({ flagKey: 'enabled_flag', enabled: 1 }),
        makeFlagRow({ flagKey: 'allowed_flag', enabled: 0, allowedEmails: 'me@test.com' }),
        makeFlagRow({ flagKey: 'denied_flag', enabled: 0, allowedEmails: 'other@test.com' }),
      ]),
    };
    mockSelect.mockReturnValue(chain);
    const result = await getUserFeatures('me@test.com');
    expect(result).toEqual({
      enabled_flag: true,
      allowed_flag: true,
      denied_flag: false,
    });
  });

  it('returns empty object on DB error', async () => {
    mockSelect.mockImplementation(() => { throw new Error('DB error'); });
    const result = await getUserFeatures('me@test.com');
    expect(result).toEqual({});
  });
});
