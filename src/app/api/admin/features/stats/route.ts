import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getDb } from '@/lib/db';
import {
  sessions,
  reviewQueue,
  questionMastery,
  questions,
  featureFlags,
  parents,
  children,
} from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  // Wrap each query so one failure doesn't kill the whole response
  async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
    try { return await fn(); } catch (e) {
      console.error('[features/stats] query failed:', e instanceof Error ? e.message : e);
      return null;
    }
  }

  const [
    pdfStats,
    reviewStats,
    retirementStats,
    accessCounts,
    dailyChallengeStats,
    sessionLimitStats,
    adaptivePathStats,
    weeklyDigestStats,
    dashboardProStats,
    extendedBankStats,
    mockTestsStats,
    premiumStats,
  ] = await Promise.all([
    safe(() => getChildPdfStats(db)),
    safe(() => getReviewModeStats(db)),
    safe(() => getQuestionRetirementStats(db)),
    safe(() => getFeatureAccessCounts(db)),
    safe(() => getDailyChallengeStats(db)),
    safe(() => getSessionLimitStats(db)),
    safe(() => getAdaptivePathStats(db)),
    safe(() => getWeeklyDigestStats(db)),
    safe(() => getDashboardProStats(db)),
    safe(() => getExtendedBankStats(db)),
    safe(() => getMockTestsStats(db)),
    safe(() => getPremiumStats(db)),
  ]);

  const ac = accessCounts ?? {};

  return NextResponse.json({
    child_pdf_report: pdfStats,
    review_mode: reviewStats ? { ...reviewStats, allowedUsers: ac['review_mode'] ?? 0 } : null,
    question_retirement: retirementStats,
    daily_challenge: dailyChallengeStats,
    session_limit: sessionLimitStats,
    adaptive_path: adaptivePathStats,
    weekly_digest: weeklyDigestStats,
    parent_dashboard_pro: dashboardProStats,
    gat_extended_bank: extendedBankStats,
    mock_tests: mockTestsStats,
    mascot_bunaa: { note: 'شخصية تفاعلية — لا بيانات قابلة للقياس' },
    answer_explanations: { note: 'تُعرض مع كل سؤال — لا بيانات منفصلة' },
    _premium: premiumStats,
  });
}

type DB = ReturnType<typeof getDb>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// ─── child_pdf_report ─────────────────────────────────────────────────────────

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
    avgAccuracy: r?.avgAccuracy ?? null,
    recentSessions: recent?.recentSessions ?? 0,
    recentAccuracy: recent?.recentAccuracy ?? null,
  };
}

// ─── review_mode ──────────────────────────────────────────────────────────────

async function getReviewModeStats(db: DB) {
  const [r] = await db
    .select({
      totalItems: sql<number>`COUNT(*)`,
      masteredItems: sql<number>`SUM(CASE WHEN mastered = 1 THEN 1 ELSE 0 END)`,
      pendingItems: sql<number>`SUM(CASE WHEN mastered = 0 AND next_review_at <= datetime('now') THEN 1 ELSE 0 END)`,
      uniqueChildren: sql<number>`COUNT(DISTINCT child_id)`,
      avgTimesWrong: sql<number>`ROUND(AVG(times_wrong), 1)`,
      avgReviewsToMastery: sql<number>`ROUND(AVG(CASE WHEN mastered = 1 THEN times_reviewed ELSE NULL END), 1)`,
    })
    .from(reviewQueue);

  const total = r?.totalItems ?? 0;
  const mastered = r?.masteredItems ?? 0;
  const masteryRate = total > 0 ? Math.max(Math.round((mastered / total) * 100), mastered > 0 ? 1 : 0) : 0;

  return {
    totalItems: total,
    masteredItems: mastered,
    pendingItems: r?.pendingItems ?? 0,
    uniqueChildren: r?.uniqueChildren ?? 0,
    masteryRate,
    avgTimesWrong: total > 0 ? (r?.avgTimesWrong ?? null) : null,
    avgReviewsToMastery: mastered > 0 ? (r?.avgReviewsToMastery ?? null) : null,
  };
}

