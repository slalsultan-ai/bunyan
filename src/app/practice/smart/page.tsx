'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { useGuest } from '@/hooks/useGuest';
import { useBunaa } from '@/hooks/useBunaa';
import BunaaBubble from '@/components/mascot/BunaaBubble';
import { computeAgeGroupClient } from '@/lib/age-utils';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';

interface SkillFocus {
  name: string;
  accuracy: number;
  trend: string;
}

interface SessionQuestion {
  id: string;
  skillArea: string;
  questionTextAr: string;
  questionImageUrl: string | null;
  options: Array<{ text: string; imageUrl?: string }>;
}

interface PathSummary {
  focusAreas: SkillFocus[];
  sessionsCompleted: number;
  nextRecalculation: number;
  overallProgress: number;
  hasSufficientData: boolean;
}

type Phase = 'loading' | 'intro' | 'ready' | 'playing' | 'completed' | 'recalculation';

const TREND_ICONS: Record<string, string> = {
  improving: '↗',
  stable: '→',
  declining: '↘',
};

export default function SmartPathPage() {
  const router = useRouter();
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag('adaptive_path');
  const { selectedChild, loading: childLoading } = useSelectedChild();
  const bunaa = useBunaa();
  const { state } = useGuest();

  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [summary, setSummary] = useState<PathSummary | null>(null);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [isDiagnostic, setIsDiagnostic] = useState(false);
  const [sessionNumber, setSessionNumber] = useState(0);

  // Playing state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<{ questionId: string; isCorrect: boolean }>>([]);

  // Completion state
  const [completionAccuracy, setCompletionAccuracy] = useState(0);
  const [recalculation, setRecalculation] = useState<Array<{ subSkill: string; accuracy: number; trend: string }> | null>(null);

  // Redirect if flag disabled
  useEffect(() => {
    if (!flagLoading && !flagEnabled) router.replace('/practice');
  }, [flagLoading, flagEnabled, router]);

  // Load adaptive session
  const loadSession = useCallback(async () => {
    if (!selectedChild) return;
    const ageGroup = computeAgeGroupClient(selectedChild.age);
    try {
      const res = await fetch(`/api/adaptive-path?childId=${selectedChild.id}&ageGroup=${ageGroup}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.enabled) { router.replace('/practice'); return; }

      setQuestions(data.session.questions);
      setSessionId(data.session.id);
      setFocusAreas(data.session.focusAreas);
      setIsDiagnostic(data.session.isDiagnostic);
      setSessionNumber(data.session.sessionNumber);
      setSummary(data.summary);

      if (!data.summary.hasSufficientData && data.session.isDiagnostic) {
        setPhase('intro');
      } else {
        setPhase('ready');
      }
    } catch (e) {
      console.error('Failed to load adaptive path:', e);
    }
  }, [selectedChild, router]);

  useEffect(() => {
    if (!childLoading && selectedChild && flagEnabled) loadSession();
  }, [childLoading, selectedChild, flagEnabled, loadSession]);

  const handleStart = () => {
    setPhase('playing');
    setCurrentIndex(0);
    setAnswers([]);
    bunaa.trigger('session_start');
  };

  const handleSelectAnswer = async (optionIndex: number) => {
    if (isReviewing || !questions[currentIndex]) return;
    setSelectedOption(optionIndex);
    setIsReviewing(true);

    const q = questions[currentIndex];
    try {
      const res = await fetch('/api/questions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: q.id, selectedOption: optionIndex }),
      });
      const data = await res.json();
      setIsCorrect(data.isCorrect);
      setCorrectOptionIndex(data.correctOptionIndex);
      setAnswers((prev) => [...prev, { questionId: q.id, isCorrect: data.isCorrect }]);
      bunaa.onAnswer(data.isCorrect);

      // Session half check
      const answered = currentIndex + 1;
      if (answered === Math.floor(questions.length / 2)) {
        bunaa.trigger('session_half');
      }
    } catch {
      setIsCorrect(false);
      setCorrectOptionIndex(-1);
      setAnswers((prev) => [...prev, { questionId: q.id, isCorrect: false }]);
    }
  };

  const handleNext = async () => {
    if (currentIndex >= questions.length - 1) {
      // Complete session
      if (sessionId && selectedChild) {
        try {
          const res = await fetch('/api/adaptive-path/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ childId: selectedChild.id, sessionId, answers }),
          });
          const data = await res.json();
          setCompletionAccuracy(data.accuracy);
          setSummary(data.summary);
          if (data.accuracy === 100) {
            bunaa.trigger('perfect_session');
          } else {
            bunaa.trigger('session_end');
          }
          if (data.needsRecalculation && data.recalculation) {
            setRecalculation(data.recalculation.skills);
            setPhase('recalculation');
          } else {
            setPhase('completed');
          }
        } catch {
          setPhase('completed');
        }
      } else {
        setPhase('completed');
      }
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsReviewing(false);
      setIsCorrect(null);
      setCorrectOptionIndex(null);
    }
  };

  const skillLabel = (skill: string) => {
    if (skill === 'quantitative') return 'كمي';
    if (skill === 'verbal') return 'لفظي';
    if (skill === 'logical_patterns') return 'منطقي';
    return skill;
  };

  // ─── Loading ──────────────────────────────────────────────────────────
  if (flagLoading || childLoading || phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!selectedChild) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-700 font-bold text-lg mb-2">سجّل دخولك أولاً</p>
          <p className="text-gray-500 mb-4">المسار الذكي متاح للأطفال المسجلين</p>
          <Link href="/auth" className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl">تسجيل الدخول</Link>
        </div>
      </div>
    );
  }

  // ─── Intro (diagnostic) ───────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-blue-50">
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Logo size="sm" />
            <Link href="/practice" className="text-gray-500 hover:text-gray-700 text-sm">التمارين</Link>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="text-5xl mb-4">🧠</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">المسار الذكي</h1>
          <p className="text-gray-600 mb-2">مرحباً! عشان نصمّم لك مساراً مخصصاً، نحتاج نعرف مستواك أولاً.</p>
          <p className="text-gray-500 mb-2">ستحلّ 10 أسئلة تشخيصية متنوعة.</p>
          <p className="text-gray-500 mb-8">لا تقلق — هذي مو اختبار! هدفها نفهم نقاط قوتك.</p>
          <button
            onClick={handleStart}
            className="w-full bg-gradient-to-l from-indigo-500 to-blue-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all"
          >
            🚀 ابدأ الجلسة التشخيصية
          </button>
        </div>
      </div>
    );
  }

  // ─── Ready ────────────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-blue-50">
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Logo size="sm" />
            <Link href="/practice" className="text-gray-500 hover:text-gray-700 text-sm">التمارين</Link>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-8 text-center">
          <div className="text-5xl mb-4">🧠</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">المسار الذكي</h1>

          {/* Focus areas */}
          {focusAreas.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-indigo-100 mb-4 text-right">
              <p className="text-sm font-bold text-gray-700 mb-3">تركيز اليوم</p>
              {summary?.focusAreas.map((area, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-500">{area.accuracy}% {TREND_ICONS[area.trend] || '→'}</span>
                  <span className="text-sm font-medium text-gray-800">
                    {area.accuracy < 60 ? '🎯' : '✨'} {area.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Progress */}
          {summary && (
            <div className="bg-white rounded-2xl p-4 border border-indigo-100 mb-6">
              <p className="text-sm text-gray-600 mb-2">التقدم العام</p>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className="bg-gradient-to-l from-indigo-500 to-blue-500 h-3 rounded-full transition-all"
                  style={{ width: `${summary.overallProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>الجلسة {sessionNumber}</span>
                <span>{summary.overallProgress}%</span>
              </div>
              {summary.nextRecalculation <= RECALCULATE_EVERY && (
                <p className="text-xs text-indigo-500 mt-2">
                  إعادة تقييم بعد {summary.nextRecalculation} {summary.nextRecalculation === 1 ? 'جلسة' : 'جلسات'}
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleStart}
            className="w-full bg-gradient-to-l from-indigo-500 to-blue-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all mb-6"
          >
            🚀 ابدأ جلسة اليوم (10 أسئلة)
          </button>

          {/* Weak/Strong points */}
          {summary && summary.focusAreas.length > 0 && (
            <Link
              href="/practice/smart/analysis"
              className="text-indigo-600 text-sm font-medium hover:underline"
            >
              📊 تحليل مهاراتي الكامل
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ─── Playing ──────────────────────────────────────────────────────────
  if (phase === 'playing') {
    const q = questions[currentIndex];
    if (!q) return null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-blue-50 flex flex-col">
        {/* Progress bar */}
        <div className="bg-white border-b border-indigo-100 px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-indigo-700">
                {isDiagnostic ? 'جلسة تشخيصية' : 'المسار الذكي'}
              </span>
              <span className="text-sm text-gray-500">{currentIndex + 1} / {questions.length}</span>
            </div>
            <div className="w-full bg-indigo-100 rounded-full h-2">
              <div
                className="bg-gradient-to-l from-indigo-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((currentIndex + (isReviewing ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className={`max-w-2xl mx-auto px-4 pt-6 ${isReviewing ? 'pb-28' : 'pb-6'}`}>
            {/* Question */}
            <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm mb-4">
              {q.questionImageUrl && (
                <img src={q.questionImageUrl} alt="صورة السؤال" className="w-full max-w-sm mx-auto rounded-xl mb-4" />
              )}
              <p className="text-gray-900 text-lg font-medium leading-relaxed text-right">{q.questionTextAr}</p>
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {q.options.map((opt, idx) => {
                let bg = 'bg-white border-gray-200 hover:border-indigo-300';
                if (isReviewing) {
                  if (idx === correctOptionIndex) bg = 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200';
                  else if (idx === selectedOption && !isCorrect) bg = 'bg-red-50 border-red-400';
                  else bg = 'bg-gray-50 border-gray-200 opacity-60';
                } else if (selectedOption === idx) {
                  bg = 'bg-indigo-50 border-indigo-400';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(idx)}
                    disabled={isReviewing}
                    className={`w-full p-4 rounded-xl border-2 text-right transition-all ${bg} ${isReviewing ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
                  >
                    <span className="text-gray-800 font-medium">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {isReviewing && isCorrect !== null && (
              <div className={`mt-4 p-4 rounded-xl text-center font-bold ${
                isCorrect ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {isCorrect ? '✅ إجابة صحيحة!' : '❌ إجابة خاطئة'}
              </div>
            )}
          </div>
        </div>

        {bunaa.enabled && (
          <BunaaBubble
            message={bunaa.message}
            visible={bunaa.visible}
            position="bottom-right"
            autoHide={4000}
            onClose={bunaa.hide}
          />
        )}

        {isReviewing && (
          <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-indigo-100 shadow-lg p-4 z-40">
            <div className="max-w-2xl mx-auto">
              <button
                onClick={handleNext}
                className="w-full bg-gradient-to-l from-indigo-500 to-blue-600 text-white font-bold py-4 rounded-2xl hover:opacity-90 active:scale-95 transition-all"
              >
                {currentIndex >= questions.length - 1 ? '🎉 عرض النتائج' : 'التالي ←'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Recalculation ────────────────────────────────────────────────────
  if (phase === 'recalculation' && recalculation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-blue-50">
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Logo size="sm" />
            <Link href="/practice" className="text-gray-500 hover:text-gray-700 text-sm">التمارين</Link>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-8 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">تقييم جديد!</h1>
          <p className="text-gray-600 mb-6">أعدنا تحليل مهاراتك بعد {RECALCULATE_EVERY} جلسات:</p>

          <div className="bg-white rounded-2xl p-4 border border-indigo-100 mb-6 text-right">
            {recalculation.map((s, i) => {
              const color = s.accuracy >= 80 ? 'text-emerald-600' : s.accuracy >= 60 ? 'text-amber-600' : 'text-red-600';
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${color}`}>{s.accuracy}%</span>
                    <span className="text-gray-400 text-sm">{TREND_ICONS[s.trend] || '→'}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{s.subSkill}</span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setPhase('loading'); loadSession(); }}
              className="flex-1 bg-gradient-to-l from-indigo-500 to-blue-600 text-white font-bold py-3 rounded-xl"
            >
              🚀 ابدأ المسار الجديد
            </button>
            <Link href="/" className="flex-1 bg-white text-gray-700 font-bold py-3 rounded-xl border border-gray-200 text-center">
              🏠 الرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Completed ────────────────────────────────────────────────────────
  if (phase === 'completed') {
    const correct = answers.filter((a) => a.isCorrect).length;
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-blue-50">
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Logo size="sm" />
            <Link href="/practice" className="text-gray-500 hover:text-gray-700 text-sm">التمارين</Link>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isDiagnostic ? 'أكملت الجلسة التشخيصية!' : 'أكملت جلسة المسار الذكي!'}
          </h1>

          <div className="bg-white rounded-2xl p-5 border border-indigo-100 mb-4">
            <p className="text-gray-600 mb-1">النتيجة</p>
            <p className="text-3xl font-bold text-indigo-600">
              {correct}/{answers.length} صحيحة ({completionAccuracy}%)
            </p>
          </div>

          {summary && (
            <div className="bg-white rounded-2xl p-4 border border-indigo-100 mb-6">
              <p className="text-sm text-gray-600 mb-2">التقدم العام</p>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
                <div
                  className="bg-gradient-to-l from-indigo-500 to-blue-500 h-3 rounded-full"
                  style={{ width: `${summary.overallProgress}%` }}
                />
              </div>
              <span className="text-sm text-indigo-600 font-bold">{summary.overallProgress}%</span>
            </div>
          )}

          {isDiagnostic && (
            <p className="text-gray-500 text-sm mb-6">
              💡 تم تحليل مستواك! المسار الذكي جاهز الآن بتركيز على نقاط ضعفك.
            </p>
          )}

          <div className="flex gap-3 mb-4">
            <Link href="/" className="flex-1 bg-white text-gray-700 font-bold py-3 rounded-xl border border-gray-200 text-center">
              🏠 الرئيسية
            </Link>
            <Link href="/practice/smart/analysis" className="flex-1 bg-white text-gray-700 font-bold py-3 rounded-xl border border-gray-200 text-center">
              📊 تحليل مهاراتي
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

const RECALCULATE_EVERY = 3;
