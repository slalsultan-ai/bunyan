import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { rateLimit, getIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const rl = rateLimit(`check:${getIp(req)}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  try {
    const { questionId, selectedOption } = await req.json();

    if (!questionId || typeof questionId !== 'string' || !/^[0-9a-f-]{36}$/.test(questionId)) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }
    if (selectedOption === undefined || !Number.isInteger(selectedOption) || selectedOption < 0 || selectedOption > 3) {
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
