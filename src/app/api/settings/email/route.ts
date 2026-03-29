import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { parents } from '@/lib/db/schema';
import { getParentSession } from '@/lib/parent-auth';
import { eq } from 'drizzle-orm';

export async function PUT(req: NextRequest) {
  const session = await getParentSession();
  if (!session) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  let body: { weeklyEmailEnabled?: boolean };
  try { body = await req.json(); } catch { return Response.json({ error: 'طلب غير صحيح' }, { status: 400 }); }

  if (typeof body.weeklyEmailEnabled !== 'boolean') {
    return Response.json({ error: 'القيمة يجب أن تكون true أو false' }, { status: 400 });
  }

  const db = getDb();
  await db.update(parents)
    .set({ weeklyEmailEnabled: body.weeklyEmailEnabled })
    .where(eq(parents.id, session.parentId));

  return Response.json({ success: true });
}
