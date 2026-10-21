import { NextResponse } from 'next/server';
import { getPublicContentStats } from '@/lib/public-content-stats';

export const revalidate = 3600;

export async function GET() {
  try {
    return NextResponse.json(await getPublicContentStats());
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
