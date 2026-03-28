import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { rateLimit, getIp } from '@/lib/rate-limit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const rl = rateLimit(`stats:${getIp(req)}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  try {
    const guestId = req.nextUrl.searchParams.get('guest_id');
    if (!guestId || !UUID_RE.test(guestId)) {
      return NextResponse.json({ error: 'guest_id required' }, { status: 400 });
    }

    const db = getDb();
    const allSessions = await db.select().from(sessions).where(eq(sessions.guestId, guestId)).orderBy(sessions.startedAt);

    const breakdown = {
      quantitative: { correct: 0, total: 0 },
      verbal: { correct: 0, total: 0 },
      logical_patterns: { correct: 0, total: 0 },
    };

    for (const s of allSessions) {
      const skill = s.skillArea as keyof typeof breakdown;
      if (skill in breakdown) {
        breakdown[skill].correct += s.score ?? 0;
        breakdown[skill].total += s.totalQuestions ?? 0;
      }
    }

    return NextResponse.json({
      totalSessions: allSessions.length,
      totalCorrect: allSessions.reduce((a, s) => a + (s.score ?? 0), 0),
      totalAnswered: allSessions.reduce((a, s) => a + (s.totalQuestions ?? 0), 0),
      skillBreakdown: breakdown,
      recentSessions: allSessions.slice(-10).reverse(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
