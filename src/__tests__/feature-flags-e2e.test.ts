/**
 * End-to-end feature flags tests.
 * Tests the FULL flow: flag state → email matching → access decision.
 * Covers every edge case that could cause "feature doesn't work when email is added".
 */
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
    title: 'title',
    description: 'description',
    enabled: 'enabled',
    allowedEmails: 'allowed_emails',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}));

const { hasFeatureAccess, getUserFeatures, getAllFlags, updateFlag } = await import('@/lib/feature-flags');

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockResolvedValue(result),
  };
}

// ─── Critical Path: Email Matching ──────────────────────────────────────────

describe('Feature Flags — Email Matching (Critical Path)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('grants access when email exactly matches allowed list', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      makeFlagRow({ enabled: 0, allowedEmails: 'user@example.com' }),
    ]));
    expect(await hasFeatureAccess('test_flag', 'user@example.com')).toBe(true);
  });

  it('grants access case-insensitively', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      makeFlagRow({ enabled: 0, allowedEmails: 'User@Example.COM' }),
    ]));
    expect(await hasFeatureAccess('test_flag', 'user@example.com')).toBe(true);
  });

  it('grants access when email is one of multiple in comma-separated list', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      makeFlagRow({ enabled: 0, allowedEmails: 'admin@test.com, user@example.com, other@test.com' }),
    ]));
    expect(await hasFeatureAccess('test_flag', 'user@example.com')).toBe(true);
  });

  it('grants access with whitespace around emails', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      makeFlagRow({ enabled: 0, allowedEmails: '  user@example.com  ,  other@test.com  ' }),
    ]));
    expect(await hasFeatureAccess('test_flag', 'user@example.com')).toBe(true);
  });

  it('denies access when email not in list', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      makeFlagRow({ enabled: 0, allowedEmails: 'other@test.com' }),
    ]));
    expect(await hasFeatureAccess('test_flag', 'user@example.com')).toBe(false);
  });

  it('denies access when allowedEmails is empty string', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      makeFlagRow({ enabled: 0, allowedEmails: '' }),
    ]));
    expect(await hasFeatureAccess('test_flag', 'user@example.com')).toBe(false);
  });

  it('denies access when allowedEmails is null', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      makeFlagRow({ enabled: 0, allowedEmails: null }),
    ]));
    expect(await hasFeatureAccess('test_flag', 'user@example.com')).toBe(false);
  });

  it('grants access when globally enabled regardless of email', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      makeFlagRow({ enabled: 1, allowedEmails: '' }),
    ]));
    expect(await hasFeatureAccess('test_flag', 'anyone@test.com')).toBe(true);
  });

  it('grants access when globally enabled with no email (visitor)', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      makeFlagRow({ enabled: 1 }),
    ]));
    expect(await hasFeatureAccess('test_flag')).toBe(true);
    expect(await hasFeatureAccess('test_flag', null)).toBe(true);
    expect(await hasFeatureAccess('test_flag', undefined)).toBe(true);
  });

  it('denies access to visitor when flag disabled even with emails in list', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      makeFlagRow({ enabled: 0, allowedEmails: 'user@test.com' }),
    ]));
    expect(await hasFeatureAccess('test_flag')).toBe(false);
    expect(await hasFeatureAccess('test_flag', null)).toBe(false);
  });

  it('denies access when flag does not exist', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    expect(await hasFeatureAccess('nonexistent', 'user@test.com')).toBe(false);
  });

  it('denies access on DB error (graceful degradation)', async () => {
    mockSelect.mockImplementation(() => { throw new Error('DB down'); });
    expect(await hasFeatureAccess('test_flag', 'user@test.com')).toBe(false);
  });
});

// ─── getUserFeatures — Full Flag Map ────────────────────────────────────────

