import { NextRequest, NextResponse } from 'next/server';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { getAuthenticatedParent } from '@/lib/parent-auth';
import { getDb } from '@/lib/db';
import { sessions, children, sessionAnswers } from '@/lib/db/schema';
import { sql, eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const parent = await getAuthenticatedParent();
    if (!parent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const enabled = await hasFeatureAccess('parent_dashboard_pro', parent.email, parent.id);
    if (!enabled) return NextResponse.json({ enabled: false });

    const childId = req.nextUrl.searchParams.get('childId');
    const months = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('months') || '3') || 3, 1), 6);

    if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 });

    // Verify child belongs to parent
    const db = getDb();
    const [child] = await db.select({ id: children.id, ageGroup: children.ageGroup })
      .from(children)
      .where(and(eq(children.id, childId), eq(children.parentId, parent.id)))
      .limit(1);
    if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const totalWeeks = months * 4;
    const weeklyData: Array<{ week: string; accuracy: number; sessions: number }> = [];

    for (let i = totalWeeks - 1; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = new Date(weekStart.getTime() + 6 * 86400000).toISOString().split('T')[0];

      const [row] = await db
        .select({
          cnt: sql<number>`COUNT(DISTINCT sessions.id)`,
          correct: sql<number>`SUM(CASE WHEN session_answers.is_correct = 1 THEN 1 ELSE 0 END)`,
          total: sql<number>`COUNT(session_answers.id)`,
        })
        .from(sessions)
        .leftJoin(sessionAnswers, eq(sessionAnswers.sessionId, sessions.id))
        .where(and(
          eq(sessions.childId, childId),
          sql`sessions.completed_at IS NOT NULL`,
          sql`DATE(sessions.started_at) >= ${weekStartStr}`,
          sql`DATE(sessions.started_at) <= ${weekEndStr}`
        ));

      const total = row?.total ?? 0;
      const correct = row?.correct ?? 0;
      weeklyData.push({
        week: weekStartStr,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        sessions: row?.cnt ?? 0,
      });
    }

    // Overall average across all children in same age group (for comparison line)
    const [avgRow] = await db
      .select({
        correct: sql<number>`SUM(CASE WHEN session_answers.is_correct = 1 THEN 1 ELSE 0 END)`,
        total: sql<number>`COUNT(session_answers.id)`,
      })
      .from(sessions)
      .innerJoin(children, eq(sessions.childId, children.id))
      .leftJoin(sessionAnswers, eq(sessionAnswers.sessionId, sessions.id))
      .where(and(
        eq(children.ageGroup, child.ageGroup),
        sql`sessions.completed_at IS NOT NULL`,
        sql`sessions.started_at >= datetime('now', '-${totalWeeks * 7} days')`
      ));

    const avgTotal = avgRow?.total ?? 0;
    const avgCorrect = avgRow?.correct ?? 0;
    const overallAverage = avgTotal > 0 ? Math.round((avgCorrect / avgTotal) * 100) : 0;

    return NextResponse.json({
      enabled: true,
      weeklyData,
      overallAverage,
    });
  } catch (e) {
    console.error('[monthly-progress]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
