import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetParentSession = vi.fn();
vi.mock('@/lib/parent-auth', () => ({
  getParentSession: mockGetParentSession,
  computeAgeGroup: (age: number) => age <= 5 ? '4-5' : age <= 9 ? '6-9' : '10-12',
}));

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
vi.mock('@/lib/db', () => ({ getDb: () => ({ select: mockSelect, update: mockUpdate }) }));
vi.mock('@/lib/db/schema', () => ({ children: {} }));

const { PUT } = await import('@/app/api/children/[id]/route');

function makeReq(body: unknown) {
  return { json: vi.fn().mockResolvedValue(body) } as unknown as import('next/server').NextRequest;
}
function makeSelectChain(result: unknown[]) {
  return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue(result) };
}
function makeUpdateChain(returned: unknown) {
  return { set: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([returned]) };
}

const SESSION = { parentId: 'p1', email: 'x@y.com' };
const CHILD = { id: 'c1', name: 'ليلى', age: 7, ageGroup: '6-9', parentId: 'p1' };

describe('PUT /api/children/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockGetParentSession.mockResolvedValue(null);
    const res = await PUT(makeReq({ name: 'جديد' }), { params: Promise.resolve({ id: 'c1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when child not found or not owned', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    mockSelect.mockReturnValue(makeSelectChain([]));
    const res = await PUT(makeReq({ name: 'جديد' }), { params: Promise.resolve({ id: 'c99' }) });
    expect(res.status).toBe(404);
  });

  it('returns 400 when no valid updates provided', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    mockSelect.mockReturnValue(makeSelectChain([CHILD]));
    const res = await PUT(makeReq({}), { params: Promise.resolve({ id: 'c1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 400 for age out of range', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    mockSelect.mockReturnValue(makeSelectChain([CHILD]));
    // age 2 is out of range, name is empty → no valid updates
    const res = await PUT(makeReq({ age: 2 }), { params: Promise.resolve({ id: 'c1' }) });
    expect(res.status).toBe(400);
  });

  it('updates name only', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    mockSelect.mockReturnValue(makeSelectChain([CHILD]));
    const updated = { ...CHILD, name: 'ليلى الجديدة' };
    mockUpdate.mockReturnValue(makeUpdateChain(updated));

    const res = await PUT(makeReq({ name: 'ليلى الجديدة' }), { params: Promise.resolve({ id: 'c1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.child.name).toBe('ليلى الجديدة');
  });

  it('updates age and recalculates ageGroup', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    mockSelect.mockReturnValue(makeSelectChain([CHILD]));
    const updated = { ...CHILD, age: 11, ageGroup: '10-12' };
    mockUpdate.mockReturnValue(makeUpdateChain(updated));

    const res = await PUT(makeReq({ age: 11 }), { params: Promise.resolve({ id: 'c1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.child.ageGroup).toBe('10-12');
  });

  it('updates both name and age together', async () => {
    mockGetParentSession.mockResolvedValue(SESSION);
    mockSelect.mockReturnValue(makeSelectChain([CHILD]));
    const updated = { ...CHILD, name: 'ريم', age: 4, ageGroup: '4-5' };
    mockUpdate.mockReturnValue(makeUpdateChain(updated));

    const res = await PUT(makeReq({ name: 'ريم', age: 4 }), { params: Promise.resolve({ id: 'c1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.child.name).toBe('ريم');
    expect(body.child.ageGroup).toBe('4-5');
  });
});
