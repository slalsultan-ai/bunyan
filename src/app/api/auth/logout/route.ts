import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { parentSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('parent_token')?.value;

  if (token) {
    const db = getDb();
    await db.delete(parentSessions).where(eq(parentSessions.token, token));
    cookieStore.delete('parent_token');
  }

  return Response.json({ success: true });
}
