import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect }),
}));

vi.mock('@/lib/db/schema', () => ({
  sessions: {
    id: 'id',
    guestId: 'guest_id',
    childId: 'child_id',
    startedAt: 'started_at',
    completedAt: 'completed_at',
  },
}));

let mockFeatureEnabled = false;
vi.mock('@/lib/feature-flags', () => ({
  hasFeatureAccess: vi.fn(async () => mockFeatureEnabled),
}));

vi.mock('@/lib/premium', () => ({
  isChildPremium: vi.fn(async () => false),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

const { checkSessionLimit, checkGuestSessionLimit } = await import('@/lib/session-limit');

describe('checkSessionLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeatureEnabled = false;
  });

  it('always allows when feature flag is off', async () => {
    mockFeatureEnabled = false;
    const result = await checkSessionLimit('child-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(999);
  });

  it('allows when flag is on and less than 3 sessions', async () => {
    mockFeatureEnabled = true;
    mockSelect.mockReturnValue(makeSelectChain([{ cnt: 1 }]));
    const result = await checkSessionLimit('child-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.total).toBe(1);
    expect(result.limit).toBe(3);
  });

  it('blocks when flag is on and 3 sessions used', async () => {
    mockFeatureEnabled = true;
    mockSelect.mockReturnValue(makeSelectChain([{ cnt: 3 }]));
    const result = await checkSessionLimit('child-1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.total).toBe(3);
  });

  it('blocks when flag is on and more than 3 sessions', async () => {
    mockFeatureEnabled = true;
    mockSelect.mockReturnValue(makeSelectChain([{ cnt: 5 }]));
    const result = await checkSessionLimit('child-1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('allows at 0 sessions', async () => {
    mockFeatureEnabled = true;
    mockSelect.mockReturnValue(makeSelectChain([{ cnt: 0 }]));
    const result = await checkSessionLimit('child-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
  });
});

describe('checkGuestSessionLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeatureEnabled = false;
  });

  it('always allows when feature flag is off', async () => {
    mockFeatureEnabled = false;
    const result = await checkGuestSessionLimit('guest-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(999);
  });

  it('blocks guest when at limit', async () => {
    mockFeatureEnabled = true;
    mockSelect.mockReturnValue(makeSelectChain([{ cnt: 3 }]));
    const result = await checkGuestSessionLimit('guest-1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('allows guest under limit', async () => {
    mockFeatureEnabled = true;
    mockSelect.mockReturnValue(makeSelectChain([{ cnt: 2 }]));
    const result = await checkGuestSessionLimit('guest-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });
});
