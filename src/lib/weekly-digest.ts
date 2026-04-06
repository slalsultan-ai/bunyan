import { getDb } from './db';
import { sessions, sessionAnswers, questions, children, parents } from './db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { selectActivity } from './home-activities';
import { calculateWeeklyImprovement, generatePredictionMessage } from './predictions';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WeeklyDigestData {
  child: { name: string; ageGroup: string; id: string };
  parent: { email: string; id: string };
  period: { from: string; to: string };
  thisWeek: { sessions: number; questions: number; accuracy: number; points: number; daysActive: number };
  lastWeek: { sessions: number; questions: number; accuracy: number; points: number; daysActive: number };
  comparison: { sessionsChange: number; accuracyChange: number; trend: 'improving' | 'stable' | 'declining'; trendMessage: string };
  highlights: {
    bestSubSkill: { name: string; accuracy: number } | null;
    worstSubSkill: { name: string; accuracy: number } | null;
    newAchievements: string[];
    streak: number;
  };
  recommendation: { activity: string; reason: string; duration: string };
  noActivity: boolean;
  predictionMessage: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWeekBounds(): { thisWeekStart: string; thisWeekEnd: string; lastWeekStart: string; lastWeekEnd: string } {
  const now = new Date();
  // Get last Sunday (start of this week in Riyadh)
  const riyadhNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const day = riyadhNow.getDay(); // 0 = Sunday
  const thisWeekStart = new Date(riyadhNow);
  thisWeekStart.setDate(riyadhNow.getDate() - day);
  thisWeekStart.setHours(0, 0, 0, 0);

  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
  thisWeekEnd.setHours(23, 59, 59, 999);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
  lastWeekEnd.setHours(23, 59, 59, 999);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return {
    thisWeekStart: fmt(thisWeekStart),
    thisWeekEnd: fmt(thisWeekEnd),
    lastWeekStart: fmt(lastWeekStart),
    lastWeekEnd: fmt(lastWeekEnd),
  };
}

// ─── Core ───────────────────────────────────────────────────────────────────

async function getWeekStats(childId: string, weekStart: string, weekEnd: string) {
  const db = getDb();

  const [row] = await db
    .select({
      sessionCount: sql<number>`COUNT(DISTINCT sessions.id)`,
      questionCount: sql<number>`COUNT(session_answers.id)`,
      correctCount: sql<number>`SUM(CASE WHEN session_answers.is_correct = 1 THEN 1 ELSE 0 END)`,
      totalPoints: sql<number>`COALESCE(SUM(sessions.points_earned), 0)`,
      daysActive: sql<number>`COUNT(DISTINCT DATE(sessions.started_at))`,
    })
    .from(sessions)
    .leftJoin(sessionAnswers, eq(sessionAnswers.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.childId, childId),
        sql`sessions.completed_at IS NOT NULL`,
        sql`DATE(sessions.started_at) >= ${weekStart}`,
        sql`DATE(sessions.started_at) <= ${weekEnd}`
      )
    );

  const questionCount = row?.questionCount ?? 0;
  const correctCount = row?.correctCount ?? 0;
  return {
    sessions: row?.sessionCount ?? 0,
    questions: questionCount,
    accuracy: questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0,
    points: row?.totalPoints ?? 0,
    daysActive: row?.daysActive ?? 0,
  };
}

async function getSubSkillStats(childId: string, weekStart: string, weekEnd: string) {
  const db = getDb();
  const rows = await db
    .select({
      subSkill: questions.subSkill,
      total: sql<number>`COUNT(*)`,
      correct: sql<number>`SUM(CASE WHEN session_answers.is_correct = 1 THEN 1 ELSE 0 END)`,
    })
    .from(sessionAnswers)
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .innerJoin(questions, eq(sessionAnswers.questionId, questions.id))
    .where(
      and(
        eq(sessions.childId, childId),
        sql`sessions.completed_at IS NOT NULL`,
        sql`DATE(sessions.started_at) >= ${weekStart}`,
        sql`DATE(sessions.started_at) <= ${weekEnd}`
      )
    )
    .groupBy(questions.subSkill);

  return rows.map((r) => ({
    subSkill: r.subSkill,
    accuracy: r.total > 0 ? Math.round(((r.correct ?? 0) / r.total) * 100) : 0,
    total: r.total,
  }));
}

