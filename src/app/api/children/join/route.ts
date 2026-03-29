import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { childParents, children } from '@/lib/db/schema';
import { getParentSession } from '@/lib/parent-auth';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await getParentSession();
  if (!session) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  let body: { token?: string };
  try { body = await req.json(); } catch { return Response.json({ error: 'طلب غير صحيح' }, { status: 400 }); }

  const { token } = body;
  if (!token) return Response.json({ error: 'الرمز مطلوب' }, { status: 400 });

  const db = getDb();

  // Find the childParents row with this invite token
  const [invite] = await db.select().from(childParents)
    .where(eq(childParents.inviteToken, token))
    .limit(1);

  if (!invite) return Response.json({ error: 'رمز الدعوة غير صالح' }, { status: 404 });

  const childId = invite.childId;

  // Verify current parent is NOT already linked to this child
  const [alreadyLinked] = await db.select().from(childParents)
    .where(and(eq(childParents.childId, childId), eq(childParents.parentId, session.parentId)))
    .limit(1);

  if (alreadyLinked) return Response.json({ error: 'أنت مرتبط بهذا الطفل بالفعل' }, { status: 409 });

  // Get child name
  const [child] = await db.select({ name: children.name }).from(children)
    .where(eq(children.id, childId))
    .limit(1);

  // Create follower link
  await db.insert(childParents).values({
    id: crypto.randomUUID(),
    childId,
    parentId: session.parentId,
    role: 'follower',
  });

  return Response.json({ success: true, childName: child?.name ?? '' });
}
