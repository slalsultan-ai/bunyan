import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { parents } from '@/lib/db/schema';
import { getParentSession } from '@/lib/parent-auth';
import { eq } from 'drizzle-orm';

export async function PUT(req: NextRequest) {
  const session = await getParentSession();
  if (!session) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  let body: { weeklyEmailEnabled?: boolean; achievementEmailEnabled?: boolean; monthlyReportEnabled?: boolean };
  try { body = await req.json(); } catch { return Response.json({ error: 'طلب غير صحيح' }, { status: 400 }); }

  const updates: Record<string, boolean> = {};
  if (typeof body.weeklyEmailEnabled === 'boolean') updates.weeklyEmailEnabled = body.weeklyEmailEnabled;
  if (typeof body.achievementEmailEnabled === 'boolean') updates.achievementEmailEnabled = body.achievementEmailEnabled;
  if (typeof body.monthlyReportEnabled === 'boolean') updates.monthlyReportEnabled = body.monthlyReportEnabled;

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'القيمة يجب أن تكون true أو false' }, { status: 400 });
  }

  const db = getDb();
  await db.update(parents)
    .set(updates)
    .where(eq(parents.id, session.parentId));

  return Response.json({ success: true });
}
