import { cookies } from 'next/headers';
import { invalidateParentSession } from '@/lib/parent-auth';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('parent_token')?.value;

  if (token) {
    // parent_sessions stores only the SHA-256 hash of the token. Looking the row
    // up by the raw cookie value never matched, so logout was a no-op and the
    // session stayed valid for its full 30-day TTL (and kept sliding-renewing).
    await invalidateParentSession(token);
    cookieStore.delete('parent_token');
  }

  return Response.json({ success: true });
}
