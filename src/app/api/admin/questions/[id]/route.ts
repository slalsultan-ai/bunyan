import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions, sessionAnswers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isAdminAuthenticated } from '@/lib/admin-auth';

const VALID_AGE_GROUPS = new Set(['4-5', '6-9', '10-12']);
const VALID_SKILL_AREAS = new Set(['quantitative', 'verbal', 'logical_patterns', 'mixed']);
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'mixed']);
const VALID_TYPES = new Set(['text', 'image', 'audio', 'mixed']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateQuestionBody(body: any): string | null {
  const { ageGroup, skillArea, difficulty, questionType, questionTextAr, options, correctOptionIndex, explanationAr, tags } = body;
  if (ageGroup && !VALID_AGE_GROUPS.has(ageGroup)) return 'ageGroup غير صالح';
  if (skillArea && !VALID_SKILL_AREAS.has(skillArea)) return 'skillArea غير صالح';
  if (difficulty && !VALID_DIFFICULTIES.has(difficulty)) return 'difficulty غير صالح';
  if (questionType && !VALID_TYPES.has(questionType)) return 'questionType غير صالح';
  if (questionTextAr !== undefined && (typeof questionTextAr !== 'string' || questionTextAr.trim().length === 0 || questionTextAr.length > 2000)) return 'نص السؤال غير صالح';
  if (explanationAr !== undefined && (typeof explanationAr !== 'string' || explanationAr.length > 2000)) return 'الشرح غير صالح';
  if (options !== undefined && (!Array.isArray(options) || options.length !== 4)) return 'يجب تقديم 4 خيارات';
  if (correctOptionIndex !== undefined && (!Number.isInteger(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3)) return 'correctOptionIndex يجب أن يكون بين 0 و 3';
  if (tags !== undefined && (!Array.isArray(tags) || tags.some((t: unknown) => typeof t !== 'string'))) return 'tags غير صالح';
  return null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const db = getDb();
  const [row] = await db.select().from(questions).where(eq(questions.id, id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ question: row });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json();
  const err = validateQuestionBody(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const db = getDb();
  const [row] = await db.update(questions).set({
    ageGroup: body.ageGroup,
    skillArea: body.skillArea,
    subSkill: body.subSkill,
    difficulty: body.difficulty,
    questionType: body.questionType,
    questionTextAr: typeof body.questionTextAr === 'string' ? body.questionTextAr.trim() : body.questionTextAr,
    questionImageUrl: typeof body.questionImageUrl === 'string' ? body.questionImageUrl : null,
    options: body.options,
    correctOptionIndex: body.correctOptionIndex,
    explanationAr: body.explanationAr,
    tags: Array.isArray(body.tags) ? body.tags : [],
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
  }).where(eq(questions.id, id)).returning();

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ question: row });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { isActive } = await req.json();
  if (typeof isActive !== 'boolean') return NextResponse.json({ error: 'isActive يجب أن يكون boolean' }, { status: 400 });

  const db = getDb();
  await db.update(questions).set({ isActive }).where(eq(questions.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const db = getDb();
  // Delete associated session answers first (no cascade on FK)
  await db.delete(sessionAnswers).where(eq(sessionAnswers.questionId, id));
  await db.delete(questions).where(eq(questions.id, id));
  return NextResponse.json({ success: true });
}
