import type { HeroContent, FaqItem } from './content';

const STRONG_OPEN_TOKEN = '__BUNYAN_STRONG_OPEN__';
const STRONG_CLOSE_TOKEN = '__BUNYAN_STRONG_CLOSE__';
const BR_TOKEN = '__BUNYAN_BR__';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripHtml(value: string, maxLength: number): string {
  return value.replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
}

export function sanitizeSubtitle(raw: string): string {
  const normalized = raw
    .slice(0, 1000)
    .replace(/<\s*strong\b[^>]*>/gi, STRONG_OPEN_TOKEN)
    .replace(/<\s*\/\s*strong\s*>/gi, STRONG_CLOSE_TOKEN)
    .replace(/<\s*br\b[^>]*\/?\s*>/gi, BR_TOKEN);

  return escapeHtml(normalized)
    .replaceAll(STRONG_OPEN_TOKEN, '<strong>')
    .replaceAll(STRONG_CLOSE_TOKEN, '</strong>')
    .replaceAll(BR_TOKEN, '<br />');
}

export function sanitizeHeroContent(value: unknown): HeroContent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const hero = value as Record<string, unknown>;

  if (
    typeof hero.badge !== 'string' ||
    typeof hero.title !== 'string' ||
    typeof hero.titleHighlight !== 'string' ||
    typeof hero.subtitle !== 'string' ||
    typeof hero.ctaPrimary !== 'string'
  ) {
    return null;
  }

  return {
    badge: stripHtml(hero.badge, 500),
    title: stripHtml(hero.title, 500),
    titleHighlight: stripHtml(hero.titleHighlight, 500),
    subtitle: sanitizeSubtitle(hero.subtitle),
    ctaPrimary: stripHtml(hero.ctaPrimary, 500),
  };
}

export function sanitizeFaqContent(value: unknown): FaqItem[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;

  const items = value.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const faq = item as Record<string, unknown>;

    if (typeof faq.q !== 'string' || typeof faq.a !== 'string') return null;

    return {
      q: stripHtml(faq.q, 300),
      a: stripHtml(faq.a, 1000),
    };
  });

  if (items.some((item) => item === null)) return null;
  return items as FaqItem[];
}
