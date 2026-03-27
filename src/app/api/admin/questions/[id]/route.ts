import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  const [row] = await db.select().from(questions).where(eq(questions.id, id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ question: row });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const db = getDb();
  const [row] = await db.update(questions).set({
    ageGroup: body.ageGroup,
    skillArea: body.skillArea,
    subSkill: body.subSkill,
    difficulty: body.difficulty,
    questionType: body.questionType,
    questionTextAr: body.questionTextAr,
    questionImageUrl: body.questionImageUrl || null,
    options: body.options,
    correctOptionIndex: body.correctOptionIndex,
    explanationAr: body.explanationAr,
    tags: body.tags || [],
    isActive: body.isActive ?? true,
  }).where(eq(questions.id, id)).returning();

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ question: row });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { isActive } = await req.json();
  const db = getDb();
  await db.update(questions).set({ isActive }).where(eq(questions.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  await db.delete(questions).where(eq(questions.id, id));
  return NextResponse.json({ success: true });
}
