import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { children } from '@/lib/db/schema';
import { getParentSession, computeAgeGroup } from '@/lib/parent-auth';
import { eq, and } from 'drizzle-orm';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getParentSession();
  if (!session) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  const { id } = await params;
  let body: { name?: string; age?: number };
  try { body = await req.json(); } catch { return Response.json({ error: 'طلب غير صحيح' }, { status: 400 }); }

  const db = getDb();

  // Verify ownership
  const [child] = await db.select().from(children)
    .where(and(eq(children.id, id), eq(children.parentId, session.parentId)))
    .limit(1);

  if (!child) return Response.json({ error: 'الطفل غير موجود' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.name?.trim()) updates.name = body.name.trim();
  if (body.age && body.age >= 4 && body.age <= 12) {
    updates.age = body.age;
    updates.ageGroup = computeAgeGroup(body.age);
  }

  if (!Object.keys(updates).length) {
    return Response.json({ error: 'لا توجد بيانات للتحديث' }, { status: 400 });
  }

  const [updated] = await db.update(children)
    .set(updates)
    .where(eq(children.id, id))
    .returning();

  return Response.json({ child: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getParentSession();
  if (!session) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const [child] = await db.select().from(children)
    .where(and(eq(children.id, id), eq(children.parentId, session.parentId)))
    .limit(1);

  if (!child) return Response.json({ error: 'الطفل غير موجود' }, { status: 404 });

  await db.delete(children).where(eq(children.id, id));
  return Response.json({ success: true });
}
