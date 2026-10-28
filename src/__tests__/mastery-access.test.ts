import { describe, it, expect, vi, beforeEach } from 'vitest';

const flags = new Set<string>();
let childAge = 8;
let session: { parentId: string; email: string } | null = { parentId: 'p1', email: 'parent@example.com' };
const jar = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined) }),
}));

vi.mock('@/lib/feature-flags', () => ({
  hasFeatureAccess: vi.fn(async (key: string) => flags.has(key)),
}));
vi.mock('@/lib/parent-auth', () => ({
  getParentSession: vi.fn(async () => session),
  computeAgeGroup: (age: number) => (age <= 5 ? '4-5' : age <= 9 ? '6-9' : '10-12'),
}));
vi.mock('@/lib/parent-child-access', () => ({
  assertParentCanAccessChild: vi.fn(async (_p: string, childId: string) => ({ child: { id: childId, age: childAge } })),
  isParentChildAccessError: () => false,
}));
vi.mock('@/lib/mastery/service', () => ({
  MasteryError: class MasteryError extends Error {
    constructor(message: string, public status: number) { super(message); }
  },
}));

import { resolveMasteryAccess } from '@/lib/mastery/access';

describe('resolveMasteryAccess — Mawhiba track', () => {
  beforeEach(() => { flags.clear(); childAge = 8; jar.clear(); session = { parentId: 'p1', email: 'parent@example.com' }; });

  it('is closed when neither Mawhiba flag grants access', async () => {
    await expect(resolveMasteryAccess('c1', 'mawhiba_l1')).rejects.toMatchObject({ status: 403 });
  });

  it('opens with the direct-link flag alone', async () => {
    flags.add('mawhiba_l1_link');
    await expect(resolveMasteryAccess('c1', 'mawhiba_l1')).resolves.toMatchObject({ ageGroup: 'mawhiba_l1' });
  });

  it('still opens with the main flag', async () => {
    flags.add('mawhiba_l1');
    await expect(resolveMasteryAccess('c1', 'mawhiba_l1')).resolves.toMatchObject({ ageGroup: 'mawhiba_l1' });
  });

  it('keeps the age gate under the direct-link flag', async () => {
    flags.add('mawhiba_l1_link');
    childAge = 5;
    await expect(resolveMasteryAccess('c1', 'mawhiba_l1')).rejects.toMatchObject({ status: 403 });
  });

  it('gates Mawhiba 2 for registered children to ages 11-14', async () => {
    flags.add('mawhiba_l1_link');
    childAge = 8;
    await expect(resolveMasteryAccess('c1', 'mawhiba_l2')).rejects.toMatchObject({ status: 403 });
    childAge = 12;
    await expect(resolveMasteryAccess('c1', 'mawhiba_l2')).resolves.toMatchObject({ ageGroup: 'mawhiba_l2' });
  });

  it('does not open the 6-9 smart path', async () => {
    flags.add('mawhiba_l1_link');
    await expect(resolveMasteryAccess('c1')).rejects.toMatchObject({ status: 403 });
  });
});

describe('resolveMasteryAccess — guest on the Mawhiba link', () => {
  const guestId = 'guest_12345678-1234-4234-8234-123456789abc';
  beforeEach(() => {
    flags.clear(); jar.clear(); session = null;
    jar.set('mawhiba_guest', guestId);
  });

  it('admits the guest with its own cookie while the link is open', async () => {
    flags.add('mawhiba_l1_link');
    await expect(resolveMasteryAccess(guestId, 'mawhiba_l1')).resolves.toMatchObject({ childId: guestId, ageGroup: 'mawhiba_l1', email: '' });
  });

  it('refuses when the link flag is closed', async () => {
    await expect(resolveMasteryAccess(guestId, 'mawhiba_l1')).rejects.toMatchObject({ status: 403 });
  });

  it("refuses another browser's guest id", async () => {
    flags.add('mawhiba_l1_link');
    await expect(resolveMasteryAccess('guest_99999999-1234-4234-8234-123456789abc', 'mawhiba_l1')).rejects.toMatchObject({ status: 401 });
  });

  it('admits the same guest to Mawhiba 2', async () => {
    flags.add('mawhiba_l1_link');
    await expect(resolveMasteryAccess(guestId, 'mawhiba_l2')).resolves.toMatchObject({ childId: guestId, ageGroup: 'mawhiba_l2' });
  });

  it('never opens the 6-9 smart path to a guest', async () => {
    flags.add('mawhiba_l1_link');
    await expect(resolveMasteryAccess(guestId)).rejects.toMatchObject({ status: 401 });
  });
});
