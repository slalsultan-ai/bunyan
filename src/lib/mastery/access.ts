import { hasFeatureAccess } from '../feature-flags';
import { computeAgeGroup, getParentSession } from '../parent-auth';
import { assertParentCanAccessChild, isParentChildAccessError } from '../parent-child-access';
import { isMasteryAgeGroup, isMawhibaTrack, type MasteryTrack } from './taxonomy';
import { MasteryError } from './service';
import { isMawhibaL1Age, isMawhibaL2Age, MAWHIBA_L1_AGE_MESSAGE, MAWHIBA_L2_AGE_MESSAGE } from '../mawhiba/eligibility';
import { isGuestId, readGuest } from '../mawhiba/guest';
import { cookies } from 'next/headers';

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
 *   - `mawhiba_l2`: same flags, child aged 11–14
 * A guest on the Mawhiba link (no account) is admitted to either Mawhiba
 * track when `mawhiba_l1_link` is open to everyone and the request carries
 * that guest's own cookie; the guest chose the level, so no age gate.
 */
export async function resolveMasteryAccess(childId: unknown, track?: unknown): Promise<MasteryAccess> {
  const isMawhiba = isMawhibaTrack(track);
  if (track !== undefined && track !== null && track !== '6-9' && !isMawhiba) {
    throw new MasteryError('مسار غير معروف', 400);
  }
  if (typeof childId !== 'string' || childId.length === 0) {
    throw new MasteryError('بيانات ناقصة', 400);
  }
  if (isMawhiba && isGuestId(childId)) return resolveGuestAccess(childId, track);

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
      if (track === 'mawhiba_l2' && !isMawhibaL2Age(child.age)) throw new MasteryError(MAWHIBA_L2_AGE_MESSAGE, 403);
      if (track === 'mawhiba_l1' && !isMawhibaL1Age(child.age)) throw new MasteryError(MAWHIBA_L1_AGE_MESSAGE, 403);
      return { parentId: session.parentId, email: session.email, childId: child.id, ageGroup: track };
    }
    const ageGroup = computeAgeGroup(child.age);
    if (!isMasteryAgeGroup(ageGroup)) throw new MasteryError('الفئة العمرية غير مدعومة بعد', 403);
    return { parentId: session.parentId, email: session.email, childId: child.id, ageGroup };
  } catch (e) {
    if (isParentChildAccessError(e)) throw new MasteryError(e.message, e.status);
    throw e;
  }
}

async function resolveGuestAccess(childId: string, track: 'mawhiba_l1' | 'mawhiba_l2'): Promise<MasteryAccess> {
  if (!(await hasFeatureAccess(MAWHIBA_L1_LINK_FLAG, null, null))) throw new MasteryError('الميزة غير مفعّلة', 403);
  const store = await cookies();
  const guest = readGuest((name) => store.get(name)?.value);
  // The id must be this browser's own guest id, never one taken from elsewhere.
  if (!guest || guest.childId !== childId) throw new MasteryError('غير مصرح', 401);
  return { parentId: '', email: '', childId, ageGroup: track };
}

export function masteryErrorResponse(e: unknown, tag: string) {
  if (e instanceof MasteryError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  console.error(`[mastery ${tag}]`, e);
  return Response.json({ error: 'Server error' }, { status: 500 });
}
