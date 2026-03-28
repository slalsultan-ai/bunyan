import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_HERO, DEFAULT_FAQ } from '@/lib/content';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// next/cache: unstable_cache just calls the wrapped function directly in tests
vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => unknown) => fn,
  revalidateTag: vi.fn(),
}));

// Mock db layer
const mockSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({
    select: mockSelect,
    insert: mockInsert,
  }),
}));

vi.mock('@/lib/db/schema', () => ({
  siteContent: { key: 'key' },
}));

// Import AFTER mocks are set up
const { getHeroContent, getFaqContent, setContent } = await import('@/lib/content');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeSelectChain(result: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
  mockSelect.mockReturnValue(chain);
  return chain;
}

function makeInsertChain() {
  const chain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  };
  mockInsert.mockReturnValue(chain);
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('content lib', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getHeroContent', () => {
    it('returns default when no row exists in DB', async () => {
      makeSelectChain([]);
      const hero = await getHeroContent();
      expect(hero).toEqual(DEFAULT_HERO);
    });

    it('returns stored value when row exists', async () => {
      const stored = { ...DEFAULT_HERO, title: 'عنوان مخصص' };
      makeSelectChain([{ key: 'hero', value: stored }]);
      const hero = await getHeroContent();
      expect(hero.title).toBe('عنوان مخصص');
    });
  });

  describe('getFaqContent', () => {
    it('returns default FAQ when no row exists', async () => {
      makeSelectChain([]);
      const faq = await getFaqContent();
      expect(faq).toEqual(DEFAULT_FAQ);
      expect(faq.length).toBeGreaterThan(0);
    });

    it('returns stored FAQ array', async () => {
      const stored = [{ q: 'س؟', a: 'ج.' }];
      makeSelectChain([{ key: 'faq', value: stored }]);
      const faq = await getFaqContent();
      expect(faq).toEqual(stored);
    });
  });

  describe('setContent', () => {
    it('calls insert with onConflictDoUpdate', async () => {
      const chain = makeInsertChain();
      await setContent('hero', DEFAULT_HERO);
      expect(mockInsert).toHaveBeenCalledOnce();
      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'hero' })
      );
      expect(chain.onConflictDoUpdate).toHaveBeenCalledOnce();
    });
  });
});

// ---------------------------------------------------------------------------
// Default content shape
// ---------------------------------------------------------------------------

describe('DEFAULT_HERO shape', () => {
  it('has all required fields', () => {
    const keys: (keyof typeof DEFAULT_HERO)[] = [
      'badge', 'title', 'titleHighlight', 'subtitle', 'ctaPrimary',
    ];
    for (const k of keys) {
      expect(typeof DEFAULT_HERO[k]).toBe('string');
      expect(DEFAULT_HERO[k].length).toBeGreaterThan(0);
    }
  });
});

describe('DEFAULT_FAQ shape', () => {
  it('every item has q and a strings', () => {
    expect(DEFAULT_FAQ.length).toBeGreaterThan(0);
    for (const item of DEFAULT_FAQ) {
      expect(typeof item.q).toBe('string');
      expect(typeof item.a).toBe('string');
      expect(item.q.length).toBeGreaterThan(0);
      expect(item.a.length).toBeGreaterThan(0);
    }
  });
});
