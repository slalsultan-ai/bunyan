import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockParent = vi.fn();
vi.mock('@/lib/parent-auth', () => ({
  getAuthenticatedParent: () => mockParent(),
}));

const mockHasFeature = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  hasFeatureAccess: (...args: unknown[]) => mockHasFeature(...args),
}));

const mockAll = vi.fn();
const mockRun = vi.fn();
vi.mock('@/lib/db', () => ({
  getDb: () => ({ all: mockAll, run: mockRun }),
}));

const { PUT } = await import('@/app/api/parent/goals/route');

const makeReq = (body: unknown) => ({ json: async () => body }) as never;
const PARENT = { id: 'parent-1', email: 'parent@example.com' };

describe('PUT /api/parent/goals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParent.mockResolvedValue(PARENT);
    mockHasFeature.mockResolvedValue(true);
  });

  it('returns 401 when unauthenticated', async () => {
    mockParent.mockResolvedValue(null);
    const res = await PUT(makeReq({ goalId: 5, status: 'achieved' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when the parent_dashboard_pro feature is disabled', async () => {
    mockHasFeature.mockResolvedValue(false);
    const res = await PUT(makeReq({ goalId: 5, status: 'achieved' }));
    expect(res.status).toBe(403);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('rejects a non-integer goal id', async () => {
    const res = await PUT(makeReq({ goalId: '5', status: 'achieved' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 and performs no update for a goal owned by another family', async () => {
    mockAll.mockResolvedValue([]); // ownership lookup finds nothing
    const res = await PUT(makeReq({ goalId: 5, status: 'achieved' }));
    expect(res.status).toBe(404);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('updates a goal that belongs to the authenticated parent', async () => {
    mockAll.mockResolvedValue([{ id: 5 }]);
    mockRun.mockResolvedValue(undefined);
    const res = await PUT(makeReq({ goalId: 5, status: 'achieved' }));
    expect(res.status).toBe(200);
    expect(mockRun).toHaveBeenCalledTimes(1);
  });
});
