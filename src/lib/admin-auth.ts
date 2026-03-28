import { cookies } from 'next/headers';
import { getDb } from './db';
import { siteContent } from './db/schema';
import { eq, sql } from 'drizzle-orm';

const SESSION_KEY = 'admin_session';

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return false;
  try {
    const db = getDb();
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, SESSION_KEY));
    return !!row && (row.value as string) === token;
  } catch {
    return false;
  }
}

export async function createAdminSession(): Promise<string> {
  const token = crypto.randomUUID();
  const db = getDb();
  await db
    .insert(siteContent)
    .values({ key: SESSION_KEY, value: token as never })
    .onConflictDoUpdate({
      target: siteContent.key,
      set: { value: token as never, updatedAt: sql`CURRENT_TIMESTAMP` },
    });
  return token;
}

export async function invalidateAdminSession(): Promise<void> {
  const db = getDb();
  await db.delete(siteContent).where(eq(siteContent.key, SESSION_KEY));
}
