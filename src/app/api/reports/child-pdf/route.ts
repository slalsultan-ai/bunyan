import { NextRequest, NextResponse } from 'next/server';
import { getParentSession } from '@/lib/parent-auth';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { getDb } from '@/lib/db';
import { children, sessions, sessionAnswers, questions, guestProgress, childParents } from '@/lib/db/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import { generateChildPdf } from '@/lib/pdf/child-report';
import { getStrengthDescription } from '@/lib/pdf/child-report-content';

export async function GET(req: NextRequest) {
 try {
  // Auth check
  const session = await getParentSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Feature flag check
  const hasAccess = await hasFeatureAccess('child_pdf_report', session.email);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Feature not available' }, { status: 403 });
  }

  const childId = req.nextUrl.searchParams.get('childId');
  if (!childId) {
    return NextResponse.json({ error: 'childId is required' }, { status: 400 });
  }

  const db = getDb();

  // Verify parent owns or follows this child
  const [child] = await db
    .select()
    .from(children)
    .where(eq(children.id, childId))
    .limit(1);

  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  const isOwner = child.parentId === session.parentId;
  if (!isOwner) {
    const [followerLink] = await db
      .select()
      .from(childParents)
      .where(and(eq(childParents.childId, childId), eq(childParents.parentId, session.parentId)))
      .limit(1);
    if (!followerLink) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // ── Gather data ─────────────────────────────────────────────────────────

  // Total stats
  const [totals] = await db
    .select({
      totalSessions: sql<number>`COUNT(*)`,
      totalCorrect: sql<number>`COALESCE(SUM(${sessions.score}), 0)`,
      totalAnswered: sql<number>`COALESCE(SUM(${sessions.totalQuestions}), 0)`,
      totalPoints: sql<number>`COALESCE(SUM(${sessions.pointsEarned}), 0)`,
    })
    .from(sessions)
    .where(and(eq(sessions.childId, childId), isNotNull(sessions.completedAt)));

  // Guest progress for streak/level/badges
  const [progress] = await db
    .select()
    .from(guestProgress)
    .where(eq(guestProgress.guestId, childId))
    .limit(1);

  // Skill breakdown (last 30 days)
  const skillRows = await db
    .select({
      skillArea: questions.skillArea,
      correct: sql<number>`SUM(CASE WHEN ${sessionAnswers.isCorrect} = 1 THEN 1 ELSE 0 END)`,
      total: sql<number>`COUNT(*)`,
    })
    .from(sessionAnswers)
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .innerJoin(questions, eq(sessionAnswers.questionId, questions.id))
    .where(and(
      eq(sessions.childId, childId),
      isNotNull(sessions.completedAt),
      sql`${sessions.completedAt} >= date('now', '-30 days')`
    ))
    .groupBy(questions.skillArea);

  // Previous 30 days for trend comparison
  const prevSkillRows = await db
    .select({
      skillArea: questions.skillArea,
      correct: sql<number>`SUM(CASE WHEN ${sessionAnswers.isCorrect} = 1 THEN 1 ELSE 0 END)`,
      total: sql<number>`COUNT(*)`,
    })
    .from(sessionAnswers)
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .innerJoin(questions, eq(sessionAnswers.questionId, questions.id))
    .where(and(
      eq(sessions.childId, childId),
      isNotNull(sessions.completedAt),
      sql`${sessions.completedAt} >= date('now', '-60 days') AND ${sessions.completedAt} < date('now', '-30 days')`
    ))
    .groupBy(questions.skillArea);

  type SkillInfo = {
    accuracy: number;
    totalAnswered: number;
    trend: 'up' | 'down' | 'stable';
    strongest?: { name: string; accuracy: number } | null;
    weakest?: { name: string; accuracy: number } | null;
  };
  const skills: Record<string, SkillInfo> = {
    quantitative: { accuracy: 0, totalAnswered: 0, trend: 'stable', strongest: null, weakest: null },
    verbal: { accuracy: 0, totalAnswered: 0, trend: 'stable', strongest: null, weakest: null },
    logical_patterns: { accuracy: 0, totalAnswered: 0, trend: 'stable', strongest: null, weakest: null },
  };

  const prevMap = new Map(prevSkillRows.map(r => [r.skillArea, r.total > 0 ? (r.correct / r.total) * 100 : 0]));

  for (const row of skillRows) {
    if (row.skillArea in skills) {
      const acc = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
      const prevAcc = prevMap.get(row.skillArea) ?? 0;
      skills[row.skillArea] = {
        accuracy: acc,
        totalAnswered: row.total,
        trend: acc > prevAcc + 5 ? 'up' : acc < prevAcc - 5 ? 'down' : 'stable',
        strongest: null,
        weakest: null,
      };
    }
  }

  // Weekly data (last 4 weeks)
  const weeklyRows = await db
    .select({
      week: sql<string>`strftime('%Y-W%W', ${sessions.completedAt})`.as('week'),
      sessionCount: sql<number>`COUNT(*)`.as('sessionCount'),
      correct: sql<number>`COALESCE(SUM(${sessions.score}), 0)`.as('correct'),
      total: sql<number>`COALESCE(SUM(${sessions.totalQuestions}), 0)`.as('total'),
      points: sql<number>`COALESCE(SUM(${sessions.pointsEarned}), 0)`.as('points'),
    })
    .from(sessions)
    .where(and(
      eq(sessions.childId, childId),
      isNotNull(sessions.completedAt),
      sql`${sessions.completedAt} >= date('now', '-28 days')`
    ))
    .groupBy(sql`strftime('%Y-W%W', ${sessions.completedAt})`)
    .orderBy(sql`strftime('%Y-W%W', ${sessions.completedAt})`);

  const weekLabels = ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'];
  const weeklyData = weeklyRows.map((w, i) => ({
    week: weekLabels[i] ?? `أسبوع ${i + 1}`,
    sessions: w.sessionCount,
    accuracy: w.total > 0 ? Math.round((w.correct / w.total) * 100) : 0,
    points: w.points,
  }));

  // Sub-skill breakdown per skill area
  const subSkillRows = await db
    .select({
      subSkill: questions.subSkill,
      skillArea: questions.skillArea,
      correct: sql<number>`SUM(CASE WHEN ${sessionAnswers.isCorrect} = 1 THEN 1 ELSE 0 END)`.as('correct'),
      total: sql<number>`COUNT(*)`.as('total'),
    })
    .from(sessionAnswers)
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .innerJoin(questions, eq(sessionAnswers.questionId, questions.id))
    .where(and(
      eq(sessions.childId, childId),
      isNotNull(sessions.completedAt),
    ))
    .groupBy(questions.subSkill, questions.skillArea)
    .orderBy(sql`COUNT(*) DESC`);

  type SubSkillWithPct = { name: string; accuracy: number; total: number; skillArea: string };
  const subSkillsWithPct: SubSkillWithPct[] = subSkillRows
    .filter(r => r.total >= 3)
    .map(r => ({
      name: r.subSkill,
      accuracy: Math.round((r.correct / r.total) * 100),
      total: r.total,
      skillArea: r.skillArea,
    }));

  // Attach strongest/weakest sub-skill per skill area
  for (const area of Object.keys(skills)) {
    const inArea = subSkillsWithPct.filter(s => s.skillArea === area);
    if (inArea.length > 0) {
      const sorted = [...inArea].sort((a, b) => b.accuracy - a.accuracy);
      skills[area].strongest = { name: sorted[0].name, accuracy: sorted[0].accuracy };
      if (inArea.length > 1) {
        skills[area].weakest = {
          name: sorted[sorted.length - 1].name,
          accuracy: sorted[sorted.length - 1].accuracy,
        };
      }
    }
  }

  // Legacy strings (kept for backwards compatibility)
  const sortedDesc = [...subSkillsWithPct].sort((a, b) => b.accuracy - a.accuracy);
  const sortedAsc = [...subSkillsWithPct].sort((a, b) => a.accuracy - b.accuracy);
  const strengths = sortedDesc.slice(0, 3).map(s => `${s.name} (${s.accuracy}%)`);
  const weaknesses = sortedAsc.slice(0, 3).map(s => `${s.name} (${s.accuracy}%)`);

  // Enriched strong/weak points
  const strongPoints = sortedDesc.slice(0, 3).map(s => ({
    name: s.name,
    accuracy: s.accuracy,
    description: getStrengthDescription(s.name),
  }));
  const weakPoints = sortedAsc.slice(0, 3).map(s => ({
    name: s.name,
    accuracy: s.accuracy,
    skillArea: s.skillArea,
  }));

  // Recommendations (legacy)
  const recommendations: string[] = [];
  for (const w of weaknesses.slice(0, 2)) {
    recommendations.push(`ننصح بالتركيز على ${w} — تحتاج تحسين`);
  }
  for (const s of strengths.slice(0, 1)) {
    recommendations.push(`أداء ممتاز في ${s} — استمر!`);
  }
  if ((progress?.currentStreak ?? 0) > 0) {
    recommendations.push('حاول التدرب يومياً للحفاظ على سلسلة الأيام');
  }
  if (recommendations.length === 0) {
    recommendations.push('ابدأ بالتدريب لمعرفة مستواك!');
  }

  const badges = (progress?.badges as string[] | null) ?? [];

  const overallAccuracy = totals.totalAnswered > 0
    ? Math.round((totals.totalCorrect / totals.totalAnswered) * 100)
    : 0;

  // Peer comparison: average accuracy of children in same age group (completed sessions)
  let peerAvg = 68;
  let peerN = 0;
  try {
    const [peerRow] = await db
      .select({
        avg: sql<number>`COALESCE(AVG(CAST(${sessions.score} AS REAL) * 100.0 / NULLIF(${sessions.totalQuestions}, 0)), 0)`,
        n: sql<number>`COUNT(DISTINCT ${sessions.childId})`,
      })
      .from(sessions)
      .where(and(
        eq(sessions.ageGroup, child.ageGroup),
        isNotNull(sessions.completedAt),
        isNotNull(sessions.childId),
        sql`${sessions.childId} != ${childId}`,
      ));
    if (peerRow) {
      peerAvg = peerRow.avg ? Math.round(peerRow.avg) : 68;
      peerN = peerRow.n ?? 0;
    }
  } catch {
    // Fall back to defaults
  }
  const peerIsEstimated = peerN < 10;
  if (peerIsEstimated) peerAvg = 68;
  // Percentile: simple heuristic from distance to mean
  const percentile = Math.max(5, Math.min(95,
    overallAccuracy >= peerAvg
      ? 50 + Math.round((overallAccuracy - peerAvg) * 1.5)
      : 50 - Math.round((peerAvg - overallAccuracy) * 1.5)
  ));

  // Activity rate: avg sessions/week, avg questions/day, best day of week
  let avgSessionsPerWeek = 0;
  let avgQuestionsPerDay = 0;
  let bestDayOfWeek: string | undefined;
  try {
    const [activityRow] = await db
      .select({
        totalSessions30: sql<number>`COUNT(*)`,
        totalQuestions30: sql<number>`COALESCE(SUM(${sessions.totalQuestions}), 0)`,
      })
      .from(sessions)
      .where(and(
        eq(sessions.childId, childId),
        isNotNull(sessions.completedAt),
        sql`${sessions.completedAt} >= date('now', '-30 days')`,
      ));
    if (activityRow) {
      avgSessionsPerWeek = Math.round((activityRow.totalSessions30 / 30) * 7);
      avgQuestionsPerDay = Math.round(activityRow.totalQuestions30 / 30);
    }

    const dayRows = await db
      .select({
        dow: sql<string>`strftime('%w', ${sessions.completedAt})`.as('dow'),
        avgAcc: sql<number>`COALESCE(AVG(CAST(${sessions.score} AS REAL) * 100.0 / NULLIF(${sessions.totalQuestions}, 0)), 0)`.as('avgAcc'),
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(sessions)
      .where(and(
        eq(sessions.childId, childId),
        isNotNull(sessions.completedAt),
      ))
      .groupBy(sql`strftime('%w', ${sessions.completedAt})`)
      .orderBy(sql`COALESCE(AVG(CAST(${sessions.score} AS REAL) * 100.0 / NULLIF(${sessions.totalQuestions}, 0)), 0) DESC`);
    if (dayRows.length > 0 && dayRows[0].count >= 2) {
      const dayNames: Record<string, string> = {
        '0': 'الأحد', '1': 'الاثنين', '2': 'الثلاثاء', '3': 'الأربعاء',
        '4': 'الخميس', '5': 'الجمعة', '6': 'السبت',
      };
      bestDayOfWeek = dayNames[dayRows[0].dow];
    }
  } catch {
    // ignore
  }

  // Longest correct-answer streak (within any single session)
  let longestCorrectStreak = 0;
  try {
    const answers = await db
      .select({
        sessionId: sessionAnswers.sessionId,
        isCorrect: sessionAnswers.isCorrect,
      })
      .from(sessionAnswers)
      .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
      .where(and(
        eq(sessions.childId, childId),
        isNotNull(sessions.completedAt),
      ))
      .orderBy(sessions.completedAt, sessionAnswers.id);
    let cur = 0;
    let prevSession: string | null = null;
    for (const a of answers) {
      if (a.sessionId !== prevSession) {
        cur = 0;
        prevSession = a.sessionId;
      }
      if (a.isCorrect) {
        cur += 1;
        if (cur > longestCorrectStreak) longestCorrectStreak = cur;
      } else {
        cur = 0;
      }
    }
  } catch {
    // ignore
  }

  const nowIso = new Date().toISOString();
  const nextReportDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const reportData = {
    child: {
      name: child.name,
      age: child.age,
      ageGroup: child.ageGroup,
      createdAt: child.createdAt ?? '',
    },
    stats: {
      totalSessions: totals.totalSessions,
      totalQuestions: totals.totalAnswered,
      overallAccuracy,
      totalPoints: totals.totalPoints,
      currentLevel: progress?.currentLevel ?? 1,
      currentStreak: progress?.currentStreak ?? 0,
      badges,
      longestCorrectStreak,
      avgSessionsPerWeek,
      avgQuestionsPerDay,
      bestDayOfWeek,
    },
    skills,
    weeklyData,
    strengths,
    weaknesses,
    recommendations,
    peerComparison: {
      averageAccuracy: peerAvg,
      percentile,
      isEstimated: peerIsEstimated,
    },
    strongPoints,
    weakPoints,
    generatedAt: nowIso,
    nextReportDate,
  };

  // Generate PDF
  try {
    const pdfBuffer = await generateChildPdf(reportData);

    const today = new Date().toISOString().split('T')[0];
    const filename = `bunyan-report-${child.name}-${today}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (pdfErr) {
    console.error('PDF generation failed:', pdfErr);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
 } catch (err) {
    console.error('child-pdf route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
