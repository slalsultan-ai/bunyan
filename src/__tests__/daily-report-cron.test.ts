import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DailyStats } from '@/lib/email/daily-report';

const mockGatherDailyStats = vi.fn();
const mockSendDailyReport = vi.fn();

vi.mock('@/lib/email/daily-report', () => ({
  gatherDailyStats: (...args: unknown[]) => mockGatherDailyStats(...args),
  sendDailyReport: (...args: unknown[]) => mockSendDailyReport(...args),
}));

const { GET, POST } = await import('@/app/api/cron/daily-report/route');

function makeReq(authHeader?: string) {
  return {
    headers: { get: (k: string) => k === 'authorization' ? (authHeader ?? null) : null },
  } as unknown as import('next/server').NextRequest;
}

function makeStats(): DailyStats {
  return {
    date: '2026-04-01',
    dateAr: 'الأربعاء 1 أبريل 2026',
    newSessions: 12,
    completedSessions: 9,
    completionRate: 75,
    newUsers: 3,
    totalRegistered: 15,
    yesterdayNewSessions: 8,
    yesterdayCompleted: 5,
    yesterdayCompletionRate: 62,
    yesterdayNewUsers: 1,
    guestSessions: 4,
    registeredSessions: 8,
    ageGroupDist: [],
    skillDist: [],
    avgSessionTimeMs: 180000,
    newUsersList: [],
    topScore: null,
    fastestSession: null,
    fakeSessions: 0,
    lowCompletionRate: false,
    otpErrors: 0,
    weeklyChart: [],
  };
}

describe('GET /api/cron/daily-report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('rejects missing auth', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('rejects wrong auth', async () => {
    const res = await GET(makeReq('Bearer wrong'));
    expect(res.status).toBe(401);
  });

  it('returns success on valid auth', async () => {
    mockGatherDailyStats.mockResolvedValue(makeStats());
    mockSendDailyReport.mockResolvedValue('resend-123');

    const res = await GET(makeReq('Bearer test-cron-secret'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.resendId).toBe('resend-123');
  });

  it('POST delegates to GET', async () => {
    mockGatherDailyStats.mockResolvedValue(makeStats());
    mockSendDailyReport.mockResolvedValue('resend-456');

    const res = await POST(makeReq('Bearer test-cron-secret'));
    expect(res.status).toBe(200);
  });

  it('returns 500 on send failure', async () => {
    mockGatherDailyStats.mockResolvedValue(makeStats());
    mockSendDailyReport.mockRejectedValue(new Error('Resend down'));

    const res = await GET(makeReq('Bearer test-cron-secret'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Failed');
  });
});
