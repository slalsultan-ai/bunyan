import { NextResponse } from 'next/server';
import { getParentSession } from '@/lib/parent-auth';
import { getUserFeatures } from '@/lib/feature-flags';

export async function GET() {
  const session = await getParentSession();
  const email = session?.email ?? null;
  const parentId = session?.parentId ?? null;
  const features = await getUserFeatures(email, parentId);
  return NextResponse.json(features);
}
