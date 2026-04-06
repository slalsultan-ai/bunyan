import { NextRequest, NextResponse } from 'next/server';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { getAuthenticatedParent } from '@/lib/parent-auth';
import { getDb } from '@/lib/db';
import { sessions, children, sessionAnswers } from '@/lib/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { predictGoalDate, calculateWeeklyImprovement } from '@/lib/predictions';

export async function GET(req: NextRequest) {
  try {
    const parent = await getAuthenticatedParent();
    if (!parent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const enabled = await hasFeatureAccess('parent_dashboard_pro', parent.email);
    if (!enabled) return NextResponse.json({ enabled: false });

    const db = getDb();
    const childRows = await db.select().from(children).where(eq(children.parentId, parent.id));

    // Monthly progress for each child (last 12 weeks)
    const monthlyProgress: Record<string, Array<{ week: string; accuracy: number; sessions: number }>> = {};
    const childComparison: Array<{ childId: string; name: string; accuracy: number; sessions: number; trend: string }> = [];

    for (const child of childRows) {
      const weeklyData: Array<{ week: string; accuracy: number; sessions: number }> = [];

      for (let i = 11; i >= 0; i--) {
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
            eq(sessions.childId, child.id),
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

      monthlyProgress[child.id] = weeklyData;

      // Overall stats for comparison (last 30 days)
      const [overall] = await db
        .select({
          cnt: sql<number>`COUNT(DISTINCT sessions.id)`,
          correct: sql<number>`SUM(CASE WHEN session_answers.is_correct = 1 THEN 1 ELSE 0 END)`,
          total: sql<number>`COUNT(session_answers.id)`,
        })
        .from(sessions)
        .leftJoin(sessionAnswers, eq(sessionAnswers.sessionId, sessions.id))
        .where(and(
          eq(sessions.childId, child.id),
          sql`sessions.completed_at IS NOT NULL`,
          sql`sessions.started_at >= datetime('now', '-30 days')`
        ));

      const totalQ = overall?.total ?? 0;
      const correctQ = overall?.correct ?? 0;
      const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
      const recentAccuracies = weeklyData.filter(w => w.sessions > 0).map(w => w.accuracy);
      const improvement = calculateWeeklyImprovement(recentAccuracies);
      const trend = improvement > 2 ? 'improving' : improvement < -2 ? 'declining' : 'stable';

      childComparison.push({
        childId: child.id,
        name: child.name,
        accuracy,
        sessions: overall?.cnt ?? 0,
        trend,
      });
    }

    // Goals
    const goals = await db
      .select()
      .from(sql`child_goals`)
      .where(sql`child_id IN (${sql.join(childRows.map(c => sql`${c.id}`), sql`, `)}) AND status = 'active'`) as any[];

    const goalsWithPredictions = goals.map((g: any) => {
      const childProgress = monthlyProgress[g.child_id] || [];
      const recentAccuracies = childProgress.filter((w: any) => w.sessions > 0).map((w: any) => w.accuracy);
      const improvement = calculateWeeklyImprovement(recentAccuracies);
      const currentAcc = recentAccuracies.length > 0 ? recentAccuracies[recentAccuracies.length - 1] : 0;
      const prediction = predictGoalDate(currentAcc, g.target_value, improvement);

      return {
        id: g.id,
        childId: g.child_id,
        goalType: g.goal_type,
        targetValue: g.target_value,
        currentValue: currentAcc,
        status: g.status,
        prediction,
      };
    });

    return NextResponse.json({
      enabled: true,
      monthlyProgress,
      childrenComparison: childComparison,
      goals: goalsWithPredictions,
    });
  } catch (e) {
    console.error('[dashboard-pro]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
