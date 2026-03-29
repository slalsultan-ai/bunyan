import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { parents, children, emailLog } from '@/lib/db/schema';
import { getWeeklyContent, seedWeeklyContent } from '@/lib/db/seed-weekly-content';
import { sendWeeklyEmail } from '@/lib/email/weekly';
import { eq, and } from 'drizzle-orm';

const MAX_WEEKS = 8;

export async function POST(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();

  // Ensure seed content exists
  const seeded = await seedWeeklyContent();
  if (seeded.inserted > 0) {
    console.log(`Seeded ${seeded.inserted} content entries`);
  }

  // Fetch all parents with weekly email enabled
  const allParents = await db
    .select()
    .from(parents)
    .where(eq(parents.weeklyEmailEnabled, true));

  const results = { sent: 0, failed: 0, skipped: 0 };

  for (const parent of allParents) {
    const weekNumber = parent.currentWeekNumber ?? 1;

    // Stop after 8 weeks
    if (weekNumber > MAX_WEEKS) {
      results.skipped++;
      continue;
    }

    // Get this parent's children
    const childRows = await db
      .select()
      .from(children)
      .where(eq(children.parentId, parent.id));

    if (!childRows.length) {
      results.skipped++;
      continue;
    }

    // Fetch content for each child
    const childrenWithContent = await Promise.all(
      childRows.map(async child => ({
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
        parentId: parent.id,
        weekNumber,
        status: 'sent',
        resendId,
      });

      // Advance week counter
      await db
        .update(parents)
        .set({ currentWeekNumber: weekNumber + 1 })
        .where(eq(parents.id, parent.id));

      results.sent++;
    } catch (err) {
      console.error(`Failed to send email to ${parent.email}:`, err);

      await db.insert(emailLog).values({
        id: crypto.randomUUID(),
        parentId: parent.id,
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
