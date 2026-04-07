import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getAllFlags, hasFeatureAccess } from '@/lib/feature-flags';
import { getParentSession } from '@/lib/parent-auth';

/**
 * Comprehensive diagnostic endpoint for feature flags system.
 * Tests every part of the chain: DB → flags → email matching → API access.
 */
export async function GET(req: NextRequest) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const testEmail = req.nextUrl.searchParams.get('email');
  const results: Record<string, unknown> = {};

  // 1. Check DB connection
  try {
    const db = getDb();
    const [row] = await db.select({ cnt: sql<number>`1` }).from(sql`sqlite_master`).limit(1);
    results.dbConnection = { ok: true };
  } catch (e) {
    results.dbConnection = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // 2. Check feature_flags table exists
  try {
    const db = getDb();
    const rows = await db
      .select({ name: sql<string>`name` })
      .from(sql`sqlite_master`)
      .where(sql`type = 'table' AND name = 'feature_flags'`);
    results.tableExists = rows.length > 0;
  } catch (e) {
    results.tableExists = false;
    results.tableError = e instanceof Error ? e.message : String(e);
  }

  // 3. Get all flags raw from DB
  try {
    const db = getDb();
    const rawFlags = await db
      .select({
        id: sql<number>`id`,
        flagKey: sql<string>`flag_key`,
        title: sql<string>`title`,
        enabled: sql<number>`enabled`,
        allowedEmails: sql<string>`allowed_emails`,
      })
      .from(sql`feature_flags`)
      .orderBy(sql`id`);

    results.rawFlags = rawFlags.map((f) => ({
      id: f.id,
      flagKey: f.flagKey,
      title: f.title,
      enabled: f.enabled,
      allowedEmails: f.allowedEmails || '(empty)',
      allowedEmailsList: f.allowedEmails
        ? f.allowedEmails.split(',').map((e: string) => e.trim()).filter(Boolean)
        : [],
    }));
    results.totalFlags = rawFlags.length;
  } catch (e) {
    results.rawFlags = [];
    results.flagsError = e instanceof Error ? e.message : String(e);
  }

  // 4. Test getAllFlags() function
  try {
    const flags = await getAllFlags();
    results.getAllFlagsResult = flags.map((f) => ({
      flagKey: f.flagKey,
      enabled: f.enabled,
      allowedEmails: f.allowedEmails,
    }));
  } catch (e) {
    results.getAllFlagsError = e instanceof Error ? e.message : String(e);
  }

  // 5. Test hasFeatureAccess for each flag with test email
  if (testEmail) {
    try {
      const flags = await getAllFlags();
      const accessResults: Record<string, { access: boolean; reason: string }> = {};

      for (const flag of flags) {
        const access = await hasFeatureAccess(flag.flagKey, testEmail);
        let reason: string;
        if (flag.enabled) {
          reason = 'globally enabled → access granted to everyone';
        } else if (!testEmail) {
          reason = 'flag disabled + no email → denied';
        } else {
          const emails = flag.allowedEmails
            .split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);
          const emailLower = testEmail.toLowerCase();
          if (emails.includes(emailLower)) {
            reason = `flag disabled but email "${testEmail}" found in allowed list → granted`;
          } else {
            reason = `flag disabled and email "${testEmail}" NOT in allowed list [${emails.join(', ')}] → denied`;
          }
        }
        accessResults[flag.flagKey] = { access, reason };
      }

      results.emailTest = {
        email: testEmail,
        results: accessResults,
      };
    } catch (e) {
      results.emailTestError = e instanceof Error ? e.message : String(e);
    }
  }

  // 6. Test current session (who is the logged-in parent?)
  try {
    const session = await getParentSession();
    results.currentSession = session
      ? { parentId: session.parentId, email: session.email }
      : null;

    // If session exists, test features for that email
    if (session?.email) {
      const flags = await getAllFlags();
      const sessionAccess: Record<string, boolean> = {};
      for (const flag of flags) {
        sessionAccess[flag.flagKey] = await hasFeatureAccess(flag.flagKey, session.email);
      }
      results.sessionFeatureAccess = {
        email: session.email,
        features: sessionAccess,
      };
    }
  } catch (e) {
    results.sessionError = e instanceof Error ? e.message : String(e);
  }

  // 7. Check _migrations table
  try {
    const db = getDb();
    const migrations = await db
      .select({ name: sql<string>`name`, appliedAt: sql<string>`applied_at` })
      .from(sql`_migrations`)
      .orderBy(sql`name`);
    results.migrations = {
      total: migrations.length,
      latest: migrations.length > 0 ? migrations[migrations.length - 1] : null,
      featureFlagMigrations: migrations.filter((m) =>
        ['015_feature_flags.sql', '024_phase1_features.sql', '026_phase2_features.sql', '028_phase3_features.sql', '030_phase4_features.sql', '033_phase5_features.sql'].includes(m.name)
      ),
    };
  } catch (e) {
    results.migrationsError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(results, { status: 200 });
}
