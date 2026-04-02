'use client';
import { useEffect, useState } from 'react';
import { useGuest } from '@/hooks/useGuest';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { BADGES } from '@/lib/gamification/badges';
import { LEVELS } from '@/lib/gamification/levels';
import { getLevelForPoints, getLevelProgress, getNextLevel } from '@/lib/gamification/levels';
import { getSkillAreaLabel, getSkillAreaIcon, formatTime } from '@/lib/utils';
import { SkillArea } from '@/types';
import { getSkillBreakdown } from '@/lib/guest';
import ProgressBar from '@/components/ui/ProgressBar';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';
import RegisterPrompt from '@/components/auth/RegisterPrompt';

interface DbProgressData {
  totalSessions: number;
  totalCorrect: number;
  totalAnswered: number;
  totalPoints: number;
  currentStreak: number;
  skillBreakdown: Record<string, { correct: number; total: number }>;
  sessionHistory: Array<{
    skillArea: string;
    score: number;
    totalQuestions: number;
    pointsEarned: number;
    completedAt: string;
  }>;
}

export default function ProgressPage() {
  const { state, mounted, level, levelProgress, nextLevel } = useGuest();
  const { selectedChild, isLoggedIn } = useSelectedChild();
  const [dbData, setDbData] = useState<DbProgressData | null>(null);
  const [dbLoading, setDbLoading] = useState(false);

  // When logged in with a selected child, fetch progress from DB
  useEffect(() => {
    if (!isLoggedIn || !selectedChild?.id) return;
    setDbLoading(true);
    fetch(`/api/progress?childId=${selectedChild.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setDbData(data); })
      .catch(() => {})
      .finally(() => setDbLoading(false));
  }, [isLoggedIn, selectedChild?.id]);

  if (!mounted || !state || dbLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Use DB data if logged in with a child, otherwise fall back to guest localStorage
  const useDb = isLoggedIn && selectedChild && dbData;

  const totalSessions = useDb ? dbData.totalSessions : state.totalSessions;
  const totalCorrect = useDb ? dbData.totalCorrect : state.totalCorrect;
  const totalAnswered = useDb ? dbData.totalAnswered : state.totalAnswered;
  const totalPoints = useDb ? dbData.totalPoints : state.totalPoints;
  const currentStreak = useDb ? dbData.currentStreak : state.currentStreak;
  const accuracyPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const dbLevel = useDb ? getLevelForPoints(dbData.totalPoints) : null;
  const dbLevelProgress = useDb ? getLevelProgress(dbData.totalPoints) : 0;
  const dbNextLevel = dbLevel ? getNextLevel(dbLevel.level) : null;

  const displayLevel = useDb ? dbLevel : level;
  const displayLevelProgress = useDb ? dbLevelProgress : levelProgress;
  const displayNextLevel = useDb ? dbNextLevel : nextLevel;

  const breakdown = useDb
    ? Object.fromEntries(
        (['quantitative', 'verbal', 'logical_patterns'] as const).map(skill => [
          skill,
          dbData.skillBreakdown[skill] || { correct: 0, total: 0 },
        ])
      )
    : getSkillBreakdown(state);
  const weakest = (() => {
    let worst: string | null = null;
    let worstPct = Infinity;
    for (const skill of ['quantitative', 'verbal', 'logical_patterns'] as const) {
      const data = breakdown[skill];
      if (data && data.total > 0) {
        const pct = data.correct / data.total;
        if (pct < worstPct) { worstPct = pct; worst = skill; }
      }
    }
    return worst;
  })();
  const history = useDb
    ? dbData.sessionHistory.slice(0, 10)
    : (state.sessionHistory || []).slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <Link href="/practice" className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
            تدرب الآن
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <RegisterPrompt context="progress" redirectTo="/dashboard" />

        {/* Child name banner (when viewing child's progress) */}
        {useDb && selectedChild && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
            <p className="text-blue-800 font-semibold text-sm">تقدم {selectedChild.name}</p>
          </div>
        )}

        {/* Level Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-emerald-200 text-sm">المستوى الحالي</p>
              <h2 className="text-2xl font-extrabold">{displayLevel?.name || 'مبتدئ'}</h2>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black">{totalPoints.toLocaleString()}</div>
              <div className="text-emerald-200 text-sm">نقطة</div>
            </div>
          </div>
          <ProgressBar value={displayLevelProgress} color="amber" size="md" className="mb-2" />
          <p className="text-emerald-200 text-xs">
            {displayNextLevel ? `${displayNextLevel.pointsRequired - totalPoints} نقطة للمستوى "${displayNextLevel.name}"` : 'وصلت للمستوى الأعلى! 🏆'}
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold text-emerald-600">{totalSessions}</div>
            <div className="text-xs text-gray-500 mt-1">جلسة</div>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold text-blue-500">{accuracyPct}٪</div>
            <div className="text-xs text-gray-500 mt-1">نسبة الصحة</div>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold text-orange-500">🔥 {currentStreak}</div>
            <div className="text-xs text-gray-500 mt-1">يوم متتالي</div>
          </div>
        </div>

        {/* Skill Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">تحليل المهارات</h3>
          <div className="space-y-4">
            {(['quantitative', 'verbal', 'logical_patterns'] as const).map(skill => {
              const data = breakdown[skill];
              const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
              const color = pct >= 80 ? 'emerald' : pct >= 60 ? 'amber' : 'red';
              return (
                <div key={skill}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-gray-700">
                      {getSkillAreaIcon(skill)} {getSkillAreaLabel(skill)}
                    </span>
                    <span className="text-sm text-gray-500">{data.correct}/{data.total}</span>
                  </div>
                  <ProgressBar value={pct} color={color as 'emerald' | 'amber' | 'red'} size="md" showValue />
                </div>
              );
            })}
          </div>
        </div>

        {/* Weakness recommendation */}
        {weakest && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-amber-800 font-semibold text-sm mb-2">💡 توصية</p>
            <p className="text-amber-700 text-sm">ننصحك تتدرب على مهارة <strong>{getSkillAreaLabel(weakest as SkillArea)}</strong> — هي أضعف نقاط عندك الآن.</p>
            <Link
              href={`/practice?skill=${weakest}`}
              className="mt-2 inline-block bg-amber-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors"
            >
              تدرب الآن →
            </Link>
          </div>
        )}

        {/* Badges */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">الشارات</h3>
          <div className="grid grid-cols-4 gap-3">
            {BADGES.map(badge => {
              const earned = state.badges.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center p-3 rounded-xl text-center transition-all ${earned ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-100 opacity-50 grayscale'}`}
                  title={badge.criteria}
                >
                  <span className="text-2xl mb-1">{badge.icon}</span>
                  <span className="text-xs font-medium text-gray-700 leading-tight">{badge.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Session History */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">آخر الجلسات</h3>
            <div className="space-y-2">
              {history.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{getSkillAreaIcon(s.skillArea as never)}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{getSkillAreaLabel(s.skillArea as never)}</div>
                      <div className="text-xs text-gray-400">{s.completedAt ? new Date(s.completedAt).toLocaleDateString('ar-EG') : ''}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${s.totalQuestions > 0 && (s.score / s.totalQuestions) >= 0.8 ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {s.score}/{s.totalQuestions}
                    </div>
                    <div className="text-xs text-amber-500">+{s.pointsEarned} نقطة</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalSessions === 0 && (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🎯</div>
            <p className="text-gray-600 mb-4">لم تبدأ أي جلسة بعد!</p>
            <Link href="/practice" className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
              ابدأ الآن
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
