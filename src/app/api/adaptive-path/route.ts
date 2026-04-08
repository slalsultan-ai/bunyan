import { NextRequest, NextResponse } from 'next/server';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { generateAdaptiveSession, getPathSummary } from '@/lib/adaptive-path';
import { getAuthenticatedParent } from '@/lib/parent-auth';

export async function GET(req: NextRequest) {
  try {
    const parent = await getAuthenticatedParent();
    const email = parent?.email ?? null;

    const enabled = await hasFeatureAccess('adaptive_path', email, parent?.id);
    if (!enabled) {
      return NextResponse.json({ enabled: false });
    }

    const { searchParams } = req.nextUrl;
    const childId = searchParams.get('childId');
    const ageGroup = searchParams.get('ageGroup');

    if (!childId || !ageGroup || !['4-5', '6-9', '10-12'].includes(ageGroup)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const [session, summary] = await Promise.all([
      generateAdaptiveSession(childId, ageGroup),
      getPathSummary(childId),
    ]);

    return NextResponse.json({
      enabled: true,
      session: {
        id: session.id,
        questions: session.questions,
        focusAreas: session.focusAreas,
        sessionNumber: session.sessionNumber,
        recalculateAfter: session.recalculateAfter,
        isDiagnostic: session.isDiagnostic,
      },
      summary,
    });
  } catch (e) {
    console.error('[adaptive-path GET]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
