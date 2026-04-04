import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getDb } from '@/lib/db';
import {
  sessions,
  reviewQueue,
  questionMastery,
  questions,
} from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  const [pdfStats, reviewStats, retirementStats] = await Promise.all([
    getChildPdfStats(db),
    getReviewModeStats(db),
    getQuestionRetirementStats(db),
  ]);

  return NextResponse.json({
    child_pdf_report: pdfStats,
    review_mode: reviewStats,
    question_retirement: retirementStats,
  });
}

type DB = ReturnType<typeof getDb>;

async function getChildPdfStats(db: DB) {
  const [[r], [recent]] = await Promise.all([
    db
      .select({
        totalChildren: sql<number>`(SELECT COUNT(*) FROM children)`,
        childrenWithSessions: sql<number>`COUNT(DISTINCT child_id)`,
        totalCompletedSessions: sql<number>`COUNT(*)`,
        avgAccuracy: sql<number>`ROUND(AVG(CASE WHEN total_questions > 0 THEN score * 100.0 / total_questions ELSE NULL END), 1)`,
      })
      .from(sessions)
      .where(sql`completed_at IS NOT NULL AND child_id IS NOT NULL`),
    // Last 7 days activity
    db
      .select({
        recentSessions: sql<number>`COUNT(*)`,
        recentAccuracy: sql<number>`ROUND(AVG(CASE WHEN total_questions > 0 THEN score * 100.0 / total_questions ELSE NULL END), 1)`,
      })
      .from(sessions)
      .where(sql`completed_at IS NOT NULL AND child_id IS NOT NULL AND completed_at >= datetime('now', '-7 days')`),
  ]);

  return {
    totalChildren: r?.totalChildren ?? 0,
    childrenWithSessions: r?.childrenWithSessions ?? 0,
    totalCompletedSessions: r?.totalCompletedSessions ?? 0,
    avgAccuracy: r?.avgAccuracy ?? 0,
    recentSessions: recent?.recentSessions ?? 0,
    recentAccuracy: recent?.recentAccuracy ?? 0,
  };
}

async function getReviewModeStats(db: DB) {
  const [[r], [recentMastered]] = await Promise.all([
    db
      .select({
        totalItems: sql<number>`COUNT(*)`,
        masteredItems: sql<number>`SUM(CASE WHEN mastered = 1 THEN 1 ELSE 0 END)`,
        pendingItems: sql<number>`SUM(CASE WHEN mastered = 0 AND next_review_at <= datetime('now') THEN 1 ELSE 0 END)`,
        uniqueUsers: sql<number>`COUNT(DISTINCT COALESCE(child_id, guest_id))`,
        avgTimesWrong: sql<number>`ROUND(AVG(times_wrong), 1)`,
        avgReviewsToMastery: sql<number>`ROUND(AVG(CASE WHEN mastered = 1 THEN times_reviewed ELSE NULL END), 1)`,
      })
      .from(reviewQueue),
    // Mastered in last 7 days
    db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(reviewQueue)
      .where(sql`mastered = 1 AND created_at >= datetime('now', '-7 days')`),
  ]);

  const total = r?.totalItems ?? 0;
  const mastered = r?.masteredItems ?? 0;

  return {
    totalItems: total,
    masteredItems: mastered,
    pendingItems: r?.pendingItems ?? 0,
    uniqueUsers: r?.uniqueUsers ?? 0,
    masteryRate: total > 0 ? Math.round((mastered / total) * 100) : 0,
    avgTimesWrong: r?.avgTimesWrong ?? 0,
    avgReviewsToMastery: r?.avgReviewsToMastery ?? 0,
    recentMastered: recentMastered?.count ?? 0,
  };
}

async function getQuestionRetirementStats(db: DB) {
  const [[r], [pool], ageGroups] = await Promise.all([
    db
      .select({
        totalRetired: sql<number>`SUM(CASE WHEN correct_count >= 5 THEN 1 ELSE 0 END)`,
        totalTracked: sql<number>`COUNT(*)`,
        uniqueUsers: sql<number>`COUNT(DISTINCT COALESCE(child_id, guest_id))`,
        avgCorrectCount: sql<number>`ROUND(AVG(correct_count), 1)`,
      })
      .from(questionMastery),
    db
      .select({ totalQuestions: sql<number>`COUNT(*)` })
      .from(questions)
      .where(eq(questions.isActive, true)),
    // Per-age-group pool sizes
    db
      .select({
        ageGroup: questions.ageGroup,
        total: sql<number>`COUNT(*)`,
        retired: sql<number>`(
          SELECT COUNT(DISTINCT qm.question_id)
          FROM question_mastery qm
          WHERE qm.correct_count >= 5
            AND qm.question_id IN (
              SELECT q2.id FROM questions q2
              WHERE q2.age_group = questions.age_group AND q2.is_active = 1
            )
        )`,
      })
      .from(questions)
      .where(eq(questions.isActive, true))
      .groupBy(questions.ageGroup),
  ]);

  const tracked = r?.totalTracked ?? 0;
  const retired = r?.totalRetired ?? 0;

  const byAgeGroup = ageGroups.map((ag) => ({
    ageGroup: ag.ageGroup,
    total: ag.total,
    retired: ag.retired,
    depletionPct: ag.total > 0 ? Math.round((ag.retired / ag.total) * 100) : 0,
  }));

  return {
    totalRetired: retired,
    totalTracked: tracked,
    uniqueUsers: r?.uniqueUsers ?? 0,
    avgCorrectCount: r?.avgCorrectCount ?? 0,
    totalQuestions: pool?.totalQuestions ?? 0,
    retirementRate: tracked > 0 ? Math.round((retired / tracked) * 100) : 0,
    byAgeGroup,
  };
}
