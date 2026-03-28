import { NextResponse } from 'next/server';
import { invalidateAdminSession } from '@/lib/admin-auth';

export async function POST() {
  try {
    await invalidateAdminSession();
  } catch {
    // Best effort — always clear the cookie even if DB fails
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return res;
}
