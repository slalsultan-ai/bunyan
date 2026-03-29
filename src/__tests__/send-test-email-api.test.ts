import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockIsAdminAuthenticated = vi.fn();
vi.mock('@/lib/admin-auth', () => ({
  isAdminAuthenticated: mockIsAdminAuthenticated,
}));

const mockSendWeeklyEmail = vi.fn();
vi.mock('@/lib/email/weekly', () => ({
  sendWeeklyEmail: mockSendWeeklyEmail,
}));

const mockGetWeeklyContent = vi.fn();
const mockSeedWeeklyContent = vi.fn();
vi.mock('@/lib/db/seed-weekly-content', () => ({
  getWeeklyContent: mockGetWeeklyContent,
  seedWeeklyContent: mockSeedWeeklyContent,
}));

// ─── Import route ─────────────────────────────────────────────────────────────

const { POST } = await import('@/app/api/admin/send-test-email/route');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body: unknown) {
  return { json: vi.fn().mockResolvedValue(body) } as unknown as import('next/server').NextRequest;
}

const SAMPLE_CONTENT = {
  weekNumber: 1,
  ageGroup: '6-9',
  quantitativeQuestion: { question: 'س', explanation: 'ش' },
  verbalQuestion: { question: 'س', explanation: 'ش' },
  weeklyGame: { title: 'ل', description: 'و', howToPlay: 'ط' },
  weeklyTip: { title: 'ن', content: 'م' },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/admin/send-test-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdminAuthenticated.mockResolvedValue(true);
    mockGetWeeklyContent.mockResolvedValue(SAMPLE_CONTENT);
    mockSendWeeklyEmail.mockResolvedValue('email-id-123');
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when not authenticated', async () => {
    mockIsAdminAuthenticated.mockResolvedValue(false);
    const res = await POST(makeReq({ email: 'a@b.com', weekNumber: 1, ageGroup: '6-9' }));
    expect(res.status).toBe(401);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 for invalid email', async () => {
    const res = await POST(makeReq({ email: 'not-an-email', weekNumber: 1, ageGroup: '6-9' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('البريد');
  });

  it('returns 400 for missing email', async () => {
    const res = await POST(makeReq({ weekNumber: 1, ageGroup: '6-9' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for weekNumber < 1', async () => {
    const res = await POST(makeReq({ email: 'a@b.com', weekNumber: 0, ageGroup: '6-9' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('الأسبوع');
  });

  it('returns 400 for weekNumber > 8', async () => {
    const res = await POST(makeReq({ email: 'a@b.com', weekNumber: 9, ageGroup: '6-9' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid ageGroup', async () => {
    const res = await POST(makeReq({ email: 'a@b.com', weekNumber: 1, ageGroup: '13-15' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('الفئة العمرية');
  });

  it('returns 400 for malformed JSON body', async () => {
    const req = { json: vi.fn().mockRejectedValue(new Error('parse error')) } as unknown as import('next/server').NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ── Missing content ───────────────────────────────────────────────────────

  it('returns 404 when content not found even after seeding', async () => {
    mockGetWeeklyContent.mockResolvedValue(null);
    mockSeedWeeklyContent.mockResolvedValue({ inserted: 0, skipped: 24 });
    const res = await POST(makeReq({ email: 'a@b.com', weekNumber: 3, ageGroup: '4-5' }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('محتوى');
  });

  it('seeds content and succeeds if first getWeeklyContent returns null but seeded returns content', async () => {
    // First call returns null, second (after seed) returns content
    mockGetWeeklyContent
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(SAMPLE_CONTENT);
    mockSeedWeeklyContent.mockResolvedValue({ inserted: 24, skipped: 0 });
    mockSendWeeklyEmail.mockResolvedValue('email-after-seed');

    const res = await POST(makeReq({ email: 'a@b.com', weekNumber: 1, ageGroup: '6-9' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('returns 200 with emailId on success', async () => {
    const res = await POST(makeReq({ email: 'test@example.com', weekNumber: 1, ageGroup: '6-9' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.emailId).toBe('email-id-123');
  });

  it('calls sendWeeklyEmail with correct arguments', async () => {
    await POST(makeReq({ email: 'admin@test.com', weekNumber: 3, ageGroup: '10-12' }));
    expect(mockSendWeeklyEmail).toHaveBeenCalledOnce();
    const [toEmail, weekNumber, children, unsubToken] = mockSendWeeklyEmail.mock.calls[0];
    expect(toEmail).toBe('admin@test.com');
    expect(weekNumber).toBe(3);
    expect(children[0].ageGroup).toBe('10-12');
    expect(children[0].name).toBeTruthy();
    expect(typeof unsubToken).toBe('string');
  });

  it('trims and lowercases the email', async () => {
    await POST(makeReq({ email: '  Test@EXAMPLE.COM  ', weekNumber: 1, ageGroup: '6-9' }));
    const [toEmail] = mockSendWeeklyEmail.mock.calls[0];
    expect(toEmail).toBe('test@example.com');
  });

  it('defaults weekNumber to 1 when not provided', async () => {
    await POST(makeReq({ email: 'a@b.com', ageGroup: '6-9' }));
    const [, weekNumber] = mockSendWeeklyEmail.mock.calls[0];
    expect(weekNumber).toBe(1);
  });

  it('defaults ageGroup to 6-9 when not provided', async () => {
    await POST(makeReq({ email: 'a@b.com', weekNumber: 2 }));
    const [, , children] = mockSendWeeklyEmail.mock.calls[0];
    expect(children[0].ageGroup).toBe('6-9');
  });

  it('accepts all valid age groups: 4-5, 6-9, 10-12', async () => {
    for (const ag of ['4-5', '6-9', '10-12'] as const) {
      vi.clearAllMocks();
      mockIsAdminAuthenticated.mockResolvedValue(true);
      mockGetWeeklyContent.mockResolvedValue(SAMPLE_CONTENT);
      mockSendWeeklyEmail.mockResolvedValue('ok');
      const res = await POST(makeReq({ email: 'a@b.com', weekNumber: 1, ageGroup: ag }));
      expect(res.status).toBe(200);
    }
  });

  it('accepts all valid week numbers 1–8', async () => {
    for (let w = 1; w <= 8; w++) {
      vi.clearAllMocks();
      mockIsAdminAuthenticated.mockResolvedValue(true);
      mockGetWeeklyContent.mockResolvedValue(SAMPLE_CONTENT);
      mockSendWeeklyEmail.mockResolvedValue('ok');
      const res = await POST(makeReq({ email: 'a@b.com', weekNumber: w, ageGroup: '6-9' }));
      expect(res.status).toBe(200);
    }
  });

  // ── Email send failure ────────────────────────────────────────────────────

  it('returns 500 when sendWeeklyEmail throws', async () => {
    mockSendWeeklyEmail.mockRejectedValue(new Error('Resend API error'));
    const res = await POST(makeReq({ email: 'a@b.com', weekNumber: 1, ageGroup: '6-9' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});
