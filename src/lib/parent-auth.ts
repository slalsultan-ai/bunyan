import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb } from './db';
import { parents, parentSessions } from './db/schema';
import { eq, lt, and } from 'drizzle-orm';

const COOKIE_NAME = 'parent_token';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface ParentSession {
  parentId: string;
  email: string;
}

export function computeAgeGroup(age: number): '4-5' | '6-9' | '10-12' {
  if (age <= 5) return '4-5';
  if (age <= 9) return '6-9';
  return '10-12';
}

export async function createParentSession(parentId: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const db = getDb();

  // Purge expired sessions for this parent to keep table lean
  await db
    .delete(parentSessions)
    .where(and(eq(parentSessions.parentId, parentId), lt(parentSessions.expiresAt, new Date().toISOString())));

  await db.insert(parentSessions).values({
    id: crypto.randomUUID(),
    parentId,
    token,
    expiresAt,
  });

  return token;
}

export async function getParentSession(): Promise<ParentSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const db = getDb();
  const [row] = await db
    .select({
      parentId: parentSessions.parentId,
      expiresAt: parentSessions.expiresAt,
      token: parentSessions.token,
      email: parents.email,
    })
    .from(parentSessions)
    .innerJoin(parents, eq(parentSessions.parentId, parents.id))
    .where(eq(parentSessions.token, token))
    .limit(1);

  if (!row) return null;
  if (new Date(row.expiresAt) < new Date()) {
    // Expired — delete it
    await db.delete(parentSessions).where(eq(parentSessions.token, token));
    return null;
  }

  return { parentId: row.parentId, email: row.email };
}

export async function isParentAuthenticated(): Promise<boolean> {
  const session = await getParentSession();
  return session !== null;
}

export async function setParentCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  });
}

export async function clearParentCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function invalidateParentSession(token: string): Promise<void> {
  const db = getDb();
  await db.delete(parentSessions).where(eq(parentSessions.token, token));
}

// Returns parent row with children, or null if not authenticated
export async function getAuthenticatedParent() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const db = getDb();
  const [row] = await db
    .select()
    .from(parentSessions)
    .innerJoin(parents, eq(parentSessions.parentId, parents.id))
    .where(eq(parentSessions.token, token))
    .limit(1);

  if (!row) return null;
  if (new Date(row.parent_sessions.expiresAt) < new Date()) {
    await db.delete(parentSessions).where(eq(parentSessions.token, token));
    return null;
  }

  return row.parents;
}

// Constant-time token comparison helper
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

async function hashCode(code: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export { hashCode };
