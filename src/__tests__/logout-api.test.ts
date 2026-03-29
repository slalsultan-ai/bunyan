import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCookies = vi.fn();
vi.mock('next/headers', () => ({ cookies: mockCookies }));

const mockDelete = vi.fn();
vi.mock('@/lib/db', () => ({ getDb: () => ({ delete: mockDelete }) }));
vi.mock('@/lib/db/schema', () => ({ parentSessions: {} }));

const { POST } = await import('@/app/api/auth/logout/route');

function makeCookieStore(token?: string) {
  return {
    get: vi.fn().mockReturnValue(token ? { value: token } : undefined),
    delete: vi.fn(),
  };
}

describe('POST /api/auth/logout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns success even when no cookie is set', async () => {
    mockCookies.mockResolvedValue(makeCookieStore());
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes session and clears cookie when token present', async () => {
    const store = makeCookieStore('my-session-token');
    mockCookies.mockResolvedValue(store);
    mockDelete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });

    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledOnce();
    expect(store.delete).toHaveBeenCalledWith('parent_token');
  });
});
