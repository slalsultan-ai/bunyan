import { NextRequest } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getCodeById, updateCode, deleteCode } from '@/lib/institution-codes';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const code = await getCodeById(Number(id));
  if (!code) return Response.json({ error: 'غير موجود' }, { status: 404 });
  return Response.json({ code });
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;

  let body: { status?: string; maxUsers?: number; durationDays?: number; notes?: string };
  try { body = await req.json(); } catch { return Response.json({ error: 'طلب غير صحيح' }, { status: 400 }); }

  await updateCode(Number(id), body);
  return Response.json({ success: true });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const result = await deleteCode(Number(id));
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ success: true });
}
