import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAllFlags, updateFlag } from '@/lib/feature-flags';

export async function GET() {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const flags = await getAllFlags();
  return NextResponse.json({ flags });
}

export async function PUT(req: NextRequest) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { flagKey, enabled, allowed_emails } = body;

  if (!flagKey || typeof flagKey !== 'string') {
    return NextResponse.json({ error: 'flagKey is required' }, { status: 400 });
  }

  await updateFlag(flagKey, {
    enabled: typeof enabled === 'boolean' ? enabled : undefined,
    allowed_emails: typeof allowed_emails === 'string' ? allowed_emails : undefined,
  });

  return NextResponse.json({ success: true });
}
