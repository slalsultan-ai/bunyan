import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sessions, children } from '@/lib/db/schema';
import { sql, and, eq } from 'drizzle-orm';
import { checkRateLimit, getIp } from '@/lib/rate-limit-db';
import { getAuthenticatedParent } from '@/lib/parent-auth';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { checkSessionLimit, checkGuestSessionLimit } from '@/lib/session-limit';

const VALID_AGE_GROUPS = new Set(['4-5', '6-9', '10-12']);
const VALID_SKILL_AREAS = new Set(['quantitative', 'verbal', 'logical_patterns', 'mixed']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const IP_LIMIT = { max: 20, windowMs: 60_000 };
const MAX_STARTS_PER_GUEST_PER_DAY = 60;

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  const rl = await checkRateLimit(`sessions-start:${ip}`, IP_LIMIT.max, IP_LIMIT.windowMs / 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { sessionId, guestId, ageGroup, skillArea, totalQuestions, childId, parentId: bodyParentId } = body;

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

    // ── Server-side auth: derive parentId from authenticated session ───
    let validChildId: string | undefined;
    let validParentId: string | undefined;

    const parent = await getAuthenticatedParent();

    if (parent) {
      // Authenticated parent — use their ID from the session, NOT from body
      validParentId = parent.id;

      // If client sent a different parentId, reject (spoofing attempt)
      if (bodyParentId && UUID_RE.test(bodyParentId) && bodyParentId !== parent.id) {
        return NextResponse.json({ error: 'Invalid parent' }, { status: 403 });
      }

      // Validate childId belongs to this parent
      if (childId && UUID_RE.test(childId)) {
        const [child] = await db.select({ id: children.id }).from(children)
          .where(and(eq(children.id, childId), eq(children.parentId, parent.id)))
          .limit(1);
        if (!child) {
          return NextResponse.json({ error: 'Invalid child' }, { status: 403 });
        }
        validChildId = childId;
      }
    } else {
      // Guest (unauthenticated) — ignore any parentId/childId from body
      // They can only create guest sessions
    }

    // Session limit check (if feature flag enabled)
    const sessionLimitEnabled = await hasFeatureAccess('session_limit');
    if (sessionLimitEnabled) {
      if (validChildId) {
        const { allowed, remaining } = await checkSessionLimit(validChildId);
        if (!allowed) {
          return NextResponse.json({
            error: 'SESSION_LIMIT_REACHED',
            remaining: 0,
            limit: 3,
          }, { status: 429 });
        }
      } else {
        const { allowed } = await checkGuestSessionLimit(guestId);
        if (!allowed) {
          return NextResponse.json({
            error: 'SESSION_LIMIT_REACHED',
            remaining: 0,
            limit: 3,
          }, { status: 429 });
        }
      }
    }

    // Insert session with completedAt = null (not yet completed)
    await db.insert(sessions).values({
      id: sessionId,
      guestId,
      ageGroup,
      skillArea,
      totalQuestions: Number(totalQuestions) || 10,
      ipAddress: ip,
      ...(validChildId ? { childId: validChildId } : {}),
      ...(validParentId ? { parentId: validParentId } : {}),
    }).onConflictDoNothing(); // idempotent — ignore if already registered

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
