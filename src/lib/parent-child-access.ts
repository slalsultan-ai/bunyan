import { and, eq } from 'drizzle-orm';
import { getDb } from './db';
import { childParents, children } from './db/schema';

export class ParentChildAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ParentChildAccessError';
    this.status = status;
  }
}

export function isParentChildAccessError(error: unknown): error is ParentChildAccessError {
  return error instanceof ParentChildAccessError;
}

export interface AccessibleChild {
  id: string;
  parentId: string;
  name: string;
  age: number;
  ageGroup: string;
}

export async function assertParentCanAccessChild(
  parentId: string | null | undefined,
  childId: string
): Promise<{ child: AccessibleChild; role: string }> {
  if (!parentId) {
    throw new ParentChildAccessError('غير مصرح', 401);
  }

  const db = getDb();

  const [child] = await db
    .select({
      id: children.id,
      parentId: children.parentId,
      name: children.name,
      age: children.age,
      ageGroup: children.ageGroup,
    })
    .from(children)
    .where(eq(children.id, childId))
    .limit(1);

  if (!child) {
    throw new ParentChildAccessError('الطفل غير موجود', 404);
  }

  if (child.parentId === parentId) {
    return { child, role: 'owner' };
  }

  const [sharedLink] = await db
    .select({ role: childParents.role })
    .from(childParents)
    .where(and(eq(childParents.childId, childId), eq(childParents.parentId, parentId)))
    .limit(1);

  if (!sharedLink) {
    throw new ParentChildAccessError('الطفل غير موجود', 404);
  }

  return { child, role: sharedLink.role ?? 'follower' };
}
