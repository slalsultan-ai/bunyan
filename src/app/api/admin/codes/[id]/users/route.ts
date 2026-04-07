import { NextRequest } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getCodeUsers } from '@/lib/institution-codes';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const users = await getCodeUsers(Number(id));
  return Response.json({ users });
}
