import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCookies = vi.fn();
vi.mock('next/headers', () => ({ cookies: mockCookies }));

const mockInvalidate = vi.fn();
vi.mock('@/lib/parent-auth', () => ({ invalidateParentSession: mockInvalidate }));

const { POST } = await import('@/app/api/auth/logout/route');

function makeCookieStore(token?: string) {
  return {
    get: vi.fn().mockReturnValue(token ? { value: token } : undefined),
    delete: vi.fn(),
  };
}

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvalidate.mockResolvedValue(undefined);
  });

  it('returns success even when no cookie is set', async () => {
    mockCookies.mockResolvedValue(makeCookieStore());
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('revokes the server-side session and clears the cookie when a token is present', async () => {
    const store = makeCookieStore('my-session-token');
    mockCookies.mockResolvedValue(store);

    const res = await POST();

    expect(res.status).toBe(200);
    // Must delegate to the helper that hashes the token. Passing the raw cookie
    // value straight to the DB was the bug that made logout a no-op.
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
    expect(mockInvalidate).toHaveBeenCalledWith('my-session-token');
    expect(store.delete).toHaveBeenCalledWith('parent_token');
  });
});
