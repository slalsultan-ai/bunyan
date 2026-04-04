import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import {
  getTodayPosts,
  generatePost,
  markCopied,
  getRecentPosts,
} from '@/lib/linkedin-content';
import type { PostType, AccountType } from '@/lib/linkedin-templates';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [todayPosts, platformHistory, personalHistory] = await Promise.all([
    getTodayPosts(),
    getRecentPosts(30, 'platform'),
    getRecentPosts(30, 'personal'),
  ]);

  return NextResponse.json({
    todayPosts,
    history: { platform: platformHistory, personal: personalHistory },
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { action, type, account } = body;

  if (action === 'regenerate') {
    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }
    const acct: AccountType = account === 'personal' ? 'personal' : 'platform';
    const post = await generatePost(type as PostType, undefined, acct);
    return NextResponse.json({ post });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id, copied } = body;

  if (!id || typeof id !== 'number') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  if (copied) {
    await markCopied(id);
  }

  return NextResponse.json({ success: true });
}
