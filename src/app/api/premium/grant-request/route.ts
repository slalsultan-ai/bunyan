import { NextRequest } from 'next/server';
import { submitGrantRequest } from '@/lib/grant-requests';

export async function POST(req: NextRequest) {
  let body: {
    institutionName?: string;
    institutionType?: string;
    institutionTypeOther?: string;
    studentCount?: number;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    notes?: string;
  };

  try { body = await req.json(); } catch { return Response.json({ error: 'طلب غير صحيح' }, { status: 400 }); }

  // Validation
  const required = ['institutionName', 'institutionType', 'studentCount', 'contactName', 'contactPhone', 'contactEmail'] as const;
  for (const field of required) {
    if (!body[field]) {
      return Response.json({ error: `الحقل ${field} مطلوب` }, { status: 400 });
    }
  }

  if (typeof body.studentCount !== 'number' || body.studentCount < 1) {
    return Response.json({ error: 'عدد الطلاب غير صحيح' }, { status: 400 });
  }

  const validTypes = ['school', 'training_center', 'charity', 'other'];
  if (!validTypes.includes(body.institutionType!)) {
    return Response.json({ error: 'نوع المؤسسة غير صحيح' }, { status: 400 });
  }

  try {
    const result = await submitGrantRequest({
      institutionName: body.institutionName!,
      institutionType: body.institutionType!,
      institutionTypeOther: body.institutionTypeOther,
      studentCount: body.studentCount!,
      contactName: body.contactName!,
      contactPhone: body.contactPhone!,
      contactEmail: body.contactEmail!,
      notes: body.notes,
    });

    return Response.json({ requestNumber: result.requestNumber });
  } catch (e) {
    console.error('[grant-request] Error:', e);
    return Response.json({ error: 'حدث خطأ، حاول مرة أخرى' }, { status: 500 });
  }
}
