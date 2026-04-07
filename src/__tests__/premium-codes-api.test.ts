import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetParentSession = vi.fn();
vi.mock('@/lib/parent-auth', () => ({
  getParentSession: () => mockGetParentSession(),
}));

const mockIsAdminAuthenticated = vi.fn();
vi.mock('@/lib/admin-auth', () => ({
  isAdminAuthenticated: () => mockIsAdminAuthenticated(),
}));

const mockValidateCode = vi.fn();
const mockActivateCode = vi.fn();
const mockGetAllCodes = vi.fn();
const mockCreateCode = vi.fn();
const mockGetCodeById = vi.fn();
const mockUpdateCode = vi.fn();
const mockDeleteCode = vi.fn();
const mockGetCodeUsers = vi.fn();

vi.mock('@/lib/institution-codes', () => ({
  validateCode: (...args: unknown[]) => mockValidateCode(...args),
  activateCode: (...args: unknown[]) => mockActivateCode(...args),
  getAllCodes: () => mockGetAllCodes(),
  createCode: (...args: unknown[]) => mockCreateCode(...args),
  getCodeById: (...args: unknown[]) => mockGetCodeById(...args),
  updateCode: (...args: unknown[]) => mockUpdateCode(...args),
  deleteCode: (...args: unknown[]) => mockDeleteCode(...args),
  getCodeUsers: (...args: unknown[]) => mockGetCodeUsers(...args),
}));

const mockCheckPremiumStatus = vi.fn();
vi.mock('@/lib/premium', () => ({
  checkPremiumStatus: (...args: unknown[]) => mockCheckPremiumStatus(...args),
}));

const mockSubmitGrantRequest = vi.fn();
const mockGetAllGrantRequests = vi.fn();
const mockGetGrantRequestById = vi.fn();
const mockReviewGrantRequest = vi.fn();

vi.mock('@/lib/grant-requests', () => ({
  submitGrantRequest: (...args: unknown[]) => mockSubmitGrantRequest(...args),
  getAllGrantRequests: (...args: unknown[]) => mockGetAllGrantRequests(...args),
  getGrantRequestById: (...args: unknown[]) => mockGetGrantRequestById(...args),
  reviewGrantRequest: (...args: unknown[]) => mockReviewGrantRequest(...args),
}));

// ─── Import routes ──────────────────────────────────────────────────────────

const { POST: validateCodePost } = await import('@/app/api/premium/validate-code/route');
const { POST: activateCodePost } = await import('@/app/api/premium/activate-code/route');
const { GET: premiumStatusGet } = await import('@/app/api/premium/status/route');
const { POST: grantRequestPost } = await import('@/app/api/premium/grant-request/route');
const { GET: adminCodesGet, POST: adminCodesPost } = await import('@/app/api/admin/codes/route');
const { GET: adminGrantsGet } = await import('@/app/api/admin/grants/route');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeReq(body?: unknown, searchParams?: Record<string, string>) {
  const url = new URL('http://localhost:3000/api/test');
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
  }
  return {
    json: vi.fn().mockResolvedValue(body ?? {}),
    nextUrl: url,
  } as unknown as import('next/server').NextRequest;
}

// ─── Tests: POST /api/premium/validate-code ─────────────────────────────────

describe('POST /api/premium/validate-code', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 for empty code', async () => {
    mockGetParentSession.mockResolvedValue(null);
    const res = await validateCodePost(makeReq({ code: '' }));
    expect(res.status).toBe(400);
  });

  it('returns valid=false for invalid code', async () => {
    mockGetParentSession.mockResolvedValue(null);
    mockValidateCode.mockResolvedValue({ valid: false, error: 'CODE_NOT_FOUND' });
    const res = await validateCodePost(makeReq({ code: 'INVALID' }));
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.error).toBe('CODE_NOT_FOUND');
  });

  it('returns valid=true with institution info', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    mockValidateCode.mockResolvedValue({
      valid: true,
      code: { institutionName: 'مدرسة النور', maxUsers: 50, currentUsers: 10 },
    });
    const res = await validateCodePost(makeReq({ code: 'SCHOOL-2026' }));
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.institutionName).toBe('مدرسة النور');
    expect(data.remainingSlots).toBe(40);
  });
});

// ─── Tests: POST /api/premium/activate-code ─────────────────────────────────

