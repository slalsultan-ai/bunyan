/**
 * Mawhiba Level 1 targets grades 3–5, i.e. roughly ages 8–11. Shared by the
 * server (access check) and the client (banner + page), so keep it pure.
 */
export const MAWHIBA_L1_MIN_AGE = 8;
export const MAWHIBA_L1_MAX_AGE = 11;

export function isMawhibaL1Age(age: number | null | undefined): boolean {
  return typeof age === 'number' && age >= MAWHIBA_L1_MIN_AGE && age <= MAWHIBA_L1_MAX_AGE;
}

export const MAWHIBA_L1_AGE_MESSAGE =
  `مسار موهبة ١ مخصص لطلاب الصفوف 3–5 (من ${MAWHIBA_L1_MIN_AGE} إلى ${MAWHIBA_L1_MAX_AGE} سنة).`;
