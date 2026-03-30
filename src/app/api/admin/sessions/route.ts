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

  const [counts] = await db.select({
    total: sql<number>`COUNT(*)`,
    completed: sql<number>`SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END)`,
    incomplete: sql<number>`SUM(CASE WHEN completed_at IS NULL THEN 1 ELSE 0 END)`,
    fake: sql<number>`SUM(CASE WHEN score IS NULL AND completed_at IS NULL THEN 1 ELSE 0 END)`,
  }).from(sessions);

  return NextResponse.json({
    total: counts.total,
    completed: counts.completed,
    incomplete: counts.incomplete,
    fake: counts.fake,
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
