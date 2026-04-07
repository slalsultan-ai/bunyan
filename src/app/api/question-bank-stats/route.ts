import { NextRequest, NextResponse } from 'next/server';
import { getQuestionBankStats } from '@/lib/question-access';

export async function GET(req: NextRequest) {
  try {
    const ageGroup = req.nextUrl.searchParams.get('ageGroup');
    if (!ageGroup) {
      return NextResponse.json({ error: 'ageGroup is required' }, { status: 400 });
    }

    const stats = await getQuestionBankStats(ageGroup);
    return NextResponse.json(stats);
  } catch (e) {
    console.error('[question-bank-stats error]', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
