import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { checkRateLimit, getIp } from '@/lib/rate-limit-db';

export async function GET(req: NextRequest) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Limit export to 3 times per minute — it dumps the entire DB
  const rl = await checkRateLimit(`export:${getIp(req)}`, 3, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const db = getDb();
  const rows = await db.select().from(questions);

  return new NextResponse(JSON.stringify(rows, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="bunyan-questions-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
