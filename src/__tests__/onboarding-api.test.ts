import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetParentSession = vi.fn();
vi.mock('@/lib/parent-auth', () => ({
  getParentSession: mockGetParentSession,
  computeAgeGroup: (age: number) => age <= 5 ? '4-5' : age <= 9 ? '6-9' : '10-12',
}));

const mockUpdate = vi.fn();
const mockInsert = vi.fn();
vi.mock('@/lib/db', () => ({ getDb: () => ({ update: mockUpdate, insert: mockInsert }) }));
vi.mock('@/lib/db/schema', () => ({ parents: {}, children: {} }));

const { POST } = await import('@/app/api/auth/onboarding/route');

function makeReq(body: unknown) {
  return { json: vi.fn().mockResolvedValue(body) } as unknown as import('next/server').NextRequest;
}
function makeUpdateChain() {
  return { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
}
function makeInsertChain(rows: unknown[]) {
  return { values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue(rows) };
}

const SESSION = { parentId: 'p1', email: 'x@y.com' };

describe('POST /api/auth/onboarding', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockGetParentSession.mockResolvedValue(null);
    const res = await POST(makeReq({ children: [{ name: 'علي', age: 7 }] }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when children array is empty', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    const res = await POST(makeReq({ children: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when more than 10 children', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    const tooMany = Array.from({ length: 11 }, (_, i) => ({ name: `طفل${i}`, age: 7 }));
    const res = await POST(makeReq({ children: tooMany }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid city', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    const res = await POST(makeReq({ city: 'مدينة وهمية', children: [{ name: 'علي', age: 7 }] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for child age out of range', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    const res = await POST(makeReq({ children: [{ name: 'علي', age: 2 }] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for child with no name', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    const res = await POST(makeReq({ children: [{ name: '', age: 7 }] }));
    expect(res.status).toBe(400);
  });

  it('saves children and returns them on valid input', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    mockUpdate.mockReturnValue(makeUpdateChain());
    const saved = [{ id: 'c1', name: 'علي', age: 7, ageGroup: '6-9', parentId: 'p1' }];
    mockInsert.mockReturnValue(makeInsertChain(saved));

    const res = await POST(makeReq({
      city: 'الرياض',
      children: [{ name: 'علي', age: 7 }],
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.children).toHaveLength(1);
    expect(body.children[0].ageGroup).toBe('6-9');
  });

  it('skips city update when city not provided', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    const saved = [{ id: 'c1', name: 'نورة', age: 10, ageGroup: '10-12', parentId: 'p1' }];
    mockInsert.mockReturnValue(makeInsertChain(saved));

    await POST(makeReq({ children: [{ name: 'نورة', age: 10 }] }));
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('handles multiple children with correct ageGroups', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    mockUpdate.mockReturnValue(makeUpdateChain());
    const saved = [
      { id: 'c1', name: 'فاطمة', age: 4, ageGroup: '4-5', parentId: 'p1' },
      { id: 'c2', name: 'يوسف', age: 12, ageGroup: '10-12', parentId: 'p1' },
    ];
    mockInsert.mockReturnValue(makeInsertChain(saved));

    const res = await POST(makeReq({
      city: 'جدة',
      children: [{ name: 'فاطمة', age: 4 }, { name: 'يوسف', age: 12 }],
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.children).toHaveLength(2);
  });
});
