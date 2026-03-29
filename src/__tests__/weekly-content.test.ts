import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect, insert: mockInsert }),
}));

vi.mock('@/lib/db/schema', () => ({ weeklyEmailContent: {} }));

// Import CONTENT array directly for unit testing without DB
// We re-export it for testing via a workaround
const seedModule = await import('@/lib/db/seed-weekly-content');

// ─── Content structure tests ─────────────────────────────────────────────────

// Access the CONTENT through seedWeeklyContent call with mocked DB
describe('Weekly email content structure', () => {
  beforeEach(() => vi.clearAllMocks());

  it('seedWeeklyContent inserts 24 entries when DB is empty', async () => {
    const inserted: unknown[] = [];
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]), // all empty = insert all
    });
    mockInsert.mockImplementation(() => ({
      values: vi.fn().mockImplementation((v) => { inserted.push(v); return Promise.resolve(); }),
    }));

    const result = await seedModule.seedWeeklyContent();
    expect(result.inserted).toBe(24);
    expect(result.skipped).toBe(0);
  });

  it('seedWeeklyContent skips all when all already exist', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'exists' }]), // always found
    });

    const result = await seedModule.seedWeeklyContent();
    expect(result.inserted).toBe(0);
    expect(result.skipped).toBe(24);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('getWeeklyContent returns null when not found', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });
    const result = await seedModule.getWeeklyContent(1, '6-9');
    expect(result).toBeNull();
  });

  it('getWeeklyContent returns parsed content when found', async () => {
    const mockContent = { weekNumber: 1, ageGroup: '6-9', weeklyGame: { title: 'test' } };
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: '1', weekNumber: 1, ageGroup: '6-9', content: mockContent }]),
    });
    const result = await seedModule.getWeeklyContent(1, '6-9');
    expect(result).not.toBeNull();
    expect(result?.weekNumber).toBe(1);
    expect(result?.ageGroup).toBe('6-9');
  });
});

// ─── computeAgeGroup exhaustive coverage ─────────────────────────────────────

import { computeAgeGroup } from '@/lib/parent-auth';

describe('computeAgeGroup — all valid ages', () => {
  const expectedGroups: Record<number, string> = {
    4: '4-5', 5: '4-5',
    6: '6-9', 7: '6-9', 8: '6-9', 9: '6-9',
    10: '10-12', 11: '10-12', 12: '10-12',
  };

  for (const [age, group] of Object.entries(expectedGroups)) {
    it(`age ${age} → ${group}`, () => {
      expect(computeAgeGroup(Number(age))).toBe(group);
    });
  }
});
