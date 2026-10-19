import { hasFeatureAccess } from '../feature-flags';
import { computeAgeGroup, getParentSession } from '../parent-auth';
import { assertParentCanAccessChild, isParentChildAccessError } from '../parent-child-access';
import { isMasteryAgeGroup, type MasteryAgeGroup } from './taxonomy';
import { MasteryError } from './service';

export const MASTERY_FLAG = 'adaptive_mastery';

export interface MasteryAccess {
  parentId: string;
  email: string;
  childId: string;
  ageGroup: MasteryAgeGroup;
}

/**
 * The engine runs only for a signed-in parent with the `adaptive_mastery`
 * flag, acting on one of their own children in a supported age group.
 */
export async function resolveMasteryAccess(childId: unknown): Promise<MasteryAccess> {
  if (typeof childId !== 'string' || childId.length === 0) {
    throw new MasteryError('بيانات ناقصة', 400);
  }
  const session = await getParentSession();
  if (!session) throw new MasteryError('غير مصرح', 401);

  const enabled = await hasFeatureAccess(MASTERY_FLAG, session.email, session.parentId);
  if (!enabled) throw new MasteryError('الميزة غير مفعّلة', 403);

  try {
    const { child } = await assertParentCanAccessChild(session.parentId, childId);
    const ageGroup = computeAgeGroup(child.age);
    if (!isMasteryAgeGroup(ageGroup)) throw new MasteryError('الفئة العمرية غير مدعومة بعد', 403);
    return { parentId: session.parentId, email: session.email, childId: child.id, ageGroup };
  } catch (e) {
    if (isParentChildAccessError(e)) throw new MasteryError(e.message, e.status);
    throw e;
  }
}

export function masteryErrorResponse(e: unknown, tag: string) {
  if (e instanceof MasteryError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  console.error(`[mastery ${tag}]`, e);
  return Response.json({ error: 'Server error' }, { status: 500 });
}
