import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getHeroContent, getFaqContent, setContent } from '@/lib/content';
import type { HeroContent, FaqItem } from '@/lib/content';

// Strip all HTML except <br> and <strong> — prevents stored XSS via subtitle field
function sanitizeSubtitle(raw: string): string {
  return raw.replace(/<(?!\/?(?:br|strong)\b)[^>]+>/gi, '').slice(0, 1000);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').slice(0, 500);
}

function sanitizeHero(value: unknown): HeroContent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.badge !== 'string' || typeof v.title !== 'string' ||
    typeof v.titleHighlight !== 'string' || typeof v.subtitle !== 'string' ||
    typeof v.ctaPrimary !== 'string'
  ) return null;
  return {
    badge: stripHtml(v.badge),
    title: stripHtml(v.title),
    titleHighlight: stripHtml(v.titleHighlight),
    subtitle: sanitizeSubtitle(v.subtitle),
    ctaPrimary: stripHtml(v.ctaPrimary),
  };
}

function sanitizeFaq(value: unknown): FaqItem[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > 20) return null;
  const items = value.map((item: unknown) => {
    if (!item || typeof item !== 'object') return null;
    const i = item as Record<string, unknown>;
    if (typeof i.q !== 'string' || typeof i.a !== 'string') return null;
    return { q: stripHtml(i.q).slice(0, 300), a: stripHtml(i.a).slice(0, 1000) };
  });
  if (items.some(i => i === null)) return null;
  return items as FaqItem[];
}

export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [hero, faq] = await Promise.all([getHeroContent(), getFaqContent()]);
  return NextResponse.json({ hero, faq });
}

export async function PATCH(req: NextRequest) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { key, value } = body;

  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key و value مطلوبان' }, { status: 400 });
  }

  if (!['hero', 'faq'].includes(key)) {
    return NextResponse.json({ error: 'مفتاح غير صالح' }, { status: 400 });
  }

  let sanitized: HeroContent | FaqItem[] | null = null;
  if (key === 'hero') sanitized = sanitizeHero(value);
  if (key === 'faq') sanitized = sanitizeFaq(value);
  if (sanitized === null) {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    await setContent(key, sanitized);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  revalidatePath('/');
  return NextResponse.json({ ok: true });
}
