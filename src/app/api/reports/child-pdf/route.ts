import { NextRequest, NextResponse } from 'next/server';
import { getParentSession } from '@/lib/parent-auth';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { getDb } from '@/lib/db';
import { children, sessions, sessionAnswers, questions, guestProgress, childParents } from '@/lib/db/schema';
import { eq, and, isNotNull, sql, desc } from 'drizzle-orm';
import { generateChildPdf } from '@/lib/pdf/child-report';

export async function GET(req: NextRequest) {
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

  // ── Gather data ─────────────────────────────���────────────────────────────

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

  type SkillInfo = { accuracy: number; totalAnswered: number; trend: 'up' | 'down' | 'stable' };
  const skills: Record<string, SkillInfo> = {
    quantitative: { accuracy: 0, totalAnswered: 0, trend: 'stable' },
    verbal: { accuracy: 0, totalAnswered: 0, trend: 'stable' },
    logical_patterns: { accuracy: 0, totalAnswered: 0, trend: 'stable' },
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
      };
    }
  }

  // Weekly data (last 4 weeks)
  const weeklyRows = await db
    .select({
      week: sql<string>`strftime('%Y-W%W', ${sessions.completedAt})`,
      sessionCount: sql<number>`COUNT(*)`,
      correct: sql<number>`COALESCE(SUM(${sessions.score}), 0)`,
      total: sql<number>`COALESCE(SUM(${sessions.totalQuestions}), 0)`,
      points: sql<number>`COALESCE(SUM(${sessions.pointsEarned}), 0)`,
    })
    .from(sessions)
    .where(and(
      eq(sessions.childId, childId),
      isNotNull(sessions.completedAt),
      sql`${sessions.completedAt} >= date('now', '-28 days')`
    ))
    .groupBy(sql`strftime('%Y-W%W', ${sessions.completedAt})`)
    .orderBy(sql`week`);

  const weekLabels = ['الأسبوع ١', 'الأسبوع ٢', 'الأسبوع ٣', 'الأسبوع ٤'];
  const weeklyData = weeklyRows.map((w, i) => ({
    week: weekLabels[i] ?? `أسبوع ${i + 1}`,
    sessions: w.sessionCount,
    accuracy: w.total > 0 ? Math.round((w.correct / w.total) * 100) : 0,
    points: w.points,
  }));

  // Sub-skill breakdown for strengths/weaknesses
  const subSkillRows = await db
    .select({
      subSkill: questions.subSkill,
      correct: sql<number>`SUM(CASE WHEN ${sessionAnswers.isCorrect} = 1 THEN 1 ELSE 0 END)`,
      total: sql<number>`COUNT(*)`,
    })
    .from(sessionAnswers)
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .innerJoin(questions, eq(sessionAnswers.questionId, questions.id))
    .where(and(
      eq(sessions.childId, childId),
      isNotNull(sessions.completedAt),
    ))
    .groupBy(questions.subSkill)
    .orderBy(sql`total DESC`);

  const subSkillsWithPct = subSkillRows
    .filter(r => r.total >= 3)
    .map(r => ({
      name: r.subSkill,
      accuracy: Math.round((r.correct / r.total) * 100),
      total: r.total,
    }));

  const strengths = subSkillsWithPct
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 3)
    .map(s => `${s.name} (${s.accuracy}٪)`);

  const weaknesses = subSkillsWithPct
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
    .map(s => `${s.name} (${s.accuracy}٪)`);

  // Recommendations
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
    },
    skills,
    weeklyData,
    strengths,
    weaknesses,
    recommendations,
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
}
