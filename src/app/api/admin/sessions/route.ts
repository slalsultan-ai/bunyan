import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sessions, sessionAnswers } from '@/lib/db/schema';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { sql, isNull, and } from 'drizzle-orm';
import { inArray } from 'drizzle-orm';

export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  const [[total], [completed], [incomplete], [noScore]] = await Promise.all([
    db.select({ v: sql<number>`COUNT(*)` }).from(sessions),
    db.select({ v: sql<number>`COUNT(*)` }).from(sessions).where(sql`completed_at IS NOT NULL`),
    db.select({ v: sql<number>`COUNT(*)` }).from(sessions).where(isNull(sessions.completedAt)),
    db.select({ v: sql<number>`COUNT(*)` }).from(sessions).where(and(isNull(sessions.score), isNull(sessions.completedAt))),
  ]);

  return NextResponse.json({
    total: total.v,
    completed: completed.v,
    incomplete: incomplete.v,
    fake: noScore.v,
  });
}

// DELETE incomplete sessions (no score + no completedAt)
export async function DELETE() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  // Find incomplete session IDs
  const incompleteSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(isNull(sessions.score), isNull(sessions.completedAt)));

  if (incompleteSessions.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  const ids = incompleteSessions.map(s => s.id);

  // Delete associated answers first, then sessions
  await db.delete(sessionAnswers).where(inArray(sessionAnswers.sessionId, ids));
  await db.delete(sessions).where(inArray(sessions.id, ids));

  return NextResponse.json({ deleted: ids.length });
}
