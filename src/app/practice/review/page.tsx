'use client';
import { Suspense } from 'react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGuest } from '@/hooks/useGuest';
import { useSound } from '@/hooks/useSound';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { PublicQuestion } from '@/types';
import QuestionCard from '@/components/practice/QuestionCard';
import AnswerOption from '@/components/practice/AnswerOption';
import ExplanationPanel from '@/components/practice/ExplanationPanel';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';

interface Reveal {
  correctOptionIndex: number;
  explanationAr: string;
  isCorrect: boolean;
}

function ReviewContent() {
  const router = useRouter();
  const { state } = useGuest();
  const { selectedChild } = useSelectedChild();
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'answering' | 'reviewing' | 'completed' | 'empty'>('loading');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [score, setScore] = useState(0);
  const [muted, setMuted] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const questionStartTime = useRef(Date.now());

  const { playCorrect, playWrong, playNext } = useSound(muted);

  useEffect(() => {
    const guestId = state?.guestId;
    const childId = selectedChild?.id;

    if (!guestId && !childId) return;

    const params = new URLSearchParams();
    if (childId) params.set('childId', childId);
    else if (guestId) params.set('guestId', guestId);

    fetch(`/api/review/questions?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (data.questions?.length > 0) {
          setQuestions(data.questions);
          setPhase('answering');
          questionStartTime.current = Date.now();
        } else {
          setPhase('empty');
        }
      })
      .catch(() => setPhase('empty'));
  }, [state?.guestId, selectedChild?.id]);

  const handleAnswer = useCallback(
    (optionIndex: number) => {
      if (phase !== 'answering') return;
      const q = questions[currentIndex];
      setSelectedOption(optionIndex);
      setReveal(null);
      setPhase('reviewing');

      fetch('/api/questions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: q.id, selectedOption: optionIndex }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data: Reveal) => {
          setReveal(data);
          if (data.isCorrect) {
            setScore((s) => s + 1);
            setMasteredCount((m) => m + 1);
            playCorrect();
          } else {
            playWrong();
          }
        })
        .catch(() => {
          setReveal({ correctOptionIndex: -1, explanationAr: 'Connection error', isCorrect: false });
          playWrong();
        });
    },
    [phase, questions, currentIndex, playCorrect, playWrong]
  );

  const handleNext = useCallback(() => {
    playNext();
    const next = currentIndex + 1;
    if (next >= questions.length) {
      setPhase('completed');
    } else {
      setCurrentIndex(next);
      setSelectedOption(null);
      setReveal(null);
      questionStartTime.current = Date.now();
      setPhase('answering');
    }
  }, [currentIndex, questions.length, playNext]);

  // Loading
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">جاري تحميل أسئلة المراجعة...</p>
        </div>
      </div>
    );
  }

  // No questions to review
  if (phase === 'empty') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ما عندك أسئلة للمراجعة</h1>
          <p className="text-gray-600 mb-6">أداؤك ممتاز! لا توجد أسئلة تحتاج مراجعة حالياً.</p>
          <Link
            href="/practice"
            className="inline-block bg-emerald-600 text-white font-bold px-8 py-3 rounded-2xl hover:bg-emerald-700 transition-colors"
          >
            🎯 ابدأ جلسة جديدة
          </Link>
        </div>
      </div>
    );
  }

  // Completed
  if (phase === 'completed') {
    const pending = questions.length - score;
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 text-center">
            <div className="text-5xl mb-4">📝</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">نتائج المراجعة</h1>

            <p className="text-lg text-gray-700 mb-6">
              أجبت <span className="font-bold text-emerald-600">{score}</span> من{' '}
              <span className="font-bold">{questions.length}</span> صح ✅
            </p>

            {masteredCount > 0 && (
              <div className="bg-emerald-50 rounded-xl p-3 mb-3 text-sm text-emerald-700">
                ✅ أتقنت {masteredCount} {masteredCount === 1 ? 'سؤال' : 'أسئلة'} جديدة
              </div>
            )}

            {pending > 0 && (
              <div className="bg-amber-50 rounded-xl p-3 mb-6 text-sm text-amber-700">
                📌 بقي {pending} {pending === 1 ? 'سؤال' : 'أسئلة'} تحتاج مراجعة
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-amber-500 text-white font-bold py-3 rounded-2xl hover:bg-amber-600 transition-colors"
              >
                🔄 راجع مرة ثانية
              </button>
              <Link
                href="/"
                className="bg-gray-100 text-gray-700 font-semibold py-3 rounded-2xl hover:bg-gray-200 transition-colors text-center"
              >
                🏠 الرئيسية
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active review (answering/reviewing)
  const q = questions[currentIndex];
  if (!q) return null;
  const isReviewing = phase === 'reviewing';
  const isLast = currentIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Review header - amber themed */}
      <div className="bg-amber-500 text-white px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="font-bold">📝 وضع المراجعة</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-amber-100">
              مراجعة: سؤال {currentIndex + 1} من {questions.length}
            </span>
            <button onClick={() => setMuted((m) => !m)} className="text-amber-100 hover:text-white">
              {muted ? '🔇' : '🔊'}
            </button>
            <button onClick={() => setExitConfirm(true)} className="text-amber-100 hover:text-white text-sm">
              ✕
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-2">
          <div className="w-full bg-amber-400 rounded-full h-1.5">
            <div
              className="bg-white rounded-full h-1.5 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className={`max-w-2xl mx-auto px-4 pt-4 ${isReviewing ? 'pb-28' : 'pb-6'}`}>
          <QuestionCard
            question={q}
            index={currentIndex}
            total={questions.length}
            ageGroup={q.ageGroup as '4-5' | '6-9' | '10-12'}
          />

          <div className="mt-3 space-y-2.5">
            {q.options.map((opt, idx) => {
              const isChosen = selectedOption === idx;
              const isCorrect = isReviewing && reveal !== null && idx === reveal.correctOptionIndex;
              const isWrong = isReviewing && reveal !== null && isChosen && idx !== reveal.correctOptionIndex;
              return (
                <AnswerOption
                  key={idx}
                  index={idx}
                  text={opt.text}
                  selected={isChosen}
                  correct={isCorrect}
                  wrong={isWrong}
                  disabled={isReviewing}
                  onClick={() => handleAnswer(idx)}
                />
              );
            })}
          </div>

          {isReviewing && reveal && (
            <>
              {reveal.isCorrect ? (
                <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-emerald-700 font-bold">🎉 أحسنت! تقدّمت في هذا السؤال</p>
                </div>
              ) : (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <p className="text-amber-700 font-bold">💪 لا بأس، راح يرجع لك مرة ثانية</p>
                </div>
              )}
              <ExplanationPanel
                options={q.options}
                correctOptionIndex={reveal.correctOptionIndex}
                explanationAr={reveal.explanationAr}
                isCorrect={reveal.isCorrect}
                pointsEarned={0}
              />
            </>
          )}
        </div>
      </div>

      {/* Checking spinner */}
      {isReviewing && !reveal && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-100 p-4 z-40">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-2.5">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500 text-sm font-medium">جاري التحقق من إجابتك...</span>
          </div>
        </div>
      )}

      {/* Next button */}
      {isReviewing && reveal && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-100 shadow-lg p-4 z-40">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleNext}
              className="w-full bg-amber-500 text-white font-bold py-4 rounded-2xl hover:bg-amber-600 active:scale-95 transition-all text-base shadow-amber-200 shadow-md"
            >
              {isLast ? '📝 عرض النتائج' : 'السؤال التالي ←'}
            </button>
          </div>
        </div>
      )}

      {/* Exit confirm */}
      {exitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setExitConfirm(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">إنهاء المراجعة؟</h3>
            <p className="text-gray-600 mb-4">يمكنك العودة لإكمال المراجعة لاحقاً.</p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/practice')}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-semibold hover:bg-red-600 transition-colors"
              >
                إنهاء
              </button>
              <button
                onClick={() => setExitConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
