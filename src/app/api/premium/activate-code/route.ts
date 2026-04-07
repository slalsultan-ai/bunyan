import { NextRequest } from 'next/server';
import { activateCode } from '@/lib/institution-codes';
import { getParentSession } from '@/lib/parent-auth';

export async function POST(req: NextRequest) {
  const session = await getParentSession();
  if (!session) {
    return Response.json({ error: 'سجّل الدخول أولاً' }, { status: 401 });
  }

  let body: { code?: string };
  try { body = await req.json(); } catch { return Response.json({ error: 'طلب غير صحيح' }, { status: 400 }); }

  const code = (body.code || '').trim();
  if (!code) {
    return Response.json({ error: 'أدخل الكود' }, { status: 400 });
  }

  const result = await activateCode(code, session.parentId);

  if (!result.success) {
    return Response.json({ success: false, error: result.error }, { status: 400 });
  }

  return Response.json({
    success: true,
    expiresAt: result.expiresAt,
    institutionName: result.institutionName,
  });
}
