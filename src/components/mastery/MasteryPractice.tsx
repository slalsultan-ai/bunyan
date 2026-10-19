'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import Confetti from '@/components/ui/Confetti';
import BunaaBubble from '@/components/mascot/BunaaBubble';
import { useBunaa } from '@/hooks/useBunaa';

interface ServedQuestion {
  id: string;
  skillArea: string;
  questionTextAr: string;
  questionImageUrl: string | null;
  options: Array<{ text: string; imageUrl?: string }>;
}

interface SessionView {
  sessionId: number;
  served: number;
  correct: number;
  sessionSize: number;
  question: ServedQuestion | null;
  completed: boolean;
}

interface MasteredSkill {
  key: string;
  nameAr: string;
}

type Phase = 'loading' | 'ready' | 'playing' | 'completed' | 'error';

/**
 * Mastery-engine practice: the server picks each next question after scoring
 * the previous answer, so the client only renders what it is handed.
 */
export default function MasteryPractice({ childId }: { childId: string }) {
  const bunaa = useBunaa();
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionView | null>(null);
  const [question, setQuestion] = useState<ServedQuestion | null>(null);
  const [pendingNext, setPendingNext] = useState<SessionView | null>(null);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const [celebrating, setCelebrating] = useState<MasteredSkill | null>(null);
  const [sessionMastered, setSessionMastered] = useState<MasteredSkill[]>([]);

  const loadSession = useCallback(async () => {
    setPhase('loading');
    try {
      const res = await fetch('/api/mastery/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'تعذّر تحميل الجلسة');
        setPhase('error');
        return;
      }
      setSession(data.session);
      setQuestion(data.session.question);
      setPhase(data.session.served > 0 ? 'playing' : 'ready');
    } catch {
      setError('تعذّر الاتصال بالخادم');
      setPhase('error');
    }
  }, [childId]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const resetAnswerState = () => {
    setSelectedOption(null);
    setIsCorrect(null);
    setCorrectOptionIndex(null);
    setExplanation(null);
  };

  const handleStart = () => {
    setPhase('playing');
    bunaa.trigger('session_start');
  };

  const handleSelect = async (optionIndex: number) => {
    if (!session || !question || submitting || isCorrect !== null) return;
    setSelectedOption(optionIndex);
    setSubmitting(true);
    try {
      const res = await fetch('/api/mastery/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          sessionId: session.sessionId,
          questionId: question.id,
          selectedOption: optionIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Out of sync (e.g. answered in another tab): reload the session.
        if (res.status === 409) { resetAnswerState(); await loadSession(); return; }
        setError(data.error ?? 'تعذّر تسجيل الإجابة');
        setPhase('error');
        return;
      }
      setIsCorrect(data.isCorrect);
      setCorrectOptionIndex(data.correctOptionIndex);
      setExplanation(data.explanationAr ?? null);
      setPendingNext(data.session);
      if (data.sessionMastered?.length) setSessionMastered(data.sessionMastered);
      bunaa.onAnswer(data.isCorrect);
      if (data.masteredSkills?.length) setCelebrating(data.masteredSkills[0]);
    } catch {
      setError('تعذّر الاتصال بالخادم');
      setPhase('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!pendingNext) return;
    setSession(pendingNext);
    resetAnswerState();
    if (pendingNext.completed || !pendingNext.question) {
      bunaa.trigger(pendingNext.correct === pendingNext.served ? 'perfect_session' : 'session_end');
      setPhase('completed');
    } else {
      setQuestion(pendingNext.question);
    }
    setPendingNext(null);
  };

  const header = (
    <div className="bg-white border-b border-gray-200 px-4 py-4">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Logo size="sm" />
        <Link href="/practice" className="text-gray-500 hover:text-gray-700 text-sm">التمارين</Link>
      </div>
    </div>
  );

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-blue-50">
        {header}
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-gray-700 font-bold mb-6">{error}</p>
          <button onClick={() => { setError(null); loadSession(); }} className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl">
            حاول مرة أخرى
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'ready' && session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-blue-50">
        {header}
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="text-5xl mb-4">🧠</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">المسار الذكي</h1>
          <p className="text-gray-600 mb-8">كل سؤال يُختار لك حسب إجابتك السابقة، خطوة بخطوة حتى تُتقن كل مهارة.</p>
          <button
            onClick={handleStart}
            className="w-full bg-gradient-to-l from-indigo-500 to-blue-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all"
          >
            🚀 ابدأ جلسة اليوم ({session.sessionSize} أسئلة)
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'completed' && session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-blue-50">
        <Confetti active={sessionMastered.length > 0} />
        {header}
        <div className="max-w-md mx-auto px-4 py-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">أكملت جلسة المسار الذكي!</h1>
          <div className="bg-white rounded-2xl p-5 border border-indigo-100 mb-4">
            <p className="text-gray-600 mb-1">النتيجة</p>
            <p className="text-3xl font-bold text-indigo-600">{session.correct}/{session.served} صحيحة</p>
          </div>
          {sessionMastered.length > 0 && (
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 mb-6">
              <p className="text-emerald-800 font-bold mb-2">🏅 أتقنت في هذه الجلسة</p>
              {sessionMastered.map((s) => (
                <p key={s.key} className="text-emerald-700">{s.nameAr}</p>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => { setSessionMastered([]); loadSession(); }}
              className="flex-1 bg-gradient-to-l from-indigo-500 to-blue-600 text-white font-bold py-3 rounded-xl"
            >
              🚀 جلسة جديدة
            </button>
            <Link href="/" className="flex-1 bg-white text-gray-700 font-bold py-3 rounded-xl border border-gray-200 text-center">
              🏠 الرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !question) return null;
  const answered = isCorrect !== null;
  const position = Math.min(session.served + 1, session.sessionSize);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-blue-50 flex flex-col">
      <Confetti active={celebrating !== null} />
      <div className="bg-white border-b border-indigo-100 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-indigo-700">المسار الذكي</span>
            <span className="text-sm text-gray-500">{position} / {session.sessionSize}</span>
          </div>
          <div className="w-full bg-indigo-100 rounded-full h-2">
            <div
              className="bg-gradient-to-l from-indigo-500 to-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((session.served + (answered ? 1 : 0)) / session.sessionSize) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className={`max-w-2xl mx-auto px-4 pt-6 ${answered ? 'pb-28' : 'pb-6'}`}>
          <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm mb-4">
            {question.questionImageUrl && (
              <img src={question.questionImageUrl} alt="صورة السؤال" className="w-full max-w-sm mx-auto rounded-xl mb-4" />
            )}
            <p className="text-gray-900 text-lg font-medium leading-relaxed text-right">{question.questionTextAr}</p>
          </div>

          <div className="space-y-2.5">
            {question.options.map((opt, idx) => {
              let bg = 'bg-white border-gray-200 hover:border-indigo-300';
              if (answered) {
                if (idx === correctOptionIndex) bg = 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200';
                else if (idx === selectedOption && !isCorrect) bg = 'bg-red-50 border-red-400';
                else bg = 'bg-gray-50 border-gray-200 opacity-60';
              } else if (selectedOption === idx) {
                bg = 'bg-indigo-50 border-indigo-400';
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={answered || submitting}
                  className={`w-full p-4 rounded-xl border-2 text-right transition-all ${bg} ${answered ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
                >
                  <span className="text-gray-800 font-medium">{opt.text}</span>
                </button>
              );
            })}
          </div>

          {answered && (
            <div className={`mt-4 p-4 rounded-xl text-right ${
              isCorrect ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <p className="font-bold text-center mb-1">{isCorrect ? '✅ إجابة صحيحة!' : '❌ إجابة خاطئة'}</p>
              {!isCorrect && explanation && <p className="text-sm text-gray-700 leading-relaxed">{explanation}</p>}
            </div>
          )}
        </div>
      </div>

      {celebrating && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setCelebrating(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="text-6xl mb-3">🏅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">أتقنت مهارة جديدة!</h2>
            <p className="text-indigo-700 font-bold text-lg mb-6">{celebrating.nameAr}</p>
            <button onClick={() => setCelebrating(null)} className="w-full bg-gradient-to-l from-emerald-500 to-teal-600 text-white font-bold py-3 rounded-xl">
              رائع! 🎉
            </button>
          </div>
        </div>
      )}

      {bunaa.enabled && (
        <BunaaBubble message={bunaa.message} visible={bunaa.visible} position="bottom-right" autoHide={4000} onClose={bunaa.hide} />
      )}

      {answered && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-indigo-100 shadow-lg p-4 z-40">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleNext}
              className="w-full bg-gradient-to-l from-indigo-500 to-blue-600 text-white font-bold py-4 rounded-2xl hover:opacity-90 active:scale-95 transition-all"
            >
              {pendingNext?.completed || !pendingNext?.question ? '🎉 عرض النتائج' : 'التالي ←'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
