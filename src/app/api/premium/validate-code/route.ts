import { NextRequest } from 'next/server';
import { validateCode } from '@/lib/institution-codes';
import { getParentSession } from '@/lib/parent-auth';

export async function POST(req: NextRequest) {
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
