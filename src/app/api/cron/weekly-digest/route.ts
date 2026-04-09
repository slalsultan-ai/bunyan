import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getDb } from '@/lib/db';
import { parents, children } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { collectAllChildrenDigest } from '@/lib/weekly-digest';
import { renderWeeklyDigestEmail } from '@/lib/email-templates/weekly-digest';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  // Auth: verify cron secret
  const auth = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const authBuf = Buffer.from(auth);
  const expectedBuf = Buffer.from(expected);
  if (authBuf.length !== expectedBuf.length || !timingSafeEqual(authBuf, expectedBuf)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check feature flag (globally disabled = skip entirely)
  const { getAllFlags } = await import('@/lib/feature-flags');
  const allFlags = await getAllFlags();
  const digestFlag = allFlags.find(f => f.flagKey === 'weekly_digest');
  if (!digestFlag || digestFlag.activationMode === 'allowed_only') {
    return Response.json({ message: 'weekly_digest flag is not active', sent: 0 });
  }

  const db = getDb();

  try {
    // Get all parents with children, excluding unsubscribed
    const parentRows = await db
      .select({ id: parents.id, email: parents.email })
      .from(parents)
      .where(sql`id NOT IN (SELECT parent_id FROM digest_unsubscribe)`);

    // Calculate week bounds for dedup
    const now = new Date();
    const riyadhNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
    const day = riyadhNow.getDay();
    const weekStart = new Date(riyadhNow);
    weekStart.setDate(riyadhNow.getDate() - day);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = new Date(weekStart.getTime() + 6 * 86400000).toISOString().split('T')[0];

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const parent of parentRows) {
      try {
        // Check if parent has premium access to weekly_digest
        const parentAccess = await hasFeatureAccess('weekly_digest', parent.email, parent.id);
        if (!parentAccess) { skipped++; continue; }

        // Check if already sent this week
        const [existing] = await db
          .select()
          .from(sql`digest_log`)
          .where(sql`parent_id = ${parent.id} AND week_start = ${weekStartStr}`)
          .limit(1) as any[];

        if (existing) { skipped++; continue; }

        // Check if parent has children
        const childRows = await db.select({ id: children.id }).from(children).where(eq(children.parentId, parent.id));
        if (childRows.length === 0) { skipped++; continue; }

        // Collect data for all children
        const allData = await collectAllChildrenDigest(parent.id);
        if (allData.length === 0) { skipped++; continue; }

        // Render email
        const html = renderWeeklyDigestEmail(allData);

        // Send via Resend
        await resend.emails.send({
          from: 'بُنيان <noreply@bunyan.guru>',
          to: parent.email,
          subject: `📊 ملخص أسبوع ${allData.map(d => d.child.name).join(' و ')} في بُنيان`,
          html,
        });

        // Log
        await db.run(
          sql`INSERT OR IGNORE INTO digest_log (parent_id, week_start, week_end, children_count)
              VALUES (${parent.id}, ${weekStartStr}, ${weekEndStr}, ${allData.length})`
        );

        sent++;
      } catch (e) {
        console.error(`[weekly-digest] Failed for parent ${parent.id}:`, e);
        failed++;
      }
    }

    return Response.json({ success: true, sent, failed, skipped });
  } catch (e) {
    console.error('[weekly-digest cron error]', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
