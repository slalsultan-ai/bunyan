import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sessions, guestProgress } from '@/lib/db/schema';
import { sql, desc } from 'drizzle-orm';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  const [dailySessions, ageGroupDist, skillDist, topGuests, weekAcc, completionStats] = await Promise.all([
    db.select({
      date: sql<string>`DATE(started_at)`,
      cnt: sql<number>`COUNT(*)`,
      avgScore: sql<number>`ROUND(AVG(CAST(score AS REAL) / NULLIF(total_questions, 0) * 100))`,
    })
      .from(sessions)
      .where(sql`started_at >= DATE('now', '-14 days')`)
      .groupBy(sql`DATE(started_at)`)
      .orderBy(sql`DATE(started_at)`),

    db.select({ ageGroup: sessions.ageGroup, cnt: sql<number>`COUNT(*)` })
      .from(sessions).groupBy(sessions.ageGroup),

    db.select({ skill: sessions.skillArea, cnt: sql<number>`COUNT(*)` })
      .from(sessions).groupBy(sessions.skillArea),

    db.select().from(guestProgress).orderBy(desc(guestProgress.totalPoints)).limit(10),

    db.select({
      date: sql<string>`DATE(started_at)`,
      accuracy: sql<number>`ROUND(AVG(CAST(score AS REAL) / NULLIF(total_questions, 0) * 100))`,
    })
      .from(sessions)
      .where(sql`started_at >= DATE('now', '-7 days')`)
      .groupBy(sql`DATE(started_at)`)
      .orderBy(sql`DATE(started_at)`),

    // Completion = sessions where the user answered every question (answer_count = total_questions).
    // We cannot use completed_at because it is always set at submission time, making that metric always 100%.
    db.select({
      totalStarted: sql<number>`COUNT(*)`,
      totalCompleted: sql<number>`SUM(CASE WHEN (SELECT COUNT(*) FROM session_answers WHERE session_id = sessions.id) = sessions.total_questions AND sessions.total_questions > 0 THEN 1 ELSE 0 END)`,
    }).from(sessions),
  ]);

  const { totalStarted, totalCompleted } = completionStats[0] ?? { totalStarted: 0, totalCompleted: 0 };
  const completionRate = totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;

  return NextResponse.json({ dailySessions, ageGroupDist, skillDist, topGuests, weekAcc, completionRate, totalStarted, totalCompleted });
}