// ─── question_retirement ──────────────────────────────────────────────────────

async function getQuestionRetirementStats(db: DB) {
  // Get feature flag to determine who actually has access
  const [flag] = await db
    .select({ enabled: featureFlags.enabled, allowedEmails: featureFlags.allowedEmails })
    .from(featureFlags)
    .where(eq(featureFlags.flagKey, 'question_retirement'));

  const emails = (flag?.allowedEmails ?? '').split(',').map((e: string) => e.trim()).filter(Boolean);
  const emailsJson = JSON.stringify(emails);
  const isEnabled = flag?.enabled === 1 ? 1 : 0;

  const [[stats], [pool], ageGroups] = await Promise.all([
    db.all<Row>(sql`
      WITH enabled_children AS (
        SELECT DISTINCT c.id as child_id
        FROM children c
        JOIN parents p ON c.parent_id = p.id
        WHERE p.email IN (SELECT value FROM json_each(${emailsJson}))
          OR (${isEnabled} = 1 AND (
            EXISTS (SELECT 1 FROM premium_subscriptions ps WHERE ps.parent_id = p.id AND ps.status = 'active' AND ps.expires_at > datetime('now'))
            OR EXISTS (SELECT 1 FROM code_activations ca WHERE ca.parent_id = p.id AND ca.status = 'active' AND ca.expires_at > datetime('now'))
          ))
      )
      SELECT
        (SELECT COUNT(*) FROM enabled_children) as enabledChildren,
        (SELECT COUNT(DISTINCT qm.child_id) FROM question_mastery qm
         WHERE qm.child_id IN (SELECT child_id FROM enabled_children)
           AND qm.correct_count >= 5) as benefitingChildren,
        (SELECT COUNT(DISTINCT qm.question_id) FROM question_mastery qm
         WHERE qm.child_id IN (SELECT child_id FROM enabled_children)
           AND qm.correct_count >= 5) as retiredQuestions,
        (SELECT ROUND(AVG(qm.correct_count), 1) FROM question_mastery qm
         WHERE qm.child_id IN (SELECT child_id FROM enabled_children)) as avgCorrectCount
    `),
    db
      .select({ totalQuestions: sql<number>`COUNT(*)` })
      .from(questions)
      .where(eq(questions.isActive, true)),
    db.all<Row>(sql`
      WITH enabled_children AS (
        SELECT DISTINCT c.id as child_id
        FROM children c
        JOIN parents p ON c.parent_id = p.id
        WHERE p.email IN (SELECT value FROM json_each(${emailsJson}))
          OR (${isEnabled} = 1 AND (
            EXISTS (SELECT 1 FROM premium_subscriptions ps WHERE ps.parent_id = p.id AND ps.status = 'active' AND ps.expires_at > datetime('now'))
            OR EXISTS (SELECT 1 FROM code_activations ca WHERE ca.parent_id = p.id AND ca.status = 'active' AND ca.expires_at > datetime('now'))
          ))
      )
      SELECT
        q.age_group as ageGroup,
        COUNT(*) as total,
        (SELECT COUNT(DISTINCT qm.question_id)
         FROM question_mastery qm
         WHERE qm.correct_count >= 5
           AND qm.child_id IN (SELECT child_id FROM enabled_children)
           AND qm.question_id IN (
             SELECT q2.id FROM questions q2
             WHERE q2.age_group = q.age_group AND q2.is_active = 1
           )
        ) as retired
      FROM questions q
      WHERE q.is_active = 1
      GROUP BY q.age_group
    `),
  ]);

  const s = stats?.[0] ?? {};
  const totalQuestions = pool?.totalQuestions ?? 0;
  const retiredQuestions = Number(s.retiredQuestions ?? 0);

  const byAgeGroup = ageGroups.map((ag: Row) => ({
    ageGroup: ag.ageGroup as string,
    total: Number(ag.total ?? 0),
    retired: Number(ag.retired ?? 0),
    depletionPct: Number(ag.total) > 0 ? Math.round((Number(ag.retired) / Number(ag.total)) * 100) : 0,
  }));

  return {
    enabledChildren: Number(s.enabledChildren ?? 0),
    benefitingChildren: Number(s.benefitingChildren ?? 0),
    retiredQuestions,
    avgCorrectCount: s.avgCorrectCount != null ? Number(s.avgCorrectCount) : null,
    totalQuestions,
    depletionPct: totalQuestions > 0 ? Math.round((retiredQuestions / totalQuestions) * 100) : 0,
    byAgeGroup,
  };
}

