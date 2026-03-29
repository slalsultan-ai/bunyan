import { getParentSession } from '@/lib/parent-auth';
import { getDb } from '@/lib/db';
import { parents, children, childParents } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  const session = await getParentSession();
  if (!session) return Response.json({ parent: null, children: [] });

  const db = getDb();
  const [parent] = await db.select().from(parents).where(eq(parents.id, session.parentId)).limit(1);
  if (!parent) return Response.json({ parent: null, children: [] });

  // Owned children
  const ownedChildren = await db.select().from(children).where(eq(children.parentId, session.parentId));

  // Followed children (via childParents with role='follower')
  const followedLinks = await db
    .select({ childId: childParents.childId })
    .from(childParents)
    .where(and(eq(childParents.parentId, session.parentId), eq(childParents.role, 'follower')));

  const followedChildren = [];
  for (const link of followedLinks) {
    const [child] = await db.select().from(children).where(eq(children.id, link.childId)).limit(1);
    if (child) followedChildren.push({ ...child, role: 'follower' as const });
  }

  const allChildren = [
    ...ownedChildren.map(c => ({ id: c.id, name: c.name, age: c.age, ageGroup: c.ageGroup, role: 'owner' as const })),
    ...followedChildren.map(c => ({ id: c.id, name: c.name, age: c.age, ageGroup: c.ageGroup, role: 'follower' as const })),
  ];

  return Response.json({
    parent: {
      id: parent.id,
      email: parent.email,
      city: parent.city,
      weeklyEmailEnabled: parent.weeklyEmailEnabled,
      achievementEmailEnabled: parent.achievementEmailEnabled,
      monthlyReportEnabled: parent.monthlyReportEnabled,
      currentWeekNumber: parent.currentWeekNumber,
    },
    children: allChildren,
  });
}
