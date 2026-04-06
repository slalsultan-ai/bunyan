import { NextRequest, NextResponse } from 'next/server';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { completeAdaptiveSession, getPathSummary, analyzeChildSkills } from '@/lib/adaptive-path';
import { getAuthenticatedParent } from '@/lib/parent-auth';

export async function POST(req: NextRequest) {
  try {
    const parent = await getAuthenticatedParent();
    const email = parent?.email ?? null;

    const enabled = await hasFeatureAccess('adaptive_path', email);
    if (!enabled) {
      return NextResponse.json({ error: 'Feature disabled' }, { status: 403 });
    }

    const body = await req.json();
    const { childId, sessionId, answers } = body;

    if (!childId || !sessionId || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { accuracy, needsRecalculation } = await completeAdaptiveSession(
      sessionId,
      answers.map((a: any) => ({
        questionId: String(a.questionId),
        isCorrect: Boolean(a.isCorrect),
      }))
    );

    const summary = await getPathSummary(childId);

    let recalculationData = null;
    if (needsRecalculation) {
      const skills = await analyzeChildSkills(childId);
      recalculationData = {
        skills: skills.map((s) => ({
          subSkill: s.subSkill,
          accuracy: s.accuracy,
          trend: s.trend,
        })),
      };
    }

    return NextResponse.json({
      accuracy,
      needsRecalculation,
      recalculation: recalculationData,
      summary,
    });
  } catch (e) {
    console.error('[adaptive-path complete]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