// ─── daily_challenge ──────────────────────────────────────────────────────────

async function getDailyChallengeStats(db: DB) {
  const [[r], [streaks], [recent]] = await Promise.all([
    db.all<Row>(sql`
      SELECT
        COUNT(DISTINCT challenge_date) as totalDays,
        (SELECT COUNT(DISTINCT child_id) FROM daily_challenge_results) as uniqueChildren,
        (SELECT COUNT(*) FROM daily_challenge_results WHERE is_correct = 1) as correctAnswers,
        (SELECT COUNT(*) FROM daily_challenge_results) as totalAnswers
      FROM daily_challenges
    `),
    db.all<Row>(sql`
      SELECT
        MAX(current_streak) as maxCurrentStreak,
        MAX(longest_streak) as longestStreak,
        SUM(total_stars) as totalStars,
        SUM(total_badges) as totalBadges,
        COUNT(*) as activeStreakers
      FROM daily_streaks
      WHERE current_streak > 0
    `),
    db.all<Row>(sql`
      SELECT COUNT(DISTINCT child_id) as recentChildren
      FROM daily_challenge_results
      WHERE answered_at >= datetime('now', '-7 days')
    `),
  ]);

  const row = r?.[0] ?? {};
  const streakRow = streaks?.[0] ?? {};
  const recentRow = recent?.[0] ?? {};
  const totalAnswers = Number(row.totalAnswers ?? 0);
  const correctAnswers = Number(row.correctAnswers ?? 0);

  return {
    totalDays: Number(row.totalDays ?? 0),
    uniqueChildren: Number(row.uniqueChildren ?? 0),
    totalAnswers,
    correctAnswers,
    accuracy: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : null,
    maxCurrentStreak: Number(streakRow.maxCurrentStreak ?? 0),
    longestStreak: Number(streakRow.longestStreak ?? 0),
    totalStars: Number(streakRow.totalStars ?? 0),
    totalBadges: Number(streakRow.totalBadges ?? 0),
    activeStreakers: Number(streakRow.activeStreakers ?? 0),
    recentChildren: Number(recentRow.recentChildren ?? 0),
  };
}

// ─── session_limit ────────────────────────────────────────────────────────────

async function getSessionLimitStats(db: DB) {
  const today = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Riyadh' }).split(',')[0];

  const [[todayStats], [overall]] = await Promise.all([
    db.all<Row>(sql`
      SELECT
        COUNT(*) as sessionsToday,
        COUNT(DISTINCT COALESCE(child_id, guest_id)) as uniqueUsersToday,
        MAX(cnt) as maxSessionsByOneUser
      FROM (
        SELECT COALESCE(child_id, guest_id) as uid, COUNT(*) as cnt
        FROM sessions
        WHERE DATE(started_at) = ${today} AND completed_at IS NOT NULL
          AND COALESCE(is_daily_challenge, 0) = 0
        GROUP BY uid
      )
    `),
    db.all<Row>(sql`
      SELECT
        COUNT(DISTINCT CASE WHEN cnt >= 3 THEN uid END) as usersHittingLimit,
        ROUND(AVG(cnt), 1) as avgSessionsPerUser
      FROM (
        SELECT COALESCE(child_id, guest_id) as uid, COUNT(*) as cnt
        FROM sessions
        WHERE DATE(started_at) = ${today} AND completed_at IS NOT NULL
          AND COALESCE(is_daily_challenge, 0) = 0
        GROUP BY uid
      )
    `),
  ]);

  const t = todayStats?.[0] ?? {};
  const o = overall?.[0] ?? {};

  return {
    sessionsToday: Number(t.sessionsToday ?? 0),
    uniqueUsersToday: Number(t.uniqueUsersToday ?? 0),
    maxSessionsByOneUser: Number(t.maxSessionsByOneUser ?? 0),
    usersHittingLimit: Number(o.usersHittingLimit ?? 0),
    avgSessionsPerUser: Number(o.avgSessionsPerUser ?? 0),
  };
}

