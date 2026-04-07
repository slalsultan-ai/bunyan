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
    title: 'title',
    description: 'description',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ type: 'eq', a, b })),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      type: 'sql',
      strings,
      values,
    }),
    { raw: vi.fn() }
  ),
}));

const { getAllFlags, updateFlag } = await import('@/lib/feature-flags');

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

// ─── getAllFlags ─────────────────────────────────────────────────────────────

describe('getAllFlags', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns mapped FeatureFlag[] from DB rows', async () => {
    const rows = [
      makeFlagRow({ id: 1, flagKey: 'flag_a', title: 'Flag A', description: 'Desc A', enabled: 1, allowedEmails: 'a@b.com', createdAt: '2026-01-01', updatedAt: '2026-02-01' }),
      makeFlagRow({ id: 2, flagKey: 'flag_b', title: 'Flag B', description: null, enabled: 0, allowedEmails: '', createdAt: '2026-03-01', updatedAt: '2026-03-15' }),
    ];

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(rows),
      }),
    });

    const result = await getAllFlags();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 1,
      flagKey: 'flag_a',
      title: 'Flag A',
      description: 'Desc A',
      enabled: true,
      allowedEmails: 'a@b.com',
      createdAt: '2026-01-01',
      updatedAt: '2026-02-01',
    });
    expect(result[1]).toEqual({
      id: 2,
      flagKey: 'flag_b',
      title: 'Flag B',
      description: null,
      enabled: false,
      allowedEmails: '',
      createdAt: '2026-03-01',
      updatedAt: '2026-03-15',
    });
  });

  it('returns empty array when no flags exist', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await getAllFlags();
    expect(result).toEqual([]);
  });

  it('maps null allowedEmails to empty string', async () => {
    const rows = [makeFlagRow({ allowedEmails: null })];
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(rows),
      }),
    });

    const result = await getAllFlags();
    expect(result[0].allowedEmails).toBe('');
  });

  it('maps null timestamps to empty string', async () => {
    const rows = [makeFlagRow({ createdAt: null as unknown as string, updatedAt: null as unknown as string })];
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(rows),
      }),
    });

    const result = await getAllFlags();
    expect(result[0].createdAt).toBe('');
    expect(result[0].updatedAt).toBe('');
  });
});

// ─── updateFlag ─────────────────────────────────────────────────────────────

describe('updateFlag', () => {
  beforeEach(() => vi.clearAllMocks());

  function setupUpdateChain() {
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });
    return { mockSet, mockWhere };
  }

  it('enables a flag (enabled: true -> 1)', async () => {
    const { mockSet } = setupUpdateChain();

    await updateFlag('test', { enabled: true });

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: 1 })
    );
  });

  it('disables a flag (enabled: false -> 0)', async () => {
    const { mockSet } = setupUpdateChain();

    await updateFlag('test', { enabled: false });

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: 0 })
    );
  });

  it('updates allowed_emails', async () => {
    const { mockSet } = setupUpdateChain();

    await updateFlag('test', { allowed_emails: 'a@b.com' });

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ allowedEmails: 'a@b.com' })
    );
  });

  it('updates both enabled and allowed_emails at once', async () => {
    const { mockSet } = setupUpdateChain();

    await updateFlag('test', { enabled: false, allowed_emails: 'x@y.com' });

    const setArg = mockSet.mock.calls[0][0];
    expect(setArg.enabled).toBe(0);
    expect(setArg.allowedEmails).toBe('x@y.com');
  });

  it('always includes updatedAt in set values', async () => {
    const { mockSet } = setupUpdateChain();

    await updateFlag('test', { enabled: true });

    const setArg = mockSet.mock.calls[0][0];
    expect(setArg.updatedAt).toBeDefined();
  });

  it('does not include enabled key when not provided', async () => {
    const { mockSet } = setupUpdateChain();

    await updateFlag('test', { allowed_emails: 'z@w.com' });

    const setArg = mockSet.mock.calls[0][0];
    expect(setArg).not.toHaveProperty('enabled');
    expect(setArg.allowedEmails).toBe('z@w.com');
  });

  it('does not include allowedEmails key when not provided', async () => {
    const { mockSet } = setupUpdateChain();

    await updateFlag('test', { enabled: true });

    const setArg = mockSet.mock.calls[0][0];
    expect(setArg).not.toHaveProperty('allowedEmails');
    expect(setArg.enabled).toBe(1);
  });
});
