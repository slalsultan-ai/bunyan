import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { parents, children } from '@/lib/db/schema';
import { getParentSession, computeAgeGroup } from '@/lib/parent-auth';
import { eq } from 'drizzle-orm';

const SAUDI_CITIES = ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'بريدة', 'أبها', 'تبوك', 'حائل', 'الطائف', 'نجران', 'جازان', 'الخبر', 'الظهران', 'القصيم', 'أخرى'];

export async function POST(req: NextRequest) {
  const session = await getParentSession();
  if (!session) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  let body: { city?: string; children?: Array<{ name: string; age: number }> };
  try { body = await req.json(); } catch { return Response.json({ error: 'طلب غير صحيح' }, { status: 400 }); }

  const city = (body.city || '').trim();
  const childrenData = body.children || [];

  if (city && !SAUDI_CITIES.includes(city)) {
    return Response.json({ error: 'المدينة غير صحيحة' }, { status: 400 });
  }

  if (!childrenData.length || childrenData.length > 10) {
    return Response.json({ error: 'أضف طفلاً واحداً على الأقل (الحد الأقصى ١٠)' }, { status: 400 });
  }

  for (const child of childrenData) {
    if (!child.name?.trim() || child.age < 4 || child.age > 12) {
      return Response.json({ error: 'بيانات الطفل غير صحيحة. العمر بين ٤ و١٢.' }, { status: 400 });
    }
  }

  const db = getDb();

  if (city) {
    await db.update(parents).set({ city }).where(eq(parents.id, session.parentId));
  }

  const inserted = await db.insert(children).values(
    childrenData.map(c => ({
      id: crypto.randomUUID(),
      parentId: session.parentId,
      name: c.name.trim(),
      age: c.age,
      ageGroup: computeAgeGroup(c.age),
    }))
  ).returning();

  return Response.json({ success: true, children: inserted });
}