// ─── adaptive_path ────────────────────────────────────────────────────────────

async function getAdaptivePathStats(db: DB) {
  const [rows] = await Promise.all([
    db.all<Row>(sql`
      SELECT
        COUNT(*) as totalSessions,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completedSessions,
        COUNT(DISTINCT child_id) as uniqueChildren,
        ROUND(AVG(CASE WHEN completed = 1 THEN accuracy ELSE NULL END), 1) as avgAccuracy,
        MAX(session_number) as maxSessionNumber
      FROM adaptive_sessions
    `),
  ]);

  const r = rows?.[0] ?? {};
  const total = Number(r.totalSessions ?? 0);
  const completed = Number(r.completedSessions ?? 0);

  return {
    totalSessions: total,
    completedSessions: completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    uniqueChildren: Number(r.uniqueChildren ?? 0),
    avgAccuracy: r.avgAccuracy != null ? Number(r.avgAccuracy) : null,
    maxSessionNumber: Number(r.maxSessionNumber ?? 0),
  };
}

// ─── weekly_digest ────────────────────────────────────────────────────────────

async function getWeeklyDigestStats(db: DB) {
  const [[digest], [unsub], [parentCount]] = await Promise.all([
    db.all<Row>(sql`
      SELECT
        COUNT(*) as totalSent,
        COUNT(DISTINCT parent_id) as uniqueParents,
        MAX(sent_at) as lastSentAt,
        (SELECT COUNT(*) FROM digest_log WHERE sent_at >= datetime('now', '-7 days')) as sentThisWeek
      FROM digest_log
    `),
    db.all<Row>(sql`
      SELECT COUNT(*) as unsubscribed FROM digest_unsubscribe
    `),
    db.select({ v: sql<number>`COUNT(*)` }).from(parents),
  ]);

  const d = digest?.[0] ?? {};
  const u = unsub?.[0] ?? {};
  const totalParents = parentCount?.v ?? 0;
  const unsubscribed = Number(u.unsubscribed ?? 0);

  return {
    totalSent: Number(d.totalSent ?? 0),
    uniqueParents: Number(d.uniqueParents ?? 0),
    lastSentAt: d.lastSentAt as string | null,
    sentThisWeek: Number(d.sentThisWeek ?? 0),
    unsubscribed,
    totalParents,
    subscribedParents: totalParents - unsubscribed,
  };
}

// ─── parent_dashboard_pro ─────────────────────────────────────────────────────

async function getDashboardProStats(db: DB) {
  const [rows] = await Promise.all([
    db.all<Row>(sql`
      SELECT
        COUNT(*) as totalGoals,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeGoals,
        SUM(CASE WHEN status = 'achieved' THEN 1 ELSE 0 END) as achievedGoals,
        SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as abandonedGoals,
        COUNT(DISTINCT child_id) as uniqueChildren
      FROM child_goals
    `),
  ]);

  const r = rows?.[0] ?? {};
  const total = Number(r.totalGoals ?? 0);
  const achieved = Number(r.achievedGoals ?? 0);

  return {
    totalGoals: total,
    activeGoals: Number(r.activeGoals ?? 0),
    achievedGoals: achieved,
    abandonedGoals: Number(r.abandonedGoals ?? 0),
    achievementRate: total > 0 ? Math.round((achieved / total) * 100) : 0,
    uniqueChildren: Number(r.uniqueChildren ?? 0),
  };
}

// ─── gat_extended_bank ────────────────────────────────────────────────────────

