import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getHeroContent, getFaqContent, setContent } from '@/lib/content';

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

  await setContent(key, value);
  revalidateTag('site-content');

  return NextResponse.json({ ok: true });
}
