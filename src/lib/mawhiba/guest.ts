/**
 * Guest learners on the Mawhiba direct link. A visitor without an account
 * gets a random guest id in an httpOnly cookie; the id stands in for a child
 * id in the mastery tables (prefixed so it can never collide with a real
 * child). The visitor picks Mawhiba 1 or 2 on the page; one guest id serves
 * both tracks (their skills and sessions are kept apart by track).
 */

import { randomUUID } from 'node:crypto';

export const GUEST_ID_COOKIE = 'mawhiba_guest';
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

const GUEST_ID_RE = /^guest_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function newGuestId(): string {
  return `guest_${randomUUID()}`;
}

export function isGuestId(value: unknown): value is string {
  return typeof value === 'string' && GUEST_ID_RE.test(value);
}

/** The guest behind a request's cookies, or null when absent or malformed. */
export function readGuest(get: (name: string) => string | undefined): { childId: string } | null {
  const childId = get(GUEST_ID_COOKIE);
  return isGuestId(childId) ? { childId } : null;
}

export const guestCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: GUEST_COOKIE_MAX_AGE,
};
