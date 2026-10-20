import { NextRequest, NextResponse } from 'next/server';
import { masteryErrorResponse, resolveMasteryAccess } from '@/lib/mastery/access';
import { MasteryError, sessionMasteries, submitAnswer } from '@/lib/mastery/service';
import { checkRateLimit, getIp } from '@/lib/rate-limit-db';

/** Score the current question on the server, update the model, serve the next one. */
export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`mastery-answer:${getIp(req)}`, 60, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const access = await resolveMasteryAccess(body?.childId, body?.track);
    const { sessionId, questionId, selectedOption } = body ?? {};
    if (!Number.isInteger(sessionId) || typeof questionId !== 'string'
      || !Number.isInteger(selectedOption) || selectedOption < 0 || selectedOption > 5) {
      throw new MasteryError('بيانات ناقصة', 400);
    }

    const result = await submitAnswer({
      childId: access.childId,
      ageGroup: access.ageGroup,
      sessionId,
      questionId,
      selectedOption,
      parentEmail: access.email,
    });
    const sessionMastered = result.session.completed
      ? await sessionMasteries(access.childId, sessionId, access.ageGroup)
      : [];
    return NextResponse.json({ ...result, sessionMastered });
  } catch (e) {
    return masteryErrorResponse(e, 'answer');
  }
}
