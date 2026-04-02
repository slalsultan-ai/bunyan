import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getDb } from '@/lib/db';
import { parents, children, emailLog } from '@/lib/db/schema';
import { getWeeklyContent, seedWeeklyContent } from '@/lib/db/seed-weekly-content';
import { sendWeeklyEmail } from '@/lib/email/weekly';
import { eq } from 'drizzle-orm';

const MAX_WEEKS = 8;

export async function POST(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const authBuf = Buffer.from(auth);
  const expectedBuf = Buffer.from(expected);
  if (authBuf.length !== expectedBuf.length || !timingSafeEqual(authBuf, expectedBuf)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  // Ensure seed content exists
  const seeded = await seedWeeklyContent();
  if (seeded.inserted > 0) {
    console.log(`Seeded ${seeded.inserted} content entries`);
  }

  // Fetch all parents with weekly email enabled + their children in one query
  const parentChildRows = await db
    .select({
      parentId: parents.id,
      email: parents.email,
      weekNumber: parents.currentWeekNumber,
      unsubscribeToken: parents.unsubscribeToken,
      childName: children.name,
      childAge: children.age,
      childAgeGroup: children.ageGroup,
    })
    .from(parents)
    .innerJoin(children, eq(children.parentId, parents.id))
    .where(eq(parents.weeklyEmailEnabled, true));

  // Group by parent
  const parentMap = new Map<string, {
    email: string;
    weekNumber: number;
    unsubscribeToken: string;
    children: { name: string; age: number; ageGroup: string }[];
  }>();

  for (const row of parentChildRows) {
    const wk = row.weekNumber ?? 1;
    if (!parentMap.has(row.parentId)) {
      parentMap.set(row.parentId, {
        email: row.email,
        weekNumber: wk,
        unsubscribeToken: row.unsubscribeToken,
        children: [],
      });
    }
    parentMap.get(row.parentId)!.children.push({
      name: row.childName,
      age: row.childAge,
      ageGroup: row.childAgeGroup,
    });
  }

  const results = { sent: 0, failed: 0, skipped: 0 };

  for (const [parentId, parent] of parentMap) {
    const weekNumber = parent.weekNumber;

    // Stop after 8 weeks
    if (weekNumber > MAX_WEEKS) {
      results.skipped++;
      continue;
    }

    // Fetch content for each child
    const childrenWithContent = await Promise.all(
      parent.children.map(async child => ({
        name: child.name,
        age: child.age,
        ageGroup: child.ageGroup,
        content: await getWeeklyContent(weekNumber, child.ageGroup),
      }))
    );

    const hasContent = childrenWithContent.some(c => c.content !== null);
    if (!hasContent) {
      results.skipped++;
      continue;
    }

    try {
      const resendId = await sendWeeklyEmail(
        parent.email,
        weekNumber,
        childrenWithContent,
        parent.unsubscribeToken,
      );

      // Log success
      await db.insert(emailLog).values({
        id: crypto.randomUUID(),
        parentId,
        weekNumber,
        status: 'sent',
        resendId,
      });

      // Advance week counter
      await db
        .update(parents)
        .set({ currentWeekNumber: weekNumber + 1 })
        .where(eq(parents.id, parentId));

      results.sent++;
    } catch (err) {
      console.error(`Failed to send email to parent ${parentId}:`, err);

      await db.insert(emailLog).values({
        id: crypto.randomUUID(),
        parentId,
        weekNumber,
        status: 'failed',
      });

      results.failed++;
    }
  }

  return Response.json({ success: true, ...results });
}

// Also allow GET for Vercel Cron (which sends GET requests)
export async function GET(req: NextRequest) {
  return POST(req);
}