describe('getUserFeatures — Full Flag Map', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns correct map for authenticated user with mixed flags', async () => {
    const chain = {
      from: vi.fn().mockResolvedValue([
        makeFlagRow({ flagKey: 'daily_challenge', enabled: 1 }),
        makeFlagRow({ flagKey: 'review_mode', enabled: 0, allowedEmails: 'user@test.com' }),
        makeFlagRow({ flagKey: 'mock_tests', enabled: 0, allowedEmails: 'other@test.com' }),
        makeFlagRow({ flagKey: 'mascot_bunaa', enabled: 0, allowedEmails: '' }),
      ]),
    };
    mockSelect.mockReturnValue(chain);

    const result = await getUserFeatures('user@test.com');
    expect(result).toEqual({
      daily_challenge: true,    // globally enabled
      review_mode: true,        // email in allowed list
      mock_tests: false,        // email NOT in allowed list
      mascot_bunaa: false,      // no allowed emails
    });
  });

  it('returns all false for visitor when no flags are globally enabled', async () => {
    const chain = {
      from: vi.fn().mockResolvedValue([
        makeFlagRow({ flagKey: 'daily_challenge', enabled: 0, allowedEmails: 'user@test.com' }),
        makeFlagRow({ flagKey: 'review_mode', enabled: 0 }),
      ]),
    };
    mockSelect.mockReturnValue(chain);

    const result = await getUserFeatures(null);
    expect(result).toEqual({
      daily_challenge: false,
      review_mode: false,
    });
  });

  it('returns empty object on DB error', async () => {
    mockSelect.mockImplementation(() => { throw new Error('DB error'); });
    const result = await getUserFeatures('user@test.com');
    expect(result).toEqual({});
  });
});

// ─── updateFlag — Save Flow ─────────────────────────────────────────────────

describe('updateFlag — Save Flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates enabled field correctly', async () => {
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mockUpdate.mockReturnValue({ set: mockSet });

    await updateFlag('daily_challenge', { enabled: true });

    expect(mockSet).toHaveBeenCalled();
    const setArg = mockSet.mock.calls[0][0];
    expect(setArg.enabled).toBe(1);
  });

  it('updates allowed_emails field correctly', async () => {
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mockUpdate.mockReturnValue({ set: mockSet });

    await updateFlag('daily_challenge', { allowed_emails: 'user@test.com, other@test.com' });

    const setArg = mockSet.mock.calls[0][0];
    expect(setArg.allowedEmails).toBe('user@test.com, other@test.com');
  });

  it('updates both fields at once', async () => {
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mockUpdate.mockReturnValue({ set: mockSet });

    await updateFlag('test_flag', { enabled: false, allowed_emails: 'a@b.com' });

    const setArg = mockSet.mock.calls[0][0];
    expect(setArg.enabled).toBe(0);
    expect(setArg.allowedEmails).toBe('a@b.com');
  });
});

// ─── Scenario Tests: Real-World Flows ───────────────────────────────────────

describe('Real-World Scenarios', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Scenario: Admin adds email, user checks features → feature appears', async () => {
    // Step 1: Admin saves flag with user's email
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mockUpdate.mockReturnValue({ set: mockSet });
    await updateFlag('daily_challenge', { enabled: false, allowed_emails: 'parent@gmail.com' });

    // Step 2: User's client fetches features
    const chain = {
      from: vi.fn().mockResolvedValue([
        makeFlagRow({ flagKey: 'daily_challenge', enabled: 0, allowedEmails: 'parent@gmail.com' }),
      ]),
    };
    mockSelect.mockReturnValue(chain);
    const features = await getUserFeatures('parent@gmail.com');

    expect(features.daily_challenge).toBe(true);
  });

  it('Scenario: Admin adds email with spaces → still matches', async () => {
    const chain = {
      from: vi.fn().mockResolvedValue([
        makeFlagRow({ flagKey: 'mock_tests', enabled: 0, allowedEmails: '  Parent@Gmail.com  ' }),
      ]),
    };
    mockSelect.mockReturnValue(chain);
    const features = await getUserFeatures('parent@gmail.com');

    expect(features.mock_tests).toBe(true);
  });

  it('Scenario: User not logged in → email-gated features are hidden', async () => {
    const chain = {
      from: vi.fn().mockResolvedValue([
        makeFlagRow({ flagKey: 'daily_challenge', enabled: 0, allowedEmails: 'parent@gmail.com' }),
        makeFlagRow({ flagKey: 'session_limit', enabled: 1 }),
      ]),
    };
    mockSelect.mockReturnValue(chain);
    const features = await getUserFeatures(null);

    expect(features.daily_challenge).toBe(false); // email-gated, visitor → denied
    expect(features.session_limit).toBe(true);     // globally enabled → granted
  });

  it('Scenario: Flag enabled globally → all users see it', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      makeFlagRow({ flagKey: 'daily_challenge', enabled: 1, allowedEmails: '' }),
    ]));

    expect(await hasFeatureAccess('daily_challenge')).toBe(true);
    expect(await hasFeatureAccess('daily_challenge', null)).toBe(true);
    expect(await hasFeatureAccess('daily_challenge', 'anyone@test.com')).toBe(true);
  });
});
