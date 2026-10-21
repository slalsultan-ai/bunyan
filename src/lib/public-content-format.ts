/** Client-safe types and formatting for public content counts (no DB imports). */

export interface PublicContentStats {
  /** Active questions in the public age groups. */
  total: number;
  /** Of which free tier (tier NULL counts as free). */
  free: number;
  premium: number;
  ageGroups: number;
  skillAreas: number;
}

/** Round down to a friendly "N+" figure (nearest 50, or 10 below 100). */
export function roundDownForDisplay(n: number): number {
  if (n < 100) return Math.floor(n / 10) * 10;
  return Math.floor(n / 50) * 50;
}

export function formatCount(n: number): string {
  return `${roundDownForDisplay(n).toLocaleString('en')}+`;
}
