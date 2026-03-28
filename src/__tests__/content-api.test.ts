import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockIsAdminAuthenticated = vi.fn();
vi.mock('@/lib/admin-auth', () => ({
  isAdminAuthenticated: mockIsAdminAuthenticated,
}));

const mockGetHeroContent = vi.fn();
const mockGetFaqContent = vi.fn();
const mockSetContent = vi.fn();
vi.mock('@/lib/content', () => ({
  getHeroContent: mockGetHeroContent,
  getFaqContent: mockGetFaqContent,
  setContent: mockSetContent,
  DEFAULT_HERO: {},
  DEFAULT_FAQ: [],
}));

const mockRevalidateTag = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag: mockRevalidateTag }));

const { GET, PATCH } = await import('@/app/api/admin/content/route');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(body?: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Request;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/admin/content', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns hero and faq when authenticated', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(true);
    mockGetHeroContent.mockResolvedValue({ title: 'test' });
    mockGetFaqContent.mockResolvedValue([{ q: 'س؟', a: 'ج.' }]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hero).toEqual({ title: 'test' });
    expect(data.faq).toEqual([{ q: 'س؟', a: 'ج.' }]);
  });
});

describe('PATCH /api/admin/content', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(false);
    const res = await PATCH(makeRequest({ key: 'hero', value: {} }) as never);
    expect(res.status).toBe(401);
  });

  it('returns 400 when key is missing', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(true);
    const res = await PATCH(makeRequest({ value: {} }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid key', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(true);
    const res = await PATCH(makeRequest({ key: 'unknown', value: {} }) as never);
    expect(res.status).toBe(400);
  });

  it('saves content and revalidates cache', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(true);
    mockSetContent.mockResolvedValue(undefined);

    const heroValue = { badge: 'test' };
    const res = await PATCH(makeRequest({ key: 'hero', value: heroValue }) as never);

    expect(res.status).toBe(200);
    expect(mockSetContent).toHaveBeenCalledWith('hero', heroValue);
    expect(mockRevalidateTag).toHaveBeenCalledWith('site-content');
  });

  it('accepts faq key', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(true);
    mockSetContent.mockResolvedValue(undefined);

    const faqValue = [{ q: 'س؟', a: 'ج.' }];
    const res = await PATCH(makeRequest({ key: 'faq', value: faqValue }) as never);

    expect(res.status).toBe(200);
    expect(mockSetContent).toHaveBeenCalledWith('faq', faqValue);
  });
});
