import { NextRequest } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAllGrantRequests } from '@/lib/grant-requests';

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get('status') || undefined;
  const requests = await getAllGrantRequests(status);
  return Response.json({ requests });
}
