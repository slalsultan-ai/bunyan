import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetParentSession = vi.fn();
vi.mock('@/lib/parent-auth', () => ({
  getParentSession: () => mockGetParentSession(),
}));

const mockGetUserFeatures = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  getUserFeatures: (email: string | null) => mockGetUserFeatures(email),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

const { GET } = await import('@/app/api/features/route');

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/features', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns features for authenticated user', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'test@test.com' });
    mockGetUserFeatures.mockResolvedValue({ child_pdf_report: true, review_mode: false });

    const res = await GET();
    const data = await res.json();

    expect(mockGetUserFeatures).toHaveBeenCalledWith('test@test.com');
    expect(data).toEqual({ child_pdf_report: true, review_mode: false });
  });

  it('returns features for visitor (no session)', async () => {
    mockGetParentSession.mockResolvedValue(null);
    mockGetUserFeatures.mockResolvedValue({ child_pdf_report: false, review_mode: false });

    const res = await GET();
    const data = await res.json();

    expect(mockGetUserFeatures).toHaveBeenCalledWith(null);
    expect(data).toEqual({ child_pdf_report: false, review_mode: false });
  });
});
