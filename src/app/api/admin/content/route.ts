import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getHeroContent, getFaqContent, setContent } from '@/lib/content';
import { sanitizeHeroContent, sanitizeFaqContent } from '@/lib/content-sanitize';

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

  let sanitized = null;
  if (key === 'hero') sanitized = sanitizeHeroContent(value);
  if (key === 'faq') sanitized = sanitizeFaqContent(value);
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
