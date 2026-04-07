import { getDb } from '../db';
import { sessions } from '../db/schema';
import { sql, eq, and } from 'drizzle-orm';

/**
 * Check if the child is returning after 3+ days of inactivity.
 */
export async function checkComebackStatus(childId: string): Promise<{
  isComeback: boolean;
  daysSinceLastActivity: number;
}> {
  try {
    const db = getDb();

    const [row] = await db
      .select({ lastDate: sql<string>`MAX(started_at)` })
      .from(sessions)
      .where(and(eq(sessions.childId, childId), sql`completed_at IS NOT NULL`));

    if (!row?.lastDate) {
      return { isComeback: false, daysSinceLastActivity: 0 };
    }

    const lastActivity = new Date(row.lastDate);
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      isComeback: daysSince >= 3,
      daysSinceLastActivity: daysSince,
    };
  } catch {
    return { isComeback: false, daysSinceLastActivity: 0 };
  }
}

/**
 * Check if this is the child's first ever visit (0 completed sessions).
 */
export async function checkFirstVisit(childId: string): Promise<boolean> {
  try {
    const db = getDb();

    const [row] = await db
      .select({ cnt: sql<number>`COUNT(*)` })
      .from(sessions)
      .where(and(eq(sessions.childId, childId), sql`completed_at IS NOT NULL`));

    return (row?.cnt ?? 0) === 0;
  } catch {
    return false;
  }
}

/**
 * Check if a specific skill is improving for the child.
 * Compares average accuracy of the last 3 sessions vs the 3 before that.
 */
export async function checkSkillImprovement(childId: string): Promise<{
  improving: boolean;
  skillName?: string;
}> {
  try {
    const db = getDb();

    // Get last 6 sessions with accuracy
    const recentSessions = await db
      .select({
        skillArea: sessions.skillArea,
        score: sessions.score,
        totalQuestions: sessions.totalQuestions,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.childId, childId),
          sql`completed_at IS NOT NULL`,
          sql`score IS NOT NULL`
        )
      )
      .orderBy(sql`completed_at DESC`)
      .limit(6);

    if (recentSessions.length < 4) {
      return { improving: false };
    }

    // Split into recent 3 and previous 3
    const recent3 = recentSessions.slice(0, 3);
    const prev3 = recentSessions.slice(3, 6);

    if (prev3.length < 1) {
      return { improving: false };
    }

    const calcAvg = (list: typeof recentSessions) => {
      const total = list.reduce(
        (acc, s) => ({
          score: acc.score + (s.score ?? 0),
          questions: acc.questions + (s.totalQuestions ?? 0),
        }),
        { score: 0, questions: 0 }
      );
      return total.questions > 0 ? (total.score / total.questions) * 100 : 0;
    };

    const recentAvg = calcAvg(recent3);
    const prevAvg = calcAvg(prev3);

    const improvement = recentAvg - prevAvg;
    if (improvement >= 15) {
      // Find the dominant skill area in recent sessions
      const skillCounts = new Map<string, number>();
      for (const s of recent3) {
        skillCounts.set(s.skillArea, (skillCounts.get(s.skillArea) ?? 0) + 1);
      }
      const topSkill = [...skillCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

      const skillNames: Record<string, string> = {
        quantitative: 'الكمي',
        verbal: 'اللفظي',
        logical_patterns: 'المنطقي',
      };

      return {
        improving: true,
        skillName: topSkill ? skillNames[topSkill] ?? topSkill : undefined,
      };
    }

    return { improving: false };
  } catch {
    return { improving: false };
  }
}
