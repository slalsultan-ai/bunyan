import { NextRequest } from 'next/server';
import { validateCode } from '@/lib/institution-codes';
import { getParentSession } from '@/lib/parent-auth';
import { checkRateLimit, getIp } from '@/lib/rate-limit-db';

export async function POST(req: NextRequest) {
  // This endpoint is unauthenticated and acts as a code oracle (it reveals
  // whether a code exists and how many slots remain), so it must be rate
  // limited to make brute-forcing institution codes impractical.
  const rl = await checkRateLimit(`premium-validate:${getIp(req)}`, 10, 60);
  if (!rl.allowed) {
    return Response.json(
      { error: 'محاولات كثيرة جداً. حاول بعد قليل' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  let body: { code?: string };
  try { body = await req.json(); } catch { return Response.json({ error: 'طلب غير صحيح' }, { status: 400 }); }

  const code = (body.code || '').trim();
  if (!code) {
    return Response.json({ error: 'أدخل الكود' }, { status: 400 });
  }

  const session = await getParentSession();
  const result = await validateCode(code, session?.parentId);

  if (!result.valid) {
    const errorMessages: Record<string, string> = {
      CODE_NOT_FOUND: 'الكود غير موجود',
      CODE_EXPIRED: 'الكود منتهي الصلاحية',
      CODE_PAUSED: 'الكود متوقف مؤقتاً',
      CODE_FULL: 'الكود ممتلئ (وصل الحد الأقصى)',
      ALREADY_ACTIVATED: 'فعّلت هذا الكود من قبل',
    };
    return Response.json({
      valid: false,
      error: result.error,
      errorMessage: errorMessages[result.error!] || 'خطأ غير متوقع',
    });
  }

  return Response.json({
    valid: true,
    institutionName: result.code!.institutionName,
    remainingSlots: result.code!.maxUsers - result.code!.currentUsers,
  });
}
