import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSeedWeeklyContent = vi.fn().mockResolvedValue({ inserted: 0, skipped: 24 });
const mockGetWeeklyContent = vi.fn();
vi.mock('@/lib/db/seed-weekly-content', () => ({
  seedWeeklyContent: mockSeedWeeklyContent,
  getWeeklyContent: mockGetWeeklyContent,
}));

const mockSendWeeklyEmail = vi.fn();
vi.mock('@/lib/email/weekly', () => ({ sendWeeklyEmail: mockSendWeeklyEmail }));

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
vi.mock('@/lib/db', () => ({ getDb: () => ({ select: mockSelect, insert: mockInsert, update: mockUpdate }) }));
vi.mock('@/lib/db/schema', () => ({ parents: {}, children: {}, emailLog: {} }));

const { POST, GET } = await import('@/app/api/cron/weekly-email/route');

function makeReq(authHeader?: string) {
  return {
    headers: { get: (k: string) => k === 'authorization' ? (authHeader ?? null) : null },
  } as unknown as import('next/server').NextRequest;
}

function makeSelectChainDirect(result: unknown[]) {
  return { from: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(result) };
}
function makeInsertChain() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}
function makeUpdateChain() {
  return { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
}

const VALID_SECRET = `Bearer ${process.env.CRON_SECRET ?? 'bunyan_cron_secret_change_in_production'}`;

describe('POST /api/cron/weekly-email', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 for missing auth header', async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong secret', async () => {
    const res = await POST(makeReq('Bearer wrong-secret'));
    expect(res.status).toBe(401);
  });

  it('returns success with no parents', async () => {
    process.env.CRON_SECRET = 'test-secret';
    mockSelect.mockReturnValue(makeSelectChainDirect([]));
    const res = await POST(makeReq('Bearer test-secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sent).toBe(0);
  });

  it('skips parents beyond week 8', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const parentsPastLimit = [
      { id: 'p1', email: 'x@y.com', currentWeekNumber: 9, weeklyEmailEnabled: true, unsubscribeToken: 'tok' },
    ];
    mockSelect.mockReturnValue(makeSelectChainDirect(parentsPastLimit));
    const res = await POST(makeReq('Bearer test-secret'));
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.sent).toBe(0);
  });

  it('skips parents with no children', async () => {
    process.env.CRON_SECRET = 'test-secret';
    mockSelect
      .mockReturnValueOnce(makeSelectChainDirect([
        { id: 'p1', email: 'x@y.com', currentWeekNumber: 1, weeklyEmailEnabled: true, unsubscribeToken: 'tok' },
      ]))
      .mockReturnValueOnce(makeSelectChainDirect([])); // no children
    const res = await POST(makeReq('Bearer test-secret'));
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(mockSendWeeklyEmail).not.toHaveBeenCalled();
  });

  it('sends email and advances week counter on success', async () => {
    process.env.CRON_SECRET = 'test-secret';
    mockSelect
      .mockReturnValueOnce(makeSelectChainDirect([
        { id: 'p1', email: 'parent@test.com', currentWeekNumber: 2, weeklyEmailEnabled: true, unsubscribeToken: 'unsub-tok' },
      ]))
      .mockReturnValueOnce(makeSelectChainDirect([
        { id: 'c1', name: 'محمد', age: 8, ageGroup: '6-9', parentId: 'p1' },
      ]));

    mockGetWeeklyContent.mockResolvedValue({ weekNumber: 2, ageGroup: '6-9', weeklyGame: { title: 'test' }, weeklyTip: { title: 't', content: 'c' } });
    mockSendWeeklyEmail.mockResolvedValue('resend-id-123');
    mockInsert.mockReturnValue(makeInsertChain());
    mockUpdate.mockReturnValue(makeUpdateChain());

    const res = await POST(makeReq('Bearer test-secret'));
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.failed).toBe(0);
    expect(mockSendWeeklyEmail).toHaveBeenCalledOnce();
    expect(mockUpdate).toHaveBeenCalledOnce(); // advance week
  });

  it('records failure and continues on send error', async () => {
    process.env.CRON_SECRET = 'test-secret';
    mockSelect
      .mockReturnValueOnce(makeSelectChainDirect([
        { id: 'p1', email: 'bad@test.com', currentWeekNumber: 1, weeklyEmailEnabled: true, unsubscribeToken: 'tok' },
      ]))
      .mockReturnValueOnce(makeSelectChainDirect([
        { id: 'c1', name: 'هند', age: 6, ageGroup: '6-9', parentId: 'p1' },
      ]));

    mockGetWeeklyContent.mockResolvedValue({ weekNumber: 1, ageGroup: '6-9', weeklyGame: {}, weeklyTip: {} });
    mockSendWeeklyEmail.mockRejectedValue(new Error('SMTP error'));
    mockInsert.mockReturnValue(makeInsertChain());

    const res = await POST(makeReq('Bearer test-secret'));
    const body = await res.json();
    expect(body.failed).toBe(1);
    expect(body.sent).toBe(0);
    expect(mockInsert).toHaveBeenCalledOnce(); // failure logged
  });

  it('GET route delegates to POST', async () => {
    process.env.CRON_SECRET = 'test-secret';
    mockSelect.mockReturnValue(makeSelectChainDirect([]));
    const res = await GET(makeReq('Bearer test-secret'));
    expect(res.status).toBe(200);
  });
});
