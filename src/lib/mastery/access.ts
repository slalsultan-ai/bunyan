import { hasFeatureAccess } from '../feature-flags';
import { computeAgeGroup, getParentSession } from '../parent-auth';
import { assertParentCanAccessChild, isParentChildAccessError } from '../parent-child-access';
import { isMasteryAgeGroup, type MasteryTrack } from './taxonomy';
import { MasteryError } from './service';
import { isMawhibaL1Age, MAWHIBA_L1_AGE_MESSAGE } from '../mawhiba/eligibility';

export const MASTERY_FLAG = 'adaptive_mastery';
export const MAWHIBA_L1_FLAG = 'mawhiba_l1';
/** Opens the Mawhiba track to anyone with the direct link; the banner stays on MAWHIBA_L1_FLAG. */
export const MAWHIBA_L1_LINK_FLAG = 'mawhiba_l1_link';

export interface MasteryAccess {
  parentId: string;
  email: string;
  childId: string;
  /** The track the request runs on (field name kept for existing callers). */
  ageGroup: MasteryTrack;
}

/**
 * The engine runs only for a signed-in parent acting on one of their own
 * children, with the flag of the requested track:
 *   - smart path (default): `adaptive_mastery`, child in a supported age group
 *   - `mawhiba_l1`: `mawhiba_l1` or `mawhiba_l1_link` flag, child aged 6–11
 */
export async function resolveMasteryAccess(childId: unknown, track?: unknown): Promise<MasteryAccess> {
  const isMawhiba = track === 'mawhiba_l1';
  if (track !== undefined && track !== null && track !== '6-9' && !isMawhiba) {
    throw new MasteryError('مسار غير معروف', 400);
  }
  if (typeof childId !== 'string' || childId.length === 0) {
    throw new MasteryError('بيانات ناقصة', 400);
  }
  const session = await getParentSession();
  if (!session) throw new MasteryError('غير مصرح', 401);

  const enabled = isMawhiba
    ? (await hasFeatureAccess(MAWHIBA_L1_FLAG, session.email, session.parentId))
      || (await hasFeatureAccess(MAWHIBA_L1_LINK_FLAG, session.email, session.parentId))
    : await hasFeatureAccess(MASTERY_FLAG, session.email, session.parentId);
  if (!enabled) throw new MasteryError('الميزة غير مفعّلة', 403);

  try {
    const { child } = await assertParentCanAccessChild(session.parentId, childId);
    if (isMawhiba) {
      if (!isMawhibaL1Age(child.age)) throw new MasteryError(MAWHIBA_L1_AGE_MESSAGE, 403);
      return { parentId: session.parentId, email: session.email, childId: child.id, ageGroup: 'mawhiba_l1' };
    }
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