/**
 * Collect weekly digest data for a single child.
 */
export async function collectWeeklyData(childId: string, parentId: string): Promise<WeeklyDigestData> {
  const db = getDb();
  const { thisWeekStart, thisWeekEnd, lastWeekStart, lastWeekEnd } = getWeekBounds();

  // Get child and parent info
  const [child] = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const [parent] = await db.select().from(parents).where(eq(parents.id, parentId)).limit(1);

  const thisWeek = await getWeekStats(childId, thisWeekStart, thisWeekEnd);
  const lastWeek = await getWeekStats(childId, lastWeekStart, lastWeekEnd);
  const noActivity = thisWeek.sessions === 0;

  // Comparison
  const sessionsChange = thisWeek.sessions - lastWeek.sessions;
  const accuracyChange = thisWeek.accuracy - lastWeek.accuracy;
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  let trendMessage = 'أداء مستقر — استمر!';
  if (accuracyChange > 5) { trend = 'improving'; trendMessage = 'تحسّن ملحوظ! استمروا على هذا المستوى.'; }
  else if (accuracyChange < -5) { trend = 'declining'; trendMessage = 'يحتاج تركيز أكثر هذا الأسبوع.'; }

  // Sub-skill highlights
  const subSkills = await getSubSkillStats(childId, thisWeekStart, thisWeekEnd);
  const sorted = [...subSkills].sort((a, b) => a.accuracy - b.accuracy);
  const worstSubSkill = sorted.length > 0 ? { name: sorted[0].subSkill, accuracy: sorted[0].accuracy } : null;
  const bestSubSkill = sorted.length > 0 ? { name: sorted[sorted.length - 1].subSkill, accuracy: sorted[sorted.length - 1].accuracy } : null;

  // Daily challenge streak
  let streak = 0;
  try {
    const [streakRow] = await db.select().from(sql`daily_streaks`).where(sql`child_id = ${childId}`).limit(1) as any[];
    streak = streakRow?.current_streak ?? 0;
  } catch { /* table might not exist yet */ }

  // Recommendation
  const activityData = selectActivity(worstSubSkill?.name ?? null, child?.ageGroup ?? '6-9');
  const reason = worstSubSkill ? `لأن ${worstSubSkill.name} يحتاج تعزيز` : 'للتعزيز العام';

  // Prediction
  // Gather last 4 weeks of accuracy for prediction
  const weeklyAccuracies: number[] = [];
  for (let i = 3; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - (i + 1) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const stats = await getWeekStats(childId, start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
    if (stats.questions > 0) weeklyAccuracies.push(stats.accuracy);
  }
  const weeklyImprovement = calculateWeeklyImprovement(weeklyAccuracies);
  const predictionMessage = generatePredictionMessage(child?.name ?? '', thisWeek.accuracy || lastWeek.accuracy, weeklyImprovement);

  return {
    child: { name: child?.name ?? '', ageGroup: child?.ageGroup ?? '6-9', id: childId },
    parent: { email: parent?.email ?? '', id: parentId },
    period: { from: thisWeekStart, to: thisWeekEnd },
    thisWeek,
    lastWeek,
    comparison: { sessionsChange, accuracyChange, trend, trendMessage },
    highlights: { bestSubSkill, worstSubSkill, newAchievements: [], streak },
    recommendation: { activity: activityData.activity, reason, duration: activityData.duration },
    noActivity,
    predictionMessage,
  };
}

/**
 * Collect digest data for all children of a parent.
 */
export async function collectAllChildrenDigest(parentId: string): Promise<WeeklyDigestData[]> {
  const db = getDb();
  const childRows = await db.select().from(children).where(eq(children.parentId, parentId));
  const results: WeeklyDigestData[] = [];
  for (const child of childRows) {
    results.push(await collectWeeklyData(child.id, parentId));
  }
  return results;
}
