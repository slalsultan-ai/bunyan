import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
