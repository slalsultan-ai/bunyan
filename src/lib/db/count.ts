import { getDb } from './index';
import { questions } from './schema';
import { sql } from 'drizzle-orm';

async function main() {
  const db = getDb();
  const [r] = await db.select({ cnt: sql<number>`COUNT(*)` }).from(questions);
  console.log('Total:', r.cnt);
  const byAge = await db.select({ age: questions.ageGroup, cnt: sql<number>`COUNT(*)` }).from(questions).groupBy(questions.ageGroup);
  const bySkill = await db.select({ skill: questions.skillArea, cnt: sql<number>`COUNT(*)` }).from(questions).groupBy(questions.skillArea);
  console.log('By age:', JSON.stringify(byAge));
  console.log('By skill:', JSON.stringify(bySkill));
  process.exit(0);
}
main();
