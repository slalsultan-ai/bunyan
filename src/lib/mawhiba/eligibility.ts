/**
 * Mawhiba Level 1 (grades 3–5) is offered to Bunyan's whole middle group
 * (6–9) plus ages 10–11; 4–5 stays out. Shared by the server (access check)
 * and the client (banner + page), so keep it pure.
 */
export const MAWHIBA_L1_MIN_AGE = 6;
export const MAWHIBA_L1_MAX_AGE = 11;

export function isMawhibaL1Age(age: number | null | undefined): boolean {
  return typeof age === 'number' && age >= MAWHIBA_L1_MIN_AGE && age <= MAWHIBA_L1_MAX_AGE;
}

export const MAWHIBA_L1_AGE_MESSAGE =
  `مسار موهبة ١ متاح للأطفال من ${MAWHIBA_L1_MIN_AGE} إلى ${MAWHIBA_L1_MAX_AGE} سنة.`;
