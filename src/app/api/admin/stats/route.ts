import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions, sessions, guestProgress, parents, children } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  const [[totalQ], [activeQ], [totalS], [todayS], [totalG], [avgAcc], byAge, byType, bySkill, recentS, registeredParents, registeredChildren, sessionsList] = await Promise.all([
    db.select({ v: sql<number>`COUNT(*)` }).from(questions),
    db.select({ v: sql<number>`COUNT(*)` }).from(questions).where(eq(questions.isActive, true)),
    db.select({ v: sql<number>`COUNT(*)` }).from(sessions),
    db.select({ v: sql<number>`COUNT(*)` }).from(sessions).where(sql`DATE(started_at) = DATE('now')`),
    db.select({ v: sql<number>`COUNT(*)` }).from(guestProgress),
    db.select({ v: sql<number>`AVG(CAST(score AS REAL) / NULLIF(total_questions, 0) * 100)` }).from(sessions),
    db.select({ ageGroup: questions.ageGroup, cnt: sql<number>`COUNT(*)` }).from(questions).groupBy(questions.ageGroup),
    db.select({ type: questions.questionType, cnt: sql<number>`COUNT(*)` }).from(questions).groupBy(questions.questionType),
    db.select({ skill: questions.skillArea, cnt: sql<number>`COUNT(*)` }).from(questions).groupBy(questions.skillArea),
    db.select({
      id:             sessions.id,
      ageGroup:       sessions.ageGroup,
      skillArea:      sessions.skillArea,
      score:          sessions.score,
      totalQuestions: sessions.totalQuestions,
      timeTakenMs:    sessions.timeTakenMs,
      startedAt:      sessions.startedAt,
    }).from(sessions).orderBy(desc(sessions.startedAt)).limit(8),
    // Registered parents
    db.select({
      id: parents.id,
      email: parents.email,
      city: parents.city,
      createdAt: parents.createdAt,
      lastLoginAt: parents.lastLoginAt,
      weeklyEmailEnabled: parents.weeklyEmailEnabled,
    }).from(parents).orderBy(desc(parents.createdAt)),
    // Children
    db.select({
      id: children.id,
      parentId: children.parentId,
      name: children.name,
      age: children.age,
      ageGroup: children.ageGroup,
    }).from(children),
    // All sessions with more detail
    db.select({
      id: sessions.id,
      guestId: sessions.guestId,
      parentId: sessions.parentId,
      childId: sessions.childId,
      ageGroup: sessions.ageGroup,
      skillArea: sessions.skillArea,
      score: sessions.score,
      totalQuestions: sessions.totalQuestions,
      timeTakenMs: sessions.timeTakenMs,
      startedAt: sessions.startedAt,
      completedAt: sessions.completedAt,
      ipAddress: sessions.ipAddress,
    }).from(sessions).orderBy(desc(sessions.startedAt)).limit(50),
  ]);

  // Map children to their parents
  const parentsList = registeredParents.map(p => ({
    ...p,
    children: registeredChildren.filter(c => c.parentId === p.id),
  }));

  return NextResponse.json({
    totalQuestions: totalQ.v,
    activeQuestions: activeQ.v,
    totalSessions: totalS.v,
    todaySessions: todayS.v,
    totalGuests: totalG.v,
    avgAccuracy: Math.round(avgAcc.v ?? 0),
    byAge,
    byType,
    bySkill,
    recentSessions: recentS,
    parents: parentsList,
    totalParents: registeredParents.length,
    totalChildren: registeredChildren.length,
    sessions: sessionsList,
  });
}
