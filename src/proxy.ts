import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { siteContent } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const SESSION_KEY = 'admin_session';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (pathname.startsWith('/admin/login')) return NextResponse.next();

  const token = request.cookies.get('admin_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  try {
    const db = getDb();
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, SESSION_KEY));
    if (!row || (row.value as string) !== token) {
      const res = NextResponse.redirect(new URL('/admin/login', request.url));
      res.cookies.delete('admin_token');
      return res;
    }
  } catch {
    // If DB is unreachable, deny access
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
