import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { questionId, selectedOption } = await req.json();

    if (!questionId || selectedOption === undefined) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const db = getDb();
    const [q] = await db
      .select({ correctOptionIndex: questions.correctOptionIndex, explanationAr: questions.explanationAr })
      .from(questions)
      .where(eq(questions.id, questionId));

    if (!q) {
      return NextResponse.json({ error: 'السؤال غير موجود' }, { status: 404 });
    }

    return NextResponse.json({
      isCorrect: selectedOption === q.correctOptionIndex,
      correctOptionIndex: q.correctOptionIndex,
      explanationAr: q.explanationAr,
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
