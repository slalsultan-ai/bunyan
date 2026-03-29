import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetParentSession = vi.fn();
vi.mock('@/lib/parent-auth', () => ({ getParentSession: mockGetParentSession }));

const mockSelect = vi.fn();
vi.mock('@/lib/db', () => ({ getDb: () => ({ select: mockSelect }) }));
vi.mock('@/lib/db/schema', () => ({ parents: {}, children: {} }));

const { GET } = await import('@/app/api/auth/me/route');

function makeSelectChainDirect(result: unknown[]) {
  return { from: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(result) };
}
function makeSelectChainLimit(result: unknown[]) {
  return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue(result) };
}

describe('GET /api/auth/me', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns parent=null when not authenticated', async () => {
    mockGetParentSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.parent).toBeNull();
    expect(body.children).toEqual([]);
  });

  it('returns parent=null when session exists but parent missing from DB', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    mockSelect
      .mockReturnValueOnce(makeSelectChainLimit([]))  // parent not found
    const res = await GET();
    const body = await res.json();
    expect(body.parent).toBeNull();
  });

  it('returns parent data and children list', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    const parentRow = { id: 'p1', email: 'x@y.com', city: 'الرياض', weeklyEmailEnabled: true, currentWeekNumber: 3 };
    const childRows = [
      { id: 'c1', name: 'أحمد', age: 8, ageGroup: '6-9' },
      { id: 'c2', name: 'سارة', age: 5, ageGroup: '4-5' },
    ];
    mockSelect
      .mockReturnValueOnce(makeSelectChainLimit([parentRow]))
      .mockReturnValueOnce(makeSelectChainDirect(childRows));

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.parent.email).toBe('x@y.com');
    expect(body.parent.city).toBe('الرياض');
    expect(body.children).toHaveLength(2);
    expect(body.children[0].name).toBe('أحمد');
  });

  it('does not expose weeklyEmailEnabled raw value', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    const parentRow = { id: 'p1', email: 'x@y.com', city: null, weeklyEmailEnabled: false, currentWeekNumber: 1 };
    mockSelect
      .mockReturnValueOnce(makeSelectChainLimit([parentRow]))
      .mockReturnValueOnce(makeSelectChainDirect([]));
    const res = await GET();
    const body = await res.json();
    expect(body.parent).not.toHaveProperty('unsubscribeToken');
    expect(body.parent.weeklyEmailEnabled).toBe(false);
  });
});
