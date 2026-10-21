import { describe, it, expect, vi, beforeEach } from 'vitest';

const flags = new Set<string>();
let childAge = 8;

vi.mock('@/lib/feature-flags', () => ({
  hasFeatureAccess: vi.fn(async (key: string) => flags.has(key)),
}));
vi.mock('@/lib/parent-auth', () => ({
  getParentSession: vi.fn(async () => ({ parentId: 'p1', email: 'parent@example.com' })),
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
  beforeEach(() => { flags.clear(); childAge = 8; });

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

  it('does not open the 6-9 smart path', async () => {
    flags.add('mawhiba_l1_link');
    await expect(resolveMasteryAccess('c1')).rejects.toMatchObject({ status: 403 });
  });
});
