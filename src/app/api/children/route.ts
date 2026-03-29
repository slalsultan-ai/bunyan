import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { children, parents } from '@/lib/db/schema';
import { getParentSession, computeAgeGroup } from '@/lib/parent-auth';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  const session = await getParentSession();
  if (!session) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  const db = getDb();
  const rows = await db.select().from(children).where(eq(children.parentId, session.parentId));
  return Response.json({ children: rows });
}

export async function POST(req: NextRequest) {
  const session = await getParentSession();
  if (!session) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  let body: { name?: string; age?: number };
  try { body = await req.json(); } catch { return Response.json({ error: 'طلب غير صحيح' }, { status: 400 }); }

  const name = (body.name || '').trim();
  const age = Number(body.age);

  if (!name || !age || age < 4 || age > 12) {
    return Response.json({ error: 'الاسم والعمر مطلوبان (العمر ٤-١٢)' }, { status: 400 });
  }

  const db = getDb();

  // Enforce max 10 children
  const existing = await db.select().from(children).where(eq(children.parentId, session.parentId));
  if (existing.length >= 10) {
    return Response.json({ error: 'الحد الأقصى ١٠ أطفال' }, { status: 400 });
  }

  const [inserted] = await db.insert(children).values({
    id: crypto.randomUUID(),
    parentId: session.parentId,
    name,
    age,
    ageGroup: computeAgeGroup(age),
  }).returning();

  return Response.json({ child: inserted }, { status: 201 });
}
