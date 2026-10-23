/**
 * Guest learners on the Mawhiba direct link. A visitor without an account
 * gets a random guest id in an httpOnly cookie; the id stands in for a child
 * id in the mastery tables (prefixed so it can never collide with a real
 * child). The child's age, chosen on the page, is kept beside it so the 6–11
 * gate still holds on the server.
 */

import { randomUUID } from 'node:crypto';
import { isMawhibaL1Age } from './eligibility';

export const GUEST_ID_COOKIE = 'mawhiba_guest';
export const GUEST_AGE_COOKIE = 'mawhiba_guest_age';
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

const GUEST_ID_RE = /^guest_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function newGuestId(): string {
  return `guest_${randomUUID()}`;
}

export function isGuestId(value: unknown): value is string {
  return typeof value === 'string' && GUEST_ID_RE.test(value);
}

export function parseGuestAge(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(n) && isMawhibaL1Age(n) ? n : null;
}

/** The guest behind a request's cookies, or null when absent or malformed. */
export function readGuest(get: (name: string) => string | undefined): { childId: string; age: number } | null {
  const childId = get(GUEST_ID_COOKIE);
  const age = parseGuestAge(get(GUEST_AGE_COOKIE));
  if (!isGuestId(childId) || age === null) return null;
  return { childId, age };
}

export const guestCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: GUEST_COOKIE_MAX_AGE,
};
