import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { isAdminAuthenticated } from '@/lib/admin-auth';

const VALID_AGE_GROUPS  = new Set(['4-5', '6-9', '10-12']);
const VALID_SKILL_AREAS = new Set(['quantitative', 'verbal', 'logical_patterns', 'mixed']);
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'mixed']);
const VALID_TYPES        = new Set(['text', 'image', 'audio', 'mixed']);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateRow(row: any, index: number): string | null {
  const { ageGroup, skillArea, subSkill, difficulty, questionType,
          questionTextAr, options, correctOptionIndex, explanationAr } = row;

  if (!ageGroup || !skillArea || !subSkill || !difficulty || !questionType ||
      !questionTextAr || !explanationAr)
    return `صف ${index + 1}: بيانات ناقصة`;

  if (!VALID_AGE_GROUPS.has(ageGroup))   return `صف ${index + 1}: ageGroup غير صالح (${ageGroup})`;
  if (!VALID_SKILL_AREAS.has(skillArea)) return `صف ${index + 1}: skillArea غير صالح (${skillArea})`;
  if (!VALID_DIFFICULTIES.has(difficulty)) return `صف ${index + 1}: difficulty غير صالح`;
  if (!VALID_TYPES.has(questionType))    return `صف ${index + 1}: questionType غير صالح`;

  if (typeof questionTextAr !== 'string' || questionTextAr.trim().length === 0 || questionTextAr.length > 2000)
    return `صف ${index + 1}: نص السؤال غير صالح`;

  if (typeof explanationAr !== 'string' || explanationAr.length > 2000)
    return `صف ${index + 1}: الشرح غير صالح`;

  if (!Array.isArray(options) || options.length !== 4)
    return `صف ${index + 1}: يجب 4 خيارات بالضبط`;

  if (!Number.isInteger(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3)
    return `صف ${index + 1}: correctOptionIndex يجب بين 0 و 3`;

  return null;
}

export async function POST(req: NextRequest) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON غير صالح' }, { status: 400 });
  }

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'يجب أن يكون الجسم مصفوفة من الأسئلة' }, { status: 400 });
  }

  if (body.length === 0) {
    return NextResponse.json({ error: 'المصفوفة فارغة' }, { status: 400 });
  }

  if (body.length > 500) {
    return NextResponse.json({ error: 'الحد الأقصى 500 سؤال لكل عملية استيراد' }, { status: 400 });
  }

  // Validate all rows first — fail fast before touching DB
  const errors: string[] = [];
  for (let i = 0; i < body.length; i++) {
    const err = validateRow(body[i], i);
    if (err) errors.push(err);
    if (errors.length >= 10) { errors.push('... وأخطاء أخرى'); break; }
  }
  if (errors.length > 0) {
    return NextResponse.json({ error: 'أخطاء في التحقق', errors }, { status: 400 });
  }

  const db = getDb();

  // Check which IDs already exist (skip duplicates by ID)
  const incomingIds = body
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) => r.id)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);

  const existingIds = new Set<string>();
  if (incomingIds.length > 0) {
    // SQLite variable limit is 999; chunk to stay well under it
    const chunkSize = 200;
    for (let i = 0; i < incomingIds.length; i += chunkSize) {
      const chunk = incomingIds.slice(i, i + chunkSize);
      // One query per chunk (not one per ID)
      const rows = await db.select({ id: questions.id }).from(questions).where(inArray(questions.id, chunk));
      for (const row of rows) existingIds.add(row.id);
    }
  }

  let inserted = 0;
  let skipped  = 0;

  for (const row of body as Record<string, unknown>[]) {
    const rowId = typeof row.id === 'string' && row.id.length > 0 ? row.id : null;

    if (rowId && existingIds.has(rowId)) {
      skipped++;
      continue;
    }

    await db.insert(questions).values({
      id: rowId ?? crypto.randomUUID(),
      ageGroup:           String(row.ageGroup),
      skillArea:          String(row.skillArea),
      subSkill:           String(row.subSkill),
      difficulty:         String(row.difficulty),
      questionType:       String(row.questionType),
      questionTextAr:     String(row.questionTextAr).trim(),
      questionImageUrl:   typeof row.questionImageUrl === 'string' ? row.questionImageUrl : null,
      options:            row.options as Array<{ text: string; imageUrl?: string }>,
      correctOptionIndex: Number(row.correctOptionIndex),
      explanationAr:      String(row.explanationAr),
      tags:               Array.isArray(row.tags) ? row.tags as string[] : [],
      isActive:           row.isActive === false ? false : true,
    });

    inserted++;
  }

  return NextResponse.json({ inserted, skipped, total: body.length });
}