describe('POST /api/premium/activate-code', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockGetParentSession.mockResolvedValue(null);
    const res = await activateCodePost(makeReq({ code: 'TEST' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for empty code', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    const res = await activateCodePost(makeReq({ code: '' }));
    expect(res.status).toBe(400);
  });

  it('activates code successfully', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    mockActivateCode.mockResolvedValue({
      success: true,
      expiresAt: '2026-05-15T00:00:00.000Z',
      institutionName: 'مدرسة النور',
    });
    const res = await activateCodePost(makeReq({ code: 'SCHOOL-2026' }));
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.institutionName).toBe('مدرسة النور');
    expect(mockActivateCode).toHaveBeenCalledWith('SCHOOL-2026', 'p1');
  });

  it('returns error when code activation fails', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    mockActivateCode.mockResolvedValue({ success: false, error: 'الكود ممتلئ (وصل الحد الأقصى)' });
    const res = await activateCodePost(makeReq({ code: 'FULL-CODE' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});

// ─── Tests: GET /api/premium/status ─────────────────────────────────────────

describe('GET /api/premium/status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockGetParentSession.mockResolvedValue(null);
    const res = await premiumStatusGet();
    expect(res.status).toBe(401);
  });

  it('returns premium status for authenticated user', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    mockCheckPremiumStatus.mockResolvedValue({
      isPremium: true,
      source: 'subscription',
      expiresAt: '2026-05-15T00:00:00.000Z',
      daysRemaining: 30,
    });
    const res = await premiumStatusGet();
    const data = await res.json();
    expect(data.isPremium).toBe(true);
    expect(data.source).toBe('subscription');
  });

  it('returns non-premium status', async () => {
    mockGetParentSession.mockResolvedValue({ parentId: 'p1', email: 'x@y.com' });
    mockCheckPremiumStatus.mockResolvedValue({
      isPremium: false,
      source: 'none',
      expiresAt: null,
      daysRemaining: null,
    });
    const res = await premiumStatusGet();
    const data = await res.json();
    expect(data.isPremium).toBe(false);
  });
});

// ─── Tests: POST /api/premium/grant-request ─────────────────────────────────

describe('POST /api/premium/grant-request', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 for missing fields', async () => {
    const res = await grantRequestPost(makeReq({ institutionName: 'test' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid student count', async () => {
    const res = await grantRequestPost(makeReq({
      institutionName: 'test',
      institutionType: 'school',
      studentCount: -1,
      contactName: 'أحمد',
      contactPhone: '0500000000',
      contactEmail: 'a@b.com',
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid institution type', async () => {
    const res = await grantRequestPost(makeReq({
      institutionName: 'test',
      institutionType: 'invalid_type',
      studentCount: 50,
      contactName: 'أحمد',
      contactPhone: '0500000000',
      contactEmail: 'a@b.com',
    }));
    expect(res.status).toBe(400);
  });

  it('submits grant request successfully', async () => {
    mockSubmitGrantRequest.mockResolvedValue({ requestNumber: 'GR-2026-0001' });
    const res = await grantRequestPost(makeReq({
      institutionName: 'مدرسة النور',
      institutionType: 'school',
      studentCount: 50,
      contactName: 'أحمد',
      contactPhone: '0500000000',
      contactEmail: 'admin@school.sa',
    }));
    const data = await res.json();
    expect(data.requestNumber).toBe('GR-2026-0001');
  });
});

// ─── Tests: Admin API - Codes ────────────────────────────────────────────────

describe('Admin /api/admin/codes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET returns 401 for non-admin', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(false);
    const res = await adminCodesGet();
    expect(res.status).toBe(401);
  });

  it('GET returns codes for admin', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(true);
    mockGetAllCodes.mockResolvedValue([{ id: 1, code: 'TEST' }]);
    const res = await adminCodesGet();
    const data = await res.json();
    expect(data.codes).toHaveLength(1);
  });

  it('POST returns 401 for non-admin', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(false);
    const res = await adminCodesPost(makeReq({ code: 'TEST' }));
    expect(res.status).toBe(401);
  });

  it('POST creates code for admin', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(true);
    mockCreateCode.mockResolvedValue({ id: 1, code: 'SCHOOL-2026' });
    const res = await adminCodesPost(makeReq({
      code: 'SCHOOL-2026',
      institutionName: 'مدرسة النور',
      institutionType: 'school',
      maxUsers: 50,
      durationDays: 30,
    }));
    const data = await res.json();
    expect(data.code.code).toBe('SCHOOL-2026');
  });

  it('POST returns 400 for missing fields', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(true);
    const res = await adminCodesPost(makeReq({ code: 'TEST' }));
    expect(res.status).toBe(400);
  });
});

// ─── Tests: Admin API - Grants ───────────────────────────────────────────────

describe('Admin /api/admin/grants', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET returns 401 for non-admin', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(false);
    const res = await adminGrantsGet(makeReq());
    expect(res.status).toBe(401);
  });

  it('GET returns grants for admin', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(true);
    mockGetAllGrantRequests.mockResolvedValue([{ id: 1, requestNumber: 'GR-2026-0001' }]);
    const res = await adminGrantsGet(makeReq());
    const data = await res.json();
    expect(data.requests).toHaveLength(1);
  });

  it('GET passes status filter', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(true);
    mockGetAllGrantRequests.mockResolvedValue([]);
    await adminGrantsGet(makeReq(undefined, { status: 'pending' }));
    expect(mockGetAllGrantRequests).toHaveBeenCalledWith('pending');
  });
});
