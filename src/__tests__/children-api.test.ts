import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetParentSession = vi.fn();
vi.mock('@/lib/parent-auth', () => ({
  getParentSession: mockGetParentSession,
  computeAgeGroup: (age: number) => age <= 5 ? '4-5' : age <= 9 ? '6-9' : '10-12',
}));

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect, insert: mockInsert, delete: mockDelete, update: mockUpdate }),
}));

vi.mock('@/lib/db/schema', () => ({ children: {}, parents: {} }));

const { GET, POST } = await import('@/app/api/children/route');
const { PUT, DELETE } = await import('@/app/api/children/[id]/route');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(body?: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body ?? {}),
  } as unknown as import('next/server').NextRequest;
}

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    // For plain .where() (no limit) calls:
    then: undefined as never,
  };
}

// Overloaded select mock that resolves directly for queries without limit
function makeSelectChainDirect(result: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

function makeInsertChain(returned: unknown) {
  return { values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([returned]) };
}

function makeDeleteChain() {
  return { where: vi.fn().mockResolvedValue(undefined) };
}

function makeUpdateChain(returned: unknown) {
  return { set: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([returned]) };
}

// ─── GET /api/children ───────────────────────────────────────────────────────

describe('GET /api/children', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockGetParentSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns children for authenticated parent', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    mockSelect.mockReturnValue(makeSelectChainDirect([
      { id: 'c1', name: 'أحمد', age: 8, ageGroup: '6-9' },
    ]));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.children).toHaveLength(1);
    expect(body.children[0].name).toBe('أحمد');
  });
});

// ─── POST /api/children ──────────────────────────────────────────────────────

describe('POST /api/children', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockGetParentSession.mockResolvedValue(null);
    const res = await POST(makeReq({ name: 'سارة', age: 7 }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing name', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    mockSelect.mockReturnValue(makeSelectChainDirect([]));
    const res = await POST(makeReq({ age: 7 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for age below 4', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    mockSelect.mockReturnValue(makeSelectChainDirect([]));
    const res = await POST(makeReq({ name: 'سارة', age: 3 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for age above 12', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    mockSelect.mockReturnValue(makeSelectChainDirect([]));
    const res = await POST(makeReq({ name: 'سارة', age: 13 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when parent already has 10 children', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    const tenChildren = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    mockSelect.mockReturnValue(makeSelectChainDirect(tenChildren));
    const res = await POST(makeReq({ name: 'طفل جديد', age: 8 }));
    expect(res.status).toBe(400);
  });

  it('creates child with correct ageGroup', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    mockSelect.mockReturnValue(makeSelectChainDirect([]));
    const newChild = { id: 'c1', name: 'خالد', age: 11, ageGroup: '10-12', parentId: 'p1' };
    mockInsert.mockReturnValue(makeInsertChain(newChild));

    const res = await POST(makeReq({ name: 'خالد', age: 11 }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.child.ageGroup).toBe('10-12');
  });
});

// ─── DELETE /api/children/[id] ───────────────────────────────────────────────

describe('DELETE /api/children/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockGetParentSession.mockResolvedValue(null);
    const res = await DELETE(makeReq(), { params: Promise.resolve({ id: 'c1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when child not found or not owned', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });
    const res = await DELETE(makeReq(), { params: Promise.resolve({ id: 'other-child' }) });
    expect(res.status).toBe(404);
  });

  it('deletes child and returns success', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'c1', name: 'سارة', parentId: 'p1' }]),
    });
    mockDelete.mockReturnValue(makeDeleteChain());
    const res = await DELETE(makeReq(), { params: Promise.resolve({ id: 'c1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledOnce();
  });
});
