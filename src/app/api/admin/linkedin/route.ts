import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import {
  getTodayPosts,
  generatePost,
  markCopied,
  getRecentPosts,
} from '@/lib/linkedin-content';
import type { PostType } from '@/lib/linkedin-templates';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [todayPosts, history] = await Promise.all([
    getTodayPosts(),
    getRecentPosts(30),
  ]);

  return NextResponse.json({ todayPosts, history });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { action, type } = body;

  if (action === 'regenerate') {
    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }
    const post = await generatePost(type as PostType);
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
