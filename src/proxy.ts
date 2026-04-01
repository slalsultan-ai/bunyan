import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getDb } from '@/lib/db';
import { adminSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function isValidToken(rawToken: string): Promise<boolean> {
  try {
    const db = getDb();
    const tokenHash = hashToken(rawToken);
    const [session] = await db.select()
      .from(adminSessions)
      .where(eq(adminSessions.tokenHash, tokenHash))
      .limit(1);

    if (!session) return false;
    if (new Date(session.expiresAt) < new Date()) return false;
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (pathname.startsWith('/admin/login')) return NextResponse.next();

  const token = request.cookies.get('admin_token')?.value;
  if (!token) return NextResponse.redirect(new URL('/admin/login', request.url));

  if (!await isValidToken(token)) {
    const res = NextResponse.redirect(new URL('/admin/login', request.url));
    res.cookies.delete('admin_token');
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
