'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import Logo from '@/components/ui/Logo';

interface MockQuestion {
  id: string;
  skillArea: string;
  subSkill: string;
  questionTextAr: string;
  questionImageUrl: string | null;
  options: Array<{ text: string; imageUrl?: string }>;
}

interface Section {
  name: string;
  icon: string;
  startIndex: number;
  endIndex: number;
}

type Phase = 'loading' | 'ready' | 'testing' | 'confirming' | 'submitting';

export default function MockTestPage() {
  const router = useRouter();
  const params = useParams();
  const testId = Number(params.testId);
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag('mock_tests');
  const { selectedChild, loading: childLoading } = useSelectedChild();

  const [phase, setPhase] = useState<Phase>('loading');
  const [resultId, setResultId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<MockQuestion[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [testTitle, setTestTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, { answer: string; optionIndex: number }>>(new Map());
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const questionTimerRef = useRef<number>(0);

  // Load test
  useEffect(() => {
    if (flagLoading || childLoading) return;
    if (!flagEnabled || !selectedChild) {
      router.replace('/practice');
      return;
    }

    fetch('/api/mock-tests/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: selectedChild.id, testId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setResultId(data.resultId);
        setQuestions(data.test.questions);
        setSections(data.test.sections);
        setTestTitle(data.test.title);
        setDurationMinutes(data.test.durationMinutes);
        setExpiresAt(new Date(data.expiresAt));

        // Restore previous answers if resuming
        if (data.answers?.length) {
          const map = new Map<string, { answer: string; optionIndex: number }>();
          for (const a of data.answers) {
            // Find option index from answer text
            const q = data.test.questions.find((q: MockQuestion) => q.id === a.questionId);
            const idx = q?.options.findIndex((o: { text: string }) => o.text === a.answer) ?? -1;
            map.set(a.questionId, { answer: a.answer, optionIndex: idx });
          }
          setAnswers(map);
        }

        setPhase('ready');
      })
      .catch(() => setError('حدث خطأ في تحميل الاختبار'));
  }, [flagEnabled, flagLoading, selectedChild, childLoading, testId, router]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'testing' || !expiresAt) return;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        handleTimeout();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phase, expiresAt]);

  // Track time per question
  useEffect(() => {
    questionTimerRef.current = Date.now();
  }, [currentIndex]);

  const currentQuestion = questions[currentIndex];
  const currentSection = sections.find(
    (s) => currentIndex >= s.startIndex && currentIndex <= s.endIndex
  );
  const sectionQuestionNum = currentSection
    ? currentIndex - currentSection.startIndex + 1
    : currentIndex + 1;
  const sectionTotal = currentSection
    ? currentSection.endIndex - currentSection.startIndex + 1
    : questions.length;

  const selectOption = useCallback(
    (optionIndex: number) => {
      if (!currentQuestion || !resultId) return;
      const answer = currentQuestion.options[optionIndex].text;
      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(currentQuestion.id, { answer, optionIndex });
        return next;
      });
    },
    [currentQuestion, resultId]
  );

  const goToQuestion = (index: number) => {
    saveCurrentAnswer();
    setCurrentIndex(index);
  };

  const saveCurrentAnswer = useCallback(() => {
    if (!currentQuestion || !resultId) return;
    const a = answers.get(currentQuestion.id);
    if (!a) return;

    const timeSpent = Math.round((Date.now() - questionTimerRef.current) / 1000);

    // Find correct answer (we don't have it client-side for security)
    // We'll send the selected option index and let the server validate
    fetch('/api/mock-tests/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resultId,
        questionId: currentQuestion.id,
        answer: a.answer,
        isCorrect: false, // Server will recalculate on completion
        timeSpent,
      }),
    }).catch(() => {});
  }, [currentQuestion, resultId, answers]);

  const goNext = () => {
    saveCurrentAnswer();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    saveCurrentAnswer();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFinish = () => {
    saveCurrentAnswer();
    setPhase('confirming');
  };

  const handleTimeout = async () => {
    if (!resultId) return;
    setPhase('submitting');
    try {
      const res = await fetch('/api/mock-tests/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId, timedOut: true }),
      });
      const data = await res.json();
      router.replace(`/practice/mock/result/${data.id}`);
    } catch {
      setError('حدث خطأ في إنهاء الاختبار');
    }
  };

  const confirmFinish = async () => {
    if (!resultId) return;
    setPhase('submitting');
    try {
      const res = await fetch('/api/mock-tests/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId, timedOut: false }),
      });
      const data = await res.json();
      router.replace(`/practice/mock/result/${data.id}`);
    } catch {
      setError('حدث خطأ في إنهاء الاختبار');
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const timerColor =
    timeLeft > 600 ? 'text-emerald-600' : timeLeft > 300 ? 'text-amber-500' : 'text-red-500';

  // Loading
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">جاري تحميل الاختبار...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="text-red-500 font-medium">{error}</div>
        <button
          onClick={() => router.push('/practice/mock')}
          className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold"
        >
          العودة لقائمة الاختبارات
        </button>
      </div>
    );
  }

  // Ready screen
  if (phase === 'ready') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">📝</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{testTitle}</h1>
          <div className="text-gray-500 mb-8 space-y-1">
            <p>{questions.length} سؤال</p>
            <p>{durationMinutes} دقيقة</p>
            <p className="text-sm text-gray-400">يمكنك التنقل بين الأسئلة وتغيير إجاباتك</p>
          </div>
          <button
            onClick={() => setPhase('testing')}
            className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl text-lg hover:bg-emerald-700 active:scale-95 transition-all"
          >
            🚀 ابدأ الاختبار
          </button>
          <button
            onClick={() => router.push('/practice/mock')}
            className="mt-3 text-gray-400 text-sm hover:text-gray-600 transition-colors"
          >
            العودة لقائمة الاختبارات
          </button>
        </div>
      </div>
    );
  }

  // Confirming finish
  if (phase === 'confirming') {
    const unanswered = questions.filter((q) => !answers.has(q.id)).length;

    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md bg-white rounded-2xl border border-gray-200 p-6 shadow-lg text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">هل تريد إنهاء الاختبار؟</h2>
          <p className="text-gray-600 mb-2">
            أجبت على: {answers.size} من {questions.length} سؤال
          </p>
          {unanswered > 0 && (
            <p className="text-amber-500 font-medium mb-6">
              ⚠️ {unanswered} {unanswered === 1 ? 'سؤال لم تُجب عليه' : 'أسئلة لم تُجب عليها'}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setPhase('testing')}
              className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
            >
              ↩️ ارجع للاختبار
            </button>
            <button
              onClick={confirmFinish}
              className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              ✅ أنهِ الاختبار
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Submitting
  if (phase === 'submitting') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">جاري حساب النتائج...</div>
      </div>
    );
  }

  // Testing phase
  const selectedOpt = currentQuestion ? answers.get(currentQuestion.id)?.optionIndex : undefined;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with timer */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-2xl font-bold font-mono ${timerColor}`}>
              ⏱️ {formatTime(timeLeft)}
            </span>
            <span className="text-gray-500 text-sm">
              سؤال {currentIndex + 1} من {questions.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((answers.size) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Section label */}
      {currentSection && (
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 text-center">
          <span className="text-gray-600 text-sm font-medium">
            {currentSection.icon} {currentSection.name} (سؤال {sectionQuestionNum} من {sectionTotal})
          </span>
        </div>
      )}

      {/* Question area */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {currentQuestion && (
          <>
            <div className="bg-gray-50 rounded-2xl p-5 mb-6">
              <p className="text-gray-900 text-lg leading-relaxed text-right">
                {currentQuestion.questionTextAr}
              </p>
              {currentQuestion.questionImageUrl && (
                <img
                  src={currentQuestion.questionImageUrl}
                  alt="صورة السؤال"
                  className="mt-4 max-w-full rounded-lg mx-auto"
                />
              )}
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option, idx) => {
                const labels = ['أ', 'ب', 'ج', 'د'];
                const isSelected = selectedOpt === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => selectOption(idx)}
                    className={`w-full text-right p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isSelected ? 'bg-blue-400 text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {labels[idx]}
                    </span>
                    <span className="text-gray-800">{option.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← السابق
              </button>
              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={goNext}
                  className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  التالي →
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  📋 إنهاء الاختبار
                </button>
              )}
            </div>
          </>
        )}

        {/* Quick navigation */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-gray-400 text-xs text-center mb-3">التنقل السريع</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {questions.map((q, idx) => {
              const isAnswered = answers.has(q.id);
              const isCurrent = idx === currentIndex;

              return (
                <button
                  key={q.id}
                  onClick={() => goToQuestion(idx)}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                      : isAnswered
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 mt-3 text-xs text-gray-400">
            <span>🟢 مجاب</span>
            <span>⚪ لم يُجب</span>
            <span>🔵 الحالي</span>
          </div>
        </div>

        {/* Finish button at bottom */}
        <div className="mt-6 text-center">
          <button
            onClick={handleFinish}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            📋 إنهاء الاختبار
          </button>
        </div>
      </div>
    </div>
  );
}
