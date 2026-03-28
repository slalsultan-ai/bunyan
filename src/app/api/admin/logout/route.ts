import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isAdminAuthenticated, invalidateAdminSession } from '@/lib/admin-auth';

export async function POST() {
  // Only invalidate the DB session if the requester holds a valid token.
  // Prevents an unauthenticated caller from force-logging-out the admin.
  const authenticated = await isAdminAuthenticated();
  if (authenticated) {
    try {
      await invalidateAdminSession();
    } catch {
      // Best effort — always clear the cookie regardless
    }
  }

  // Always clear the cookie (even if session was invalid)
  const cookieStore = await cookies();
  cookieStore.delete('admin_token');

  return NextResponse.json({ success: true });
}
