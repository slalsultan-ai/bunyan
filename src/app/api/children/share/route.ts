import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { children, childParents } from '@/lib/db/schema';
import { getParentSession } from '@/lib/parent-auth';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bunyan.guru';

export async function POST(req: NextRequest) {
  const session = await getParentSession();
  if (!session) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  let body: { childId?: string };
  try { body = await req.json(); } catch { return Response.json({ error: 'طلب غير صحيح' }, { status: 400 }); }

  const { childId } = body;
  if (!childId) return Response.json({ error: 'childId مطلوب' }, { status: 400 });

  const db = getDb();

  // Verify parent owns the child
  const [child] = await db.select().from(children)
    .where(and(eq(children.id, childId), eq(children.parentId, session.parentId)))
    .limit(1);

  if (!child) return Response.json({ error: 'الطفل غير موجود' }, { status: 404 });

  // Generate invite token
  const token = randomBytes(4).toString('hex'); // 8-char hex

  // Upsert owner row in childParents
  const [existing] = await db.select().from(childParents)
    .where(and(eq(childParents.childId, childId), eq(childParents.parentId, session.parentId)))
    .limit(1);

  if (existing) {
    await db.update(childParents)
      .set({ role: 'owner', inviteToken: token })
      .where(eq(childParents.id, existing.id));
  } else {
    await db.insert(childParents).values({
      id: crypto.randomUUID(),
      childId,
      parentId: session.parentId,
      role: 'owner',
      inviteToken: token,
    });
  }

  return Response.json({ token, shareUrl: `${APP_URL}/join/${token}` });
}
