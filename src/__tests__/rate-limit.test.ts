import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB layer
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  }),
}));

vi.mock('@/lib/db/schema', () => ({
  rateLimits: {},
}));

const { checkRateLimit, getIp } = await import('@/lib/rate-limit-db');

// Helpers

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
}

function makeInsertChain() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  };
}

function makeDeleteChain() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  };
}

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress random cleanup
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  it('allows first request', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ total: 0 }]));
    mockInsert.mockReturnValue(makeInsertChain());
    const { allowed } = await checkRateLimit('test-key-1', 3, 60);
    expect(allowed).toBe(true);
  });

  it('allows up to max requests', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ total: 2 }]));
    mockInsert.mockReturnValue(makeInsertChain());
    const { allowed } = await checkRateLimit('test-key-2', 3, 60);
    expect(allowed).toBe(true);
    expect(allowed).toBe(true);
  });

  it('blocks when limit exceeded', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([{ total: 3 }]))
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ ws: new Date().toISOString() }]),
      });
    const { allowed, retryAfter } = await checkRateLimit('test-key-3', 3, 60);
    expect(allowed).toBe(false);
    expect(retryAfter).toBeGreaterThan(0);
  });

  it('returns correct remaining count', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{ total: 1 }]));
    mockInsert.mockReturnValue(makeInsertChain());
    const { remaining } = await checkRateLimit('test-key-4', 5, 60);
    expect(remaining).toBe(3); // 5 - 1 - 1 (current attempt)
  });

  it('different keys are independent', async () => {
    // First key at limit
    mockSelect
      .mockReturnValueOnce(makeSelectChain([{ total: 3 }]))
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ ws: new Date().toISOString() }]),
      });
    const r1 = await checkRateLimit('key-full', 3, 60);
    expect(r1.allowed).toBe(false);

    // Second key empty
    mockSelect.mockReturnValue(makeSelectChain([{ total: 0 }]));
    mockInsert.mockReturnValue(makeInsertChain());
    const r2 = await checkRateLimit('key-empty', 3, 60);
    expect(r2.allowed).toBe(true);
  });
});

describe('getIp', () => {
  it('returns first IP from x-forwarded-for', () => {
    const req = { headers: { get: (k: string) => k === 'x-forwarded-for' ? '1.2.3.4, 5.6.7.8' : null } };
    expect(getIp(req)).toBe('1.2.3.4');
  });

  it('returns unknown when no header', () => {
    const req = { headers: { get: () => null } };
    expect(getIp(req)).toBe('unknown');
  });

  it('trims whitespace from IP', () => {
    const req = { headers: { get: () => '  9.9.9.9  , 8.8.8.8' } };
    expect(getIp(req)).toBe('9.9.9.9');
  });
});
