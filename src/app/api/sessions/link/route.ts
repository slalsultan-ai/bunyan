import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sessions, children } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getAuthenticatedParent } from '@/lib/parent-auth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Link orphaned guest sessions (no childId) to a specific child.
 * Called when a logged-in parent selects a child, to claim
 * sessions that were completed as a guest from the same browser.
 */
export async function POST(req: NextRequest) {
  const parent = await getAuthenticatedParent();
  if (!parent) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { guestId, childId } = body;

  if (!guestId || !UUID_RE.test(guestId) || !childId || !UUID_RE.test(childId)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  // Validate child belongs to this parent
  const db = getDb();
  const [child] = await db.select({ id: children.id }).from(children)
    .where(and(eq(children.id, childId), eq(children.parentId, parent.id)))
    .limit(1);

  if (!child) {
    return NextResponse.json({ error: 'Invalid child' }, { status: 403 });
  }

  // Link orphaned sessions: guestId matches AND childId is null
  await db.update(sessions).set({
    childId,
    parentId: parent.id,
  }).where(and(
    eq(sessions.guestId, guestId),
    isNull(sessions.childId),
  ));

  return NextResponse.json({ ok: true });
}
