'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';

interface Skill {
  skillArea: string;
  subSkill: string;
  accuracy: number;
  totalQuestions: number;
  trend: 'improving' | 'stable' | 'declining';
}

const TREND_LABEL: Record<string, { icon: string; text: string; color: string }> = {
  improving: { icon: '↑', text: 'تحسّن', color: 'text-emerald-500' },
  stable: { icon: '→', text: 'مستقر', color: 'text-gray-400' },
  declining: { icon: '↓', text: 'تراجع', color: 'text-red-500' },
};

const SKILL_AREA_LABELS: Record<string, string> = {
  quantitative: 'كمّي',
  verbal: 'لفظي',
  logical_patterns: 'منطقي',
};

export default function AnalysisPage() {
  const router = useRouter();
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag('adaptive_path');
  const { selectedChild, loading: childLoading } = useSelectedChild();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [overallAccuracy, setOverallAccuracy] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!flagLoading && !flagEnabled) router.replace('/practice');
  }, [flagLoading, flagEnabled, router]);

  useEffect(() => {
    if (!selectedChild || !flagEnabled) return;
    fetch(`/api/adaptive-path/analysis?childId=${selectedChild.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.enabled) {
          setSkills(data.skills);
          setOverallAccuracy(data.overallAccuracy);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedChild, flagEnabled]);

  if (flagLoading || childLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group skills by skillArea
  const grouped = new Map<string, Skill[]>();
  for (const s of skills) {
    if (!grouped.has(s.skillArea)) grouped.set(s.skillArea, []);
    grouped.get(s.skillArea)!.push(s);
  }

  const barColor = (acc: number) =>
    acc >= 80 ? 'bg-emerald-500' : acc >= 60 ? 'bg-amber-400' : 'bg-red-400';

  const textColor = (acc: number) =>
    acc >= 80 ? 'text-emerald-600' : acc >= 60 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-blue-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <Link href="/practice/smart" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">المسار الذكي</Link>
            <Link href="/practice" className="text-gray-500 hover:text-gray-700 text-sm">التمارين</Link>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">📊 تحليل مهاراتي</h1>

        {skills.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center mt-6">
            <p className="text-gray-500">لا توجد بيانات كافية بعد. أكمل بعض الجلسات أولاً.</p>
            <Link href="/practice/smart" className="text-indigo-600 font-medium text-sm mt-3 inline-block">ابدأ المسار الذكي</Link>
          </div>
        ) : (
          <>
            {/* Overall */}
            <div className="bg-white rounded-2xl p-4 border border-indigo-100 mb-6 text-center">
              <p className="text-sm text-gray-500 mb-1">المتوسط العام</p>
              <p className={`text-3xl font-bold ${textColor(overallAccuracy)}`}>{overallAccuracy}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className={`h-2 rounded-full ${barColor(overallAccuracy)}`} style={{ width: `${overallAccuracy}%` }} />
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mb-4">
              <span>🟢 ≥80%</span>
              <span>🟡 60-79%</span>
              <span>🔴 &lt;60%</span>
            </div>

            {/* Per skill area */}
            {['quantitative', 'verbal', 'logical_patterns'].map((area) => {
              const areaSkills = grouped.get(area);
              if (!areaSkills || areaSkills.length === 0) return null;
              return (
                <div key={area} className="mb-5">
                  <h2 className="text-sm font-bold text-gray-700 mb-2">
                    {SKILL_AREA_LABELS[area] || area}
                  </h2>
                  <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                    {areaSkills.sort((a, b) => a.accuracy - b.accuracy).map((s) => {
                      const trend = TREND_LABEL[s.trend] || TREND_LABEL.stable;
                      return (
                        <div key={s.subSkill} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${textColor(s.accuracy)}`}>{s.accuracy}%</span>
                              <span className={`text-xs ${trend.color}`}>{trend.icon}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-700">{s.subSkill}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${barColor(s.accuracy)}`} style={{ width: `${s.accuracy}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
