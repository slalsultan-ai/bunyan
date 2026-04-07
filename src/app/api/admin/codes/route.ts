import { NextRequest } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAllCodes, createCode } from '@/lib/institution-codes';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const codes = await getAllCodes();
  return Response.json({ codes });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    code?: string;
    institutionName?: string;
    institutionType?: string;
    institutionTypeOther?: string;
    maxUsers?: number;
    durationDays?: number;
    notes?: string;
  };

  try { body = await req.json(); } catch { return Response.json({ error: 'طلب غير صحيح' }, { status: 400 }); }

  if (!body.code || !body.institutionName || !body.institutionType) {
    return Response.json({ error: 'الحقول المطلوبة ناقصة' }, { status: 400 });
  }

  try {
    const code = await createCode({
      code: body.code,
      institutionName: body.institutionName,
      institutionType: body.institutionType,
      institutionTypeOther: body.institutionTypeOther,
      maxUsers: body.maxUsers || 50,
      durationDays: body.durationDays || 30,
      notes: body.notes,
    });
    return Response.json({ code });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    if (msg.includes('UNIQUE constraint')) {
      return Response.json({ error: 'الكود موجود مسبقاً' }, { status: 409 });
    }
    return Response.json({ error: msg }, { status: 500 });
  }
}
