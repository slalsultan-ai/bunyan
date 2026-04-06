import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 254) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();

    await db.run(
      sql`INSERT OR IGNORE INTO premium_waitlist (email) VALUES (${normalizedEmail})`
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[premium-waitlist]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
