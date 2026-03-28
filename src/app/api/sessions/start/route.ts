import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { sql, and, eq } from 'drizzle-orm';
import { rateLimit, getIp } from '@/lib/rate-limit';

const VALID_AGE_GROUPS = new Set(['4-5', '6-9', '10-12']);
const VALID_SKILL_AREAS = new Set(['quantitative', 'verbal', 'logical_patterns', 'mixed']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const IP_LIMIT = { max: 20, windowMs: 60_000 };
const MAX_STARTS_PER_GUEST_PER_DAY = 60;

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  const rl = rateLimit(`sessions-start:${ip}`, IP_LIMIT.max, IP_LIMIT.windowMs);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { sessionId, guestId, ageGroup, skillArea, totalQuestions } = body;

    if (!sessionId || !ageGroup || !skillArea || !guestId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!UUID_RE.test(sessionId) || !UUID_RE.test(guestId)) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }
    if (!VALID_AGE_GROUPS.has(ageGroup) || !VALID_SKILL_AREAS.has(skillArea)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // Daily cap — count started sessions (including incomplete ones)
    const [guestCap] = await db.select({ cnt: sql<number>`COUNT(*)` })
      .from(sessions)
      .where(and(eq(sessions.guestId, guestId), sql`DATE(started_at) = ${today}`));

    if ((guestCap?.cnt ?? 0) >= MAX_STARTS_PER_GUEST_PER_DAY) {
      return NextResponse.json({ error: 'Daily session limit reached' }, { status: 429 });
    }

    // Insert session with completedAt = null (not yet completed)
    await db.insert(sessions).values({
      id: sessionId,
      guestId,
      ageGroup,
      skillArea,
      totalQuestions: Number(totalQuestions) || 10,
      ipAddress: ip,
    }).onConflictDoNothing(); // idempotent — ignore if already registered

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
