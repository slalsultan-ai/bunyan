import { NextRequest, NextResponse } from 'next/server';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { analyzeChildSkills } from '@/lib/adaptive-path';
import { getAuthenticatedParent } from '@/lib/parent-auth';

export async function GET(req: NextRequest) {
  try {
    const parent = await getAuthenticatedParent();
    const email = parent?.email ?? null;

    const enabled = await hasFeatureAccess('adaptive_path', email);
    if (!enabled) {
      return NextResponse.json({ enabled: false });
    }

    const childId = req.nextUrl.searchParams.get('childId');
    if (!childId) {
      return NextResponse.json({ error: 'childId required' }, { status: 400 });
    }

    const skills = await analyzeChildSkills(childId);

    const overall = skills.length > 0
      ? Math.round(skills.reduce((sum, s) => sum + s.accuracy, 0) / skills.length)
      : 0;

    const strongPoints = skills.filter((s) => s.accuracy >= 80);
    const weakPoints = skills.filter((s) => s.accuracy < 60);

    return NextResponse.json({
      enabled: true,
      skills,
      overallAccuracy: overall,
      strongPoints: strongPoints.map((s) => ({ name: s.subSkill, accuracy: s.accuracy })),
      weakPoints: weakPoints.map((s) => ({ name: s.subSkill, accuracy: s.accuracy })),
    });
  } catch (e) {
    console.error('[adaptive-path analysis]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
