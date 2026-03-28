import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRateLimit = vi.fn();
const mockGetIp = vi.fn();
const mockSelect = vi.fn();

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mockRateLimit,
  getIp: mockGetIp,
}));

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect }),
}));

vi.mock('@/lib/db/schema', () => ({
  questions: {
    ageGroup: 'age_group',
    isActive: 'is_active',
    skillArea: 'skill_area',
    difficulty: 'difficulty',
  },
}));

const { GET } = await import('@/app/api/worksheet/questions/route');

function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

function makeRequest(url: string) {
  return {
    nextUrl: new URL(url),
    headers: { get: vi.fn().mockReturnValue('127.0.0.1') },
  } as unknown;
}

describe('GET /api/worksheet/questions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIp.mockReturnValue('127.0.0.1');
    mockRateLimit.mockReturnValue({ allowed: true });
  });

  it('returns worksheet questions without answer fields', async () => {
    mockSelect.mockReturnValue(
      makeSelectChain([
        {
          id: 'q1',
          ageGroup: '6-9',
          skillArea: 'verbal',
          difficulty: 'easy',
          questionType: 'text',
          subSkill: 'reading',
          questionTextAr: 'سؤال',
          questionImageUrl: null,
          options: [{ text: 'أ' }, { text: 'ب' }, { text: 'ج' }, { text: 'د' }],
          correctOptionIndex: 2,
          explanationAr: 'شرح',
          tags: [],
          isActive: true,
        },
      ])
    );

    const res = await GET(
      makeRequest('http://localhost/api/worksheet/questions?age_group=6-9&skill_area=verbal') as never
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.questions).toHaveLength(1);
    expect(data.questions[0].correctOptionIndex).toBeUndefined();
    expect(data.questions[0].explanationAr).toBeUndefined();
    expect(data.questions[0].questionTextAr).toBe('سؤال');
  });
});
