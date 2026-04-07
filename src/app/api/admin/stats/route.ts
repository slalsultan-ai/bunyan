import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions, sessions, guestProgress, parents, children } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { isAdminAuthenticated } from '@/lib/admin-auth';

// Simple in-memory cache with TTL (acceptable for single-admin use case)
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function GET(req: NextRequest) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Pagination for sessions list
  const page = Math.max(parseInt(req.nextUrl.searchParams.get('page') || '1') || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('limit') || '20') || 20, 1), 50);
  const offset = (page - 1) * limit;

  const cacheKey = `admin-stats:${page}:${limit}`;
  const cached = getCached<object>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const db = getDb();

  // Run aggregate queries in parallel instead of fetching all rows
  const [
    [totalQ],
    [activeQ],
    [totalS],
    [todayS],
    [totalG],
    [avgAcc],
    byAge,
    byType,
    bySkill,
    recentS,
    [parentCount],
    [childCount],
    parentsWithChildren,
    sessionsList,
  ] = await Promise.all([
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
    // Aggregate counts instead of fetching all rows
    db.select({ v: sql<number>`COUNT(*)` }).from(parents),
    db.select({ v: sql<number>`COUNT(*)` }).from(children),
    // Use LEFT JOIN to get parents with their children in one query
    db.select({
      parentId: parents.id,
      parentEmail: parents.email,
      parentCity: parents.city,
      parentCreatedAt: parents.createdAt,
      parentLastLoginAt: parents.lastLoginAt,
      parentWeeklyEmailEnabled: parents.weeklyEmailEnabled,
      childId: children.id,
      childName: children.name,
      childAge: children.age,
      childAgeGroup: children.ageGroup,
    })
      .from(parents)
      .leftJoin(children, eq(parents.id, children.parentId))
      .orderBy(desc(parents.createdAt)),
    // Paginated sessions with answer count via subquery + child name via LEFT JOIN
    db.select({
      id: sessions.id,
      guestId: sessions.guestId,
      parentId: sessions.parentId,
      childId: sessions.childId,
      childName: children.name,
      ageGroup: sessions.ageGroup,
      skillArea: sessions.skillArea,
      score: sessions.score,
      totalQuestions: sessions.totalQuestions,
      timeTakenMs: sessions.timeTakenMs,
      startedAt: sessions.startedAt,
      completedAt: sessions.completedAt,
      ipAddress: sessions.ipAddress,
      answerCount: sql<number>`(SELECT COUNT(*) FROM session_answers WHERE session_id = ${sessions.id})`,
    }).from(sessions).leftJoin(children, eq(sessions.childId, children.id)).orderBy(desc(sessions.startedAt)).limit(limit).offset(offset),
  ]);

  // Group parents with children from JOIN results (in-memory but from a single query)
  const parentMap = new Map<string, {
    id: string;
    email: string | null;
    city: string | null;
    createdAt: string | null;
    lastLoginAt: string | null;
    weeklyEmailEnabled: boolean | null;
    children: { id: string; name: string; age: number; ageGroup: string }[];
  }>();

  for (const row of parentsWithChildren) {
    if (!parentMap.has(row.parentId)) {
      parentMap.set(row.parentId, {
        id: row.parentId,
        email: row.parentEmail,
        city: row.parentCity,
        createdAt: row.parentCreatedAt,
        lastLoginAt: row.parentLastLoginAt,
        weeklyEmailEnabled: row.parentWeeklyEmailEnabled,
        children: [],
      });
    }
    if (row.childId) {
      parentMap.get(row.parentId)!.children.push({
        id: row.childId,
        name: row.childName!,
        age: row.childAge!,
        ageGroup: row.childAgeGroup!,
      });
    }
  }

  const parentsList = [...parentMap.values()];

  const result = {
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
    totalParents: parentCount.v,
    totalChildren: childCount.v,
    sessions: sessionsList,
    pagination: {
      page,
      limit,
      total: totalS.v,
    },
  };

  setCache(cacheKey, result);
  return NextResponse.json(result);
}
