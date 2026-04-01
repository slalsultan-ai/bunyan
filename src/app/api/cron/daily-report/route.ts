import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { gatherDailyStats, sendDailyReport } from '@/lib/email/daily-report';

export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const authBuf = Buffer.from(auth);
  const expectedBuf = Buffer.from(expected);
  if (authBuf.length !== expectedBuf.length || !timingSafeEqual(authBuf, expectedBuf)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await gatherDailyStats();
    const resendId = await sendDailyReport(stats);

    console.log(`Daily report sent successfully: ${resendId}`);

    return Response.json({
      success: true,
      date: stats.date,
      resendId,
      summary: {
        sessions: stats.newSessions,
        completed: stats.completedSessions,
        newUsers: stats.newUsers,
      },
    });
  } catch (err) {
    console.error('Failed to send daily report:', err);
    return Response.json(
      { error: 'Failed to send daily report', detail: String(err) },
      { status: 500 },
    );
  }
}

// Also support POST
export async function POST(req: NextRequest) {
  return GET(req);
}