async function getExtendedBankStats(db: DB) {
  const rows = await db.all<Row>(sql`
    SELECT
      COALESCE(tier, 'free') as tier,
      COUNT(*) as cnt
    FROM questions
    WHERE is_active = 1
    GROUP BY COALESCE(tier, 'free')
  `);

  let freeCount = 0;
  let premiumCount = 0;
  for (const r of rows) {
    if (r.tier === 'free') freeCount = Number(r.cnt);
    else premiumCount += Number(r.cnt);
  }

  const [sourceRows] = await Promise.all([
    db.all<Row>(sql`
      SELECT
        COALESCE(source, 'original') as source,
        COUNT(*) as cnt
      FROM questions
      WHERE is_active = 1
      GROUP BY COALESCE(source, 'original')
    `),
  ]);

  const sources: Record<string, number> = {};
  for (const r of sourceRows) {
    sources[r.source as string] = Number(r.cnt);
  }

  return {
    totalQuestions: freeCount + premiumCount,
    freeQuestions: freeCount,
    premiumQuestions: premiumCount,
    sources,
  };
}

// ─── mock_tests ───────────────────────────────────────────────────────────────

async function getMockTestsStats(db: DB) {
  const [[tests], [results]] = await Promise.all([
    db.all<Row>(sql`
      SELECT COUNT(*) as totalTests, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as activeTests
      FROM mock_tests
    `),
    db.all<Row>(sql`
      SELECT
        COUNT(*) as totalAttempts,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'timed_out' THEN 1 ELSE 0 END) as timedOut,
        COUNT(DISTINCT child_id) as uniqueChildren,
        ROUND(AVG(CASE WHEN status = 'completed' THEN accuracy ELSE NULL END), 1) as avgAccuracy,
        ROUND(AVG(CASE WHEN status = 'completed' THEN time_spent_seconds ELSE NULL END)) as avgTimeSeconds
      FROM mock_test_results
    `),
  ]);

  const t = tests?.[0] ?? {};
  const r = results?.[0] ?? {};
  const totalAttempts = Number(r.totalAttempts ?? 0);
  const completed = Number(r.completed ?? 0);

  return {
    totalTests: Number(t.totalTests ?? 0),
    activeTests: Number(t.activeTests ?? 0),
    totalAttempts,
    completed,
    timedOut: Number(r.timedOut ?? 0),
    completionRate: totalAttempts > 0 ? Math.round((completed / totalAttempts) * 100) : 0,
    uniqueChildren: Number(r.uniqueChildren ?? 0),
    avgAccuracy: r.avgAccuracy != null ? Number(r.avgAccuracy) : null,
    avgTimeMinutes: r.avgTimeSeconds != null ? Math.round(Number(r.avgTimeSeconds) / 60) : null,
  };
}

// ─── Premium stats (global) ───────────────────────────────────────────────────

async function getPremiumStats(db: DB) {
  const [rows] = await Promise.all([
    db.all<Row>(sql`
      SELECT
        (SELECT COUNT(*) FROM premium_subscriptions WHERE status = 'active' AND expires_at > datetime('now')) as activeSubscriptions,
        (SELECT COUNT(*) FROM code_activations WHERE status = 'active' AND expires_at > datetime('now')) as activeCodeActivations,
        (SELECT COUNT(*) FROM parents) as totalParents
    `),
  ]);

  const r = rows?.[0] ?? {};
  return {
    activeSubscriptions: Number(r.activeSubscriptions ?? 0),
    activeCodeActivations: Number(r.activeCodeActivations ?? 0),
    totalParents: Number(r.totalParents ?? 0),
  };
}

// ─── Feature access counts ────────────────────────────────────────────────────

async function getFeatureAccessCounts(db: DB): Promise<Record<string, number>> {
  const rows = await db
    .select({
      flagKey: featureFlags.flagKey,
      enabled: featureFlags.enabled,
      allowedEmails: featureFlags.allowedEmails,
    })
    .from(featureFlags);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (row.enabled === 1) {
      counts[row.flagKey] = -1;
    } else {
      const emails = (row.allowedEmails ?? '')
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);
      counts[row.flagKey] = emails.length;
    }
  }
  return counts;
}
