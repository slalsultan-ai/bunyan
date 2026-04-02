import { NextResponse } from 'next/server';
import { getParentSession } from '@/lib/parent-auth';
import { getUserFeatures } from '@/lib/feature-flags';

export async function GET() {
  const session = await getParentSession();
  const email = session?.email ?? null;
  const features = await getUserFeatures(email);
  return NextResponse.json(features);
}
