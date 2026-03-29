import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Resend as a class ───────────────────────────────────────────────────

const mockSend = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

// ─── Mock PDF generator (avoids real font fetching in tests) ──────────────────

vi.mock('@/lib/email/pdf', () => ({
  generateWeeklyPdf: vi.fn().mockResolvedValue(Buffer.from('fake-pdf-content')),
}));

// ─── Mock DB ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({ getDb: () => ({}) }));
vi.mock('@/lib/db/schema', () => ({ weeklyEmailContent: {} }));

// ─── Import modules under test ────────────────────────────────────────────────

const { sendWeeklyEmail } = await import('@/lib/email/weekly');

// ─── Test data ────────────────────────────────────────────────────────────────

const SAMPLE_CONTENT = {
  weekNumber: 3,
  ageGroup: '6-9' as const,
  quantitativeQuestion: {
    question: 'ما هو مكعب العدد ٢؟',
    options: ['٤', '٦', '٨', '١٠'],
    correctIndex: 2,
    explanation: '٢ × ٢ × ٢ = ٨',
  },
  verbalQuestion: {
    question: 'ما معنى كلمة "سريع"؟',
    options: ['بطيء', 'قوي', 'خفيف', 'سريع الحركة'],
    correctIndex: 3,
    explanation: 'سريع تعني سريع الحركة.',
  },
  weeklyGame: {
    title: 'لعبة الحساب السريع',
    description: 'اختبر سرعة حساب طفلك.',
    howToPlay: 'اعطه ١٠ أسئلة جمع في ٣٠ ثانية.',
  },
  weeklyTip: {
    title: 'التكرار يبني المهارة',
    content: 'خصص ١٠ دقائق يومياً للتدريب.',
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('sendWeeklyEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });
  });

  // ── Core behaviour ────────────────────────────────────────────────────────

  it('returns the Resend email ID on success', async () => {
    const id = await sendWeeklyEmail(
      'parent@example.com',
      3,
      [{ name: 'أحمد', age: 7, ageGroup: '6-9', content: SAMPLE_CONTENT }],
      'unsub-token-abc'
    );
    expect(id).toBe('email-123');
  });

  it('throws when no child has content', async () => {
    await expect(
      sendWeeklyEmail(
        'parent@example.com',
        3,
        [{ name: 'أحمد', age: 7, ageGroup: '6-9', content: null }],
        'unsub-token-abc'
      )
    ).rejects.toThrow('No content to send');
  });

  it('throws when Resend returns an error object', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } });
    await expect(
      sendWeeklyEmail(
        'p@e.com',
        1,
        [{ name: 'فهد', age: 9, ageGroup: '6-9', content: SAMPLE_CONTENT }],
        'err-tok'
      )
    ).rejects.toThrow('Invalid API key');
  });

  // ── HTML structure ────────────────────────────────────────────────────────

  it('HTML has dir="rtl" and lang="ar"', async () => {
    await sendWeeklyEmail('p@e.com', 1,
      [{ name: 'فهد', age: 9, ageGroup: '6-9', content: SAMPLE_CONTENT }], 'tok');
    const { html } = mockSend.mock.calls[0][0] as { html: string };
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="ar"');
  });

  it('HTML contains unsubscribe link with token', async () => {
    await sendWeeklyEmail('p@e.com', 2,
      [{ name: 'فهد', age: 9, ageGroup: '6-9', content: SAMPLE_CONTENT }], 'my-unsub-token');
    const { html } = mockSend.mock.calls[0][0] as { html: string };
    expect(html).toContain('my-unsub-token');
    expect(html).toContain('إلغاء الاشتراك');
  });

  it('HTML contains bunyan.guru link', async () => {
    await sendWeeklyEmail('p@e.com', 1,
      [{ name: 'فهد', age: 9, ageGroup: '6-9', content: SAMPLE_CONTENT }], 'tok');
    const { html } = mockSend.mock.calls[0][0] as { html: string };
    expect(html).toContain('bunyan.guru');
  });

  it('HTML contains child name in the summary list', async () => {
    await sendWeeklyEmail('p@e.com', 1,
      [{ name: 'ليلى', age: 8, ageGroup: '6-9', content: SAMPLE_CONTENT }], 'tok');
    const { html } = mockSend.mock.calls[0][0] as { html: string };
    expect(html).toContain('ليلى');
  });

  it('HTML shows week number', async () => {
    await sendWeeklyEmail('p@e.com', 7,
      [{ name: 'ناصر', age: 11, ageGroup: '10-12', content: SAMPLE_CONTENT }], 'tok');
    const { html } = mockSend.mock.calls[0][0] as { html: string };
    expect(html).toContain('الأسبوع 7');
  });

  it('HTML mentions PDF attachment', async () => {
    await sendWeeklyEmail('p@e.com', 1,
      [{ name: 'فهد', age: 9, ageGroup: '6-9', content: SAMPLE_CONTENT }], 'tok');
    const { html } = mockSend.mock.calls[0][0] as { html: string };
    expect(html).toContain('PDF');
  });

  it('children with null content are excluded from child list', async () => {
    await sendWeeklyEmail('p@e.com', 4, [
      { name: 'سارة', age: 7, ageGroup: '6-9', content: SAMPLE_CONTENT },
      { name: 'مشبوه', age: 5, ageGroup: '4-5', content: null },
    ], 'tok');
    const { html } = mockSend.mock.calls[0][0] as { html: string };
    expect(html).toContain('سارة');
    expect(html).not.toContain('مشبوه');
  });

  // ── Subject line ──────────────────────────────────────────────────────────

  it('subject uses child name for single child', async () => {
    await sendWeeklyEmail('p@e.com', 5,
      [{ name: 'ريم', age: 8, ageGroup: '6-9', content: SAMPLE_CONTENT }], 'tok');
    const { subject } = mockSend.mock.calls[0][0] as { subject: string };
    expect(subject).toContain('ريم');
    expect(subject).toContain('5');
  });

  it('subject uses generic label for multiple children', async () => {
    await sendWeeklyEmail('p@e.com', 2, [
      { name: 'علي', age: 6, ageGroup: '6-9', content: SAMPLE_CONTENT },
      { name: 'لينا', age: 10, ageGroup: '10-12', content: SAMPLE_CONTENT },
    ], 'tok2');
    const { subject } = mockSend.mock.calls[0][0] as { subject: string };
    expect(subject).toContain('أطفالك');
    expect(subject).not.toContain('علي');
  });

  // ── PDF attachment ────────────────────────────────────────────────────────

  it('sends email with a PDF attachment', async () => {
    await sendWeeklyEmail('p@e.com', 1,
      [{ name: 'فهد', age: 9, ageGroup: '6-9', content: SAMPLE_CONTENT }], 'tok');
    const call = mockSend.mock.calls[0][0] as { attachments: { filename: string; content: string }[] };
    expect(call.attachments).toHaveLength(1);
    expect(call.attachments[0].filename).toMatch(/\.pdf$/);
  });

  it('PDF filename contains the week number', async () => {
    await sendWeeklyEmail('p@e.com', 5,
      [{ name: 'فهد', age: 9, ageGroup: '6-9', content: SAMPLE_CONTENT }], 'tok');
    const call = mockSend.mock.calls[0][0] as { attachments: { filename: string }[] };
    expect(call.attachments[0].filename).toContain('5');
  });

  it('PDF attachment content is base64 encoded', async () => {
    await sendWeeklyEmail('p@e.com', 1,
      [{ name: 'فهد', age: 9, ageGroup: '6-9', content: SAMPLE_CONTENT }], 'tok');
    const call = mockSend.mock.calls[0][0] as { attachments: { content: string }[] };
    const content = call.attachments[0].content;
    // Base64 pattern: only valid base64 chars
    expect(content).toMatch(/^[A-Za-z0-9+/]+=*$/);
    // Decodes to the fake PDF content we mocked
    expect(Buffer.from(content, 'base64').toString()).toBe('fake-pdf-content');
  });
});
