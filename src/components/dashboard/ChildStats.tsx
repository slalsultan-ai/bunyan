'use client';
import { useState, useEffect, useCallback } from 'react';

interface WeeklyActivity {
  week: string;
  sessions: number;
  correct: number;
  total: number;
}

interface SkillData {
  correct: number;
  total: number;
}

interface StatsData {
  weeklyActivity: WeeklyActivity[];
  skillBreakdown: {
    quantitative: SkillData;
    verbal: SkillData;
    logical_patterns: SkillData;
  };
  recentAvgScore: number;
  totalSessions: number;
  lastPracticedAt: string | null;
}

interface ChildStatsProps {
  childId: string;
  childName: string;
}

const SKILL_LABELS: Record<string, string> = {
  quantitative: 'كمي',
  verbal: 'لفظي',
  logical_patterns: 'تفكير منطقي',
};

function getSkillColor(pct: number): 'emerald' | 'amber' | 'red' {
  if (pct >= 80) return 'emerald';
  if (pct >= 60) return 'amber';
  return 'red';
}

const COLOR_CLASSES = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

export default function ChildStats({ childId, childName }: ChildStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?childId=${childId}`);
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getWeakestSkill = () => {
    if (!stats) return null;
    const skills = Object.entries(stats.skillBreakdown) as [string, SkillData][];
    const withPct = skills.map(([key, data]) => ({
      key,
      label: SKILL_LABELS[key],
      pct: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      hasData: data.total > 0,
    }));
    const withData = withPct.filter(s => s.hasData);
    if (withData.length === 0) return null;
    return withData.reduce((min, s) => (s.pct < min.pct ? s : min));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'لم يتدرب بعد';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header with toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
      >
        <h3 className="font-bold text-gray-900 text-lg">📊 إحصائيات {childName}</h3>
        <span
          className="text-gray-400 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▼
        </span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !stats ? (
            <p className="text-center text-gray-500 py-8">حدث خطأ في تحميل البيانات</p>
          ) : (
            <>
              {/* Quick Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{stats.totalSessions}</p>
                  <p className="text-xs text-emerald-600 mt-1">إجمالي الجلسات</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">
                    {Math.round(stats.recentAvgScore)}٪
                  </p>
                  <p className="text-xs text-amber-600 mt-1">متوسط الدرجات</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-sm font-bold text-blue-700">{formatDate(stats.lastPracticedAt)}</p>
                  <p className="text-xs text-blue-600 mt-1">آخر تدريب</p>
                </div>
              </div>

              {/* Weekly Activity Chart */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">النشاط الأسبوعي</h4>
                <div className="flex items-end justify-around gap-3 h-32 bg-gray-50 rounded-xl p-4">
                  {stats.weeklyActivity.slice(-4).map((week, i) => {
                    const maxSessions = Math.max(
                      ...stats.weeklyActivity.slice(-4).map(w => w.sessions),
                      1
                    );
                    const heightPct = (week.sessions / maxSessions) * 100;
                    return (
                      <div key={i} className="flex flex-col items-center flex-1 h-full justify-end">
                        <span className="text-xs font-semibold text-gray-600 mb-1">
                          {week.sessions}
                        </span>
                        <div
                          className="w-full max-w-[40px] bg-emerald-500 rounded-t-lg transition-all duration-500"
                          style={{ height: `${Math.max(heightPct, 4)}%` }}
                        />
                        <span className="text-xs text-gray-500 mt-2">أسبوع {i + 1}</span>
                      </div>
                    );
                  })}
                  {stats.weeklyActivity.length === 0 && (
                    <p className="text-sm text-gray-400 self-center w-full text-center">
                      لا توجد بيانات بعد
                    </p>
                  )}
                </div>
              </div>

              {/* Skill Breakdown */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">تحليل المهارات</h4>
                <div className="space-y-3">
                  {(
                    Object.entries(stats.skillBreakdown) as [string, SkillData][]
                  ).map(([key, data]) => {
                    const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                    const color = getSkillColor(pct);
                    return (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {SKILL_LABELS[key]}
                          </span>
                          <span className="text-xs text-gray-500">
                            {data.correct}/{data.total} — {pct}٪
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`${COLOR_CLASSES[color]} h-2.5 rounded-full transition-all duration-700 ease-out`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommendation */}
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <p className="text-sm text-emerald-800">
                  {stats.totalSessions === 0 ? (
                    <>💡 لم تكتمل أي جلسة بعد — ابدأوا الآن!</>
                  ) : (
                    (() => {
                      const weakest = getWeakestSkill();
                      if (!weakest) return <>💡 لم تكتمل أي جلسة بعد — ابدأوا الآن!</>;
                      return (
                        <>
                          💡 ننصح بالتركيز على {weakest.label} — أداء {childName} فيها{' '}
                          {weakest.pct}٪
                        </>
                      );
                    })()
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
