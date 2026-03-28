import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { siteContent } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const SESSION_KEY = 'admin_session';

// Always verify directly from DB — no cache so logout takes effect immediately
async function isValidToken(token: string): Promise<boolean> {
  try {
    const db = getDb();
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, SESSION_KEY));
    return row ? (row.value as string) === token : false;
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
