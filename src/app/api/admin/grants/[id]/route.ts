import { NextRequest } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getGrantRequestById, reviewGrantRequest } from '@/lib/grant-requests';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const request = await getGrantRequestById(Number(id));
  if (!request) return Response.json({ error: 'غير موجود' }, { status: 404 });
  return Response.json({ request });
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;

  let body: {
    action?: 'approve' | 'reject';
    adminNotes?: string;
    code?: string;
    durationDays?: number;
    maxUsers?: number;
  };

  try { body = await req.json(); } catch { return Response.json({ error: 'طلب غير صحيح' }, { status: 400 }); }

  if (!body.action || !['approve', 'reject'].includes(body.action)) {
    return Response.json({ error: 'action مطلوب (approve أو reject)' }, { status: 400 });
  }

  if (body.action === 'approve' && !body.code) {
    return Response.json({ error: 'الكود مطلوب عند الموافقة' }, { status: 400 });
  }

  try {
    await reviewGrantRequest(
      Number(id),
      body.action,
      body.adminNotes,
      body.action === 'approve' && body.code
        ? { code: body.code, durationDays: body.durationDays || 90, maxUsers: body.maxUsers || 50 }
        : undefined
    );
    return Response.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    if (msg.includes('UNIQUE constraint')) {
      return Response.json({ error: 'الكود موجود مسبقاً' }, { status: 409 });
    }
    return Response.json({ error: msg }, { status: 500 });
  }
}
