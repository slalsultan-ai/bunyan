import { getParentSession } from '@/lib/parent-auth';
import { getDb } from '@/lib/db';
import { parents, children } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await getParentSession();
  if (!session) return Response.json({ parent: null, children: [] });

  const db = getDb();
  const [parent] = await db.select().from(parents).where(eq(parents.id, session.parentId)).limit(1);
  if (!parent) return Response.json({ parent: null, children: [] });

  const childRows = await db.select().from(children).where(eq(children.parentId, session.parentId));

  return Response.json({
    parent: {
      id: parent.id,
      email: parent.email,
      city: parent.city,
      weeklyEmailEnabled: parent.weeklyEmailEnabled,
      currentWeekNumber: parent.currentWeekNumber,
    },
    children: childRows.map(c => ({
      id: c.id,
      name: c.name,
      age: c.age,
      ageGroup: c.ageGroup,
    })),
  });
}
