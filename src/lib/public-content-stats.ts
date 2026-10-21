/**
 * Question counts shown on public pages (home stats, plans page). Read from
 * the bank instead of hard-coded copy so every page states the same number.
 * Only the publicly offered age groups count; feature-flagged tracks such as
 * Mawhiba are excluded until they launch.
 */

import { and, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from './db';
import { questions } from './db/schema';
import type { PublicContentStats } from './public-content-format';

export type { PublicContentStats } from './public-content-format';

export const PUBLIC_AGE_GROUPS = ['4-5', '6-9', '10-12'] as const;
export const PUBLIC_SKILL_AREAS = ['quantitative', 'verbal', 'logical_patterns'] as const;

export async function getPublicContentStats(): Promise<PublicContentStats> {
  const rows = await getDb()
    .select({
      tier: sql<string>`COALESCE(tier, 'free')`,
      count: sql<number>`COUNT(*)`,
    })
    .from(questions)
    .where(and(eq(questions.isActive, true), inArray(questions.ageGroup, [...PUBLIC_AGE_GROUPS])))
    .groupBy(sql`COALESCE(tier, 'free')`);

  let free = 0;
  let premium = 0;
  for (const r of rows) {
    if (r.tier === 'premium') premium += Number(r.count);
    else free += Number(r.count);
  }
  return {
    total: free + premium,
    free,
    premium,
    ageGroups: PUBLIC_AGE_GROUPS.length,
    skillAreas: PUBLIC_SKILL_AREAS.length,
  };
}
