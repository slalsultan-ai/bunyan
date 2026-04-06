'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { computeAgeGroupClient } from '@/lib/age-utils';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';

interface ChallengeQuestion {
  id: string;
  skillArea: string;
  questionTextAr: string;
  questionImageUrl: string | null;
  options: Array<{ text: string; imageUrl?: string }>;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalStars: number;
  totalBadges: number;
  completedToday: boolean;
}

type Phase = 'loading' | 'ready' | 'playing' | 'completed';

export default function DailyChallengePage() {
  const router = useRouter();
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag('daily_challenge');
  const { selectedChild, loading: childLoading } = useSelectedChild();

  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<ChallengeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([]);
  const [challengeDate, setChallengeDate] = useState('');

  // Per-question state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);

  // Completion state
  const [results, setResults] = useState<Array<{ questionId: string; correct: boolean }>>([]);
  const [completion, setCompletion] = useState<{
    allCorrect: boolean;
    earnedStar: boolean;
    newStreak: number;
    earnedBadge: boolean;
  } | null>(null);

  // Countdown to next challenge
  const [countdown, setCountdown] = useState('');

  // Redirect if flag disabled
  useEffect(() => {
    if (!flagLoading && !flagEnabled) {
      router.replace('/practice');
    }
  }, [flagLoading, flagEnabled, router]);

  // Load challenge data
  const loadChallenge = useCallback(async () => {
    if (!selectedChild) return;
    const ageGroup = computeAgeGroupClient(selectedChild.age);
    try {
      const res = await fetch(
        `/api/daily-challenge?childId=${selectedChild.id}&ageGroup=${ageGroup}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (!data.enabled) {
        router.replace('/practice');
        return;
      }
      setQuestions(data.challenge.questions);
      setChallengeDate(data.challenge.date);
      setStreak(data.streak);
      setAnsweredQuestions(data.answeredQuestions || []);

      // If already completed today
      if (data.streak?.completedToday) {
        setPhase('completed');
        // Load results from answered questions
        setResults(
          data.challenge.questions.map((q: ChallengeQuestion) => ({
            questionId: q.id,
            correct: false, // We don't have this info from GET
          }))
        );
      } else if (data.answeredQuestions?.length >= 3) {
        setPhase('completed');
      } else {
        // Resume from where left off
        const startIdx = data.answeredQuestions?.length || 0;
        setCurrentIndex(startIdx);
        setPhase('ready');
      }
    } catch (e) {
      console.error('Failed to load challenge:', e);
    }
  }, [selectedChild, router]);

  useEffect(() => {
    if (!childLoading && selectedChild && flagEnabled) {
      loadChallenge();
    }
  }, [childLoading, selectedChild, flagEnabled, loadChallenge]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'completed') return;
    const update = () => {
      const now = new Date();
      const riyadhNow = new Date(
        now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })
      );
      const tomorrow = new Date(riyadhNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - riyadhNow.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown(`${hours} ساعة و ${minutes} دقيقة`);
    };
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleStartChallenge = () => {
    setPhase('playing');
  };

  const handleSelectAnswer = async (optionIndex: number) => {
    if (isReviewing || !questions[currentIndex]) return;
    setSelectedOption(optionIndex);
    setIsReviewing(true);

    const q = questions[currentIndex];
    try {
      const res = await fetch('/api/daily-challenge/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChild?.id,
          questionId: q.id,
          selectedOption: optionIndex,
        }),
      });
      const data = await res.json();
      setIsCorrect(data.isCorrect);
      setCorrectOptionIndex(data.correctOptionIndex);
      setResults((prev) => [...prev, { questionId: q.id, correct: data.isCorrect }]);

      if (data.completed && data.completion) {
        setCompletion(data.completion);
        setStreak(data.streak);
      } else if (data.streak) {
        setStreak(data.streak);
      }
    } catch (e) {
      console.error('Submit error:', e);
    }
  };

  const handleNext = () => {
    if (currentIndex >= 2 || (completion && results.length >= 3)) {
      setPhase('completed');
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsReviewing(false);
      setIsCorrect(null);
      setCorrectOptionIndex(null);
    }
  };

  // Format date in Arabic
  const formatArabicDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const skillIcon = (skill: string) => {
    if (skill === 'quantitative') return '🔢';
    if (skill === 'verbal') return '📚';
    return '🧩';
  };

  const skillLabel = (skill: string) => {
    if (skill === 'quantitative') return 'كمي';
    if (skill === 'verbal') return 'لفظي';
    return 'منطقي';
  };

  // ─── Loading ──────────────────────────────────────────────────────────
  if (flagLoading || childLoading || phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!selectedChild) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-700 font-bold text-lg mb-2">سجّل دخولك أولاً</p>
          <p className="text-gray-500 mb-4">التحدي اليومي متاح للأطفال المسجلين فقط</p>
          <Link href="/auth" className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  // ─── Phase: Ready ─────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Logo size="sm" />
            <Link href="/practice" className="text-gray-500 hover:text-gray-700 text-sm">
              التمارين
            </Link>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-8 text-center">
          <div className="text-5xl mb-4">⭐</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">تحدي اليوم</h1>
          <p className="text-gray-500 mb-6">{formatArabicDate(challengeDate)}</p>

          {/* Question skill indicators */}
          <div className="flex justify-center gap-4 mb-8">
            {questions.map((q, i) => {
              const isAnswered = answeredQuestions.includes(q.id);
              return (
                <div
                  key={q.id}
                  className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 ${
                    isAnswered
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-amber-200 bg-white'
                  }`}
                >
                  <span className="text-2xl">{skillIcon(q.skillArea)}</span>
                  <span className="text-xs font-medium text-gray-600">
                    {skillLabel(q.skillArea)}
                  </span>
                  {isAnswered ? (
                    <span className="text-emerald-500 text-xs">✓</span>
                  ) : (
                    <span className="w-3 h-3 rounded-full border-2 border-gray-300" />
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleStartChallenge}
            className="w-full bg-gradient-to-l from-amber-500 to-orange-500 text-white font-bold py-4 rounded-2xl text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all mb-8"
          >
            🚀 ابدأ التحدي
          </button>

          {/* Streak info */}
          {streak && (
            <div className="bg-white rounded-2xl p-4 border border-amber-100 space-y-2 text-right">
              <div className="flex items-center justify-between">
                <span className="text-amber-600 font-bold">
                  {streak.currentStreak} {streak.currentStreak === 1 ? 'يوم' : 'أيام'}
                </span>
                <span className="text-gray-600 text-sm flex items-center gap-1">
                  🔥 سلسلتك
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-600 font-bold">{streak.totalStars}</span>
                <span className="text-gray-600 text-sm flex items-center gap-1">
                  ⭐ نجماتك
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-600 font-bold">{streak.totalBadges}</span>
                <span className="text-gray-600 text-sm flex items-center gap-1">
                  🏅 أوسمتك
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Phase: Playing ───────────────────────────────────────────────────
  if (phase === 'playing') {
    const q = questions[currentIndex];
    if (!q) return null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col">
        {/* Progress bar */}
        <div className="bg-white border-b border-amber-100 px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-amber-700">
                تحدي اليوم
              </span>
              <span className="text-sm text-gray-500">
                {currentIndex + 1} / 3
              </span>
            </div>
            <div className="w-full bg-amber-100 rounded-full h-2">
              <div
                className="bg-gradient-to-l from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((currentIndex + (isReviewing ? 1 : 0)) / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className={`max-w-2xl mx-auto px-4 pt-6 ${isReviewing ? 'pb-28' : 'pb-6'}`}>
            {/* Skill badge */}
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium">
                {skillIcon(q.skillArea)} {skillLabel(q.skillArea)}
              </span>
            </div>

            {/* Question text */}
            <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm mb-4">
              {q.questionImageUrl && (
                <img
                  src={q.questionImageUrl}
                  alt="صورة السؤال"
                  className="w-full max-w-sm mx-auto rounded-xl mb-4"
                />
              )}
              <p className="text-gray-900 text-lg font-medium leading-relaxed text-right">
                {q.questionTextAr}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {q.options.map((opt, idx) => {
                let bg = 'bg-white border-gray-200 hover:border-amber-300';
                if (isReviewing) {
                  if (idx === correctOptionIndex) {
                    bg = 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200';
                  } else if (idx === selectedOption && !isCorrect) {
                    bg = 'bg-red-50 border-red-400';
                  } else {
                    bg = 'bg-gray-50 border-gray-200 opacity-60';
                  }
                } else if (selectedOption === idx) {
                  bg = 'bg-amber-50 border-amber-400';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(idx)}
                    disabled={isReviewing}
                    className={`w-full p-4 rounded-xl border-2 text-right transition-all ${bg} ${
                      isReviewing ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          isReviewing && idx === correctOptionIndex
                            ? 'bg-emerald-500 text-white'
                            : isReviewing && idx === selectedOption && !isCorrect
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isReviewing && idx === correctOptionIndex
                          ? '✓'
                          : isReviewing && idx === selectedOption && !isCorrect
                          ? '✗'
                          : String.fromCharCode(1571 + idx) // أ ب ت ث
                        }
                      </span>
                      <span className="text-gray-800 font-medium flex-1">{opt.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Correct/Wrong feedback */}
            {isReviewing && isCorrect !== null && (
              <div
                className={`mt-4 p-4 rounded-xl text-center font-bold ${
                  isCorrect
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {isCorrect ? '✅ إجابة صحيحة!' : '❌ إجابة خاطئة'}
              </div>
            )}
          </div>
        </div>

        {/* Next button */}
        {isReviewing && (
          <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-amber-100 shadow-lg p-4 z-40">
            <div className="max-w-2xl mx-auto">
              <button
                onClick={handleNext}
                className="w-full bg-gradient-to-l from-amber-500 to-orange-500 text-white font-bold py-4 rounded-2xl hover:opacity-90 active:scale-95 transition-all text-base shadow-md"
              >
                {currentIndex >= 2 ? '🎉 عرض النتائج' : 'السؤال التالي ←'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Phase: Completed ─────────────────────────────────────────────────
  if (phase === 'completed') {
    const correctCount = results.filter((r) => r.correct).length;
    const earnedBadge = completion?.earnedBadge ?? false;

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Logo size="sm" />
            <Link href="/practice" className="text-gray-500 hover:text-gray-700 text-sm">
              التمارين
            </Link>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-8 text-center">
          {earnedBadge ? (
            <>
              {/* Badge celebration */}
              <div className="text-6xl mb-4">🏅</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                مبروك! حصلت على وسام جديد!
              </h1>
              <p className="text-amber-600 font-medium mb-2">
                وسام المثابرة — {streak?.currentStreak || 7} أيام متتالية
              </p>
              <p className="text-gray-500 mb-8 italic">
                &ldquo;المثابرة هي سرّ النجاح&rdquo;
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">أكملت تحدي اليوم!</h1>
            </>
          )}

          {/* Score */}
          {results.length > 0 && results.some((r) => r.correct !== undefined) && (
            <div className="bg-white rounded-2xl p-5 border border-amber-100 mb-4">
              <p className="text-gray-600 mb-1">النتيجة</p>
              <p className="text-3xl font-bold text-amber-600">
                {correctCount}/{results.length} صحيحة
              </p>
            </div>
          )}

          {/* Star earned */}
          {(completion?.earnedStar || streak?.completedToday) && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 mb-4">
              <p className="text-amber-700 font-bold text-lg">⭐ حصلت على نجمة اليوم!</p>
            </div>
          )}

          {/* Streak info */}
          {streak && (
            <div className="bg-white rounded-2xl p-5 border border-amber-100 mb-4">
              <p className="text-gray-600 mb-2 flex items-center justify-center gap-2">
                🔥 سلسلتك الآن:{' '}
                <span className="text-amber-600 font-bold text-xl">
                  {streak.currentStreak} {streak.currentStreak === 1 ? 'يوم' : 'أيام'}
                </span>
              </p>
              {/* Progress toward next badge */}
              <div className="flex justify-center gap-1 mt-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-3 rounded-full ${
                      i < (streak.currentStreak % 7 || (streak.currentStreak > 0 && streak.currentStreak % 7 === 0 ? 7 : 0))
                        ? 'bg-amber-400'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              {streak.currentStreak % 7 !== 0 && (
                <p className="text-gray-500 text-sm mt-2">
                  بقي {7 - (streak.currentStreak % 7)} {7 - (streak.currentStreak % 7) === 1 ? 'يوم' : 'أيام'} للوسام التالي!
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mb-6">
            <Link
              href="/"
              className="flex-1 bg-white text-gray-700 font-bold py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-center"
            >
              🏠 الرئيسية
            </Link>
            <Link
              href="/progress"
              className="flex-1 bg-white text-gray-700 font-bold py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-center"
            >
              📊 تقدمي
            </Link>
          </div>

          {/* Next challenge countdown */}
          {countdown && (
            <p className="text-gray-500 text-sm">
              التحدي القادم بعد: {countdown}
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
