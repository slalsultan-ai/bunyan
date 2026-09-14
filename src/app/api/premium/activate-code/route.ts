import { NextRequest } from 'next/server';
import { activateCode } from '@/lib/institution-codes';
import { getParentSession } from '@/lib/parent-auth';
import { checkRateLimit, getIp } from '@/lib/rate-limit-db';

export async function POST(req: NextRequest) {
  // Throttle per IP before touching the DB, then per account so a single
  // logged-in parent cannot brute-force codes.
  const ipCheck = await checkRateLimit(`premium-activate-ip:${getIp(req)}`, 15, 60);
  if (!ipCheck.allowed) {
    return Response.json(
      { error: 'محاولات كثيرة جداً. حاول بعد قليل' },
      { status: 429, headers: { 'Retry-After': String(ipCheck.retryAfter) } },
    );
  }

  const session = await getParentSession();
  if (!session) {
    return Response.json({ error: 'سجّل الدخول أولاً' }, { status: 401 });
  }

  const accountCheck = await checkRateLimit(`premium-activate:${session.parentId}`, 10, 60);
  if (!accountCheck.allowed) {
    return Response.json(
      { error: 'محاولات كثيرة جداً. حاول بعد قليل' },
      { status: 429, headers: { 'Retry-After': String(accountCheck.retryAfter) } },
    );
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
