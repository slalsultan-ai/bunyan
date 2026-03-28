'use client';
import { Suspense } from 'react';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useGuest } from '@/hooks/useGuest';
import { useSound } from '@/hooks/useSound';
import { POINTS } from '@/lib/gamification/points';
import SessionProgress from '@/components/practice/SessionProgress';
import QuestionCard from '@/components/practice/QuestionCard';
import AnswerOption from '@/components/practice/AnswerOption';
import ExplanationPanel from '@/components/practice/ExplanationPanel';
import { AgeGroup, SkillArea } from '@/types';

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ageGroup = (searchParams.get('age') || '6-9') as AgeGroup;
  const skillArea = (searchParams.get('skill') || 'mixed') as SkillArea;

  const session = useSession();
  const { state, recordSession } = useGuest();
  const [pointsThisSession, setPointsThisSession] = useState(0);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [muted, setMuted] = useState(false);
  const sessionIdRef = useRef(crypto.randomUUID());
  const resultSavedRef = useRef(false);
  const startRegisteredRef = useRef(false);

  const { playCorrect, playWrong, playFanfare, playNext } = useSound(muted);

  useEffect(() => {
    session.loadQuestions(ageGroup, skillArea, 'mixed');
  }, []);

  // Register session start as soon as questions are loaded (phase = 'answering')
  useEffect(() => {
    if (session.phase === 'answering' && !startRegisteredRef.current && state?.guestId) {
      startRegisteredRef.current = true;
      fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          guestId: state.guestId,
          ageGroup,
          skillArea,
          totalQuestions: session.questions.length,
        }),
      }).catch(console.error);
    }
  }, [session.phase, state?.guestId]);

  useEffect(() => {
    if (session.phase === 'completed' && state && !resultSavedRef.current) {
      resultSavedRef.current = true;
      const result = {
        sessionId: sessionIdRef.current,
        ageGroup,
        skillArea,
        score: session.score,
        totalQuestions: session.questions.length,
        timeTakenMs: session.timeTakenMs,
        answers: session.answers.map(a => ({ ...a, skillArea })),
      };

      const { pointsEarned, newBadges } = recordSession(result);

      if (session.score === session.questions.length) playFanfare();

      if (state.guestId) {
        fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            guestId: state.guestId,
            ageGroup,
            skillArea,
            score: session.score,
            totalQuestions: session.questions.length,
            pointsEarned,
            timeTakenMs: session.timeTakenMs,
            answers: session.answers,
          }),
        }).catch(console.error);
      }

      const params = new URLSearchParams({
        score: session.score.toString(),
        total: session.questions.length.toString(),
        points: pointsEarned.toString(),
        time: session.timeTakenMs.toString(),
        skill: skillArea,
        age: ageGroup,
        badges: newBadges.join(','),
      });
      router.push(`/results?${params.toString()}`);
    }
  }, [session.phase]);

  const handleAnswer = (idx: number) => {
    if (!session.currentQuestion) return;
    session.selectAnswer(idx, (isCorrect) => {
      const pts = isCorrect ? POINTS.CORRECT_ANSWER + POINTS.FIRST_TRY_BONUS : 0;
      setPointsThisSession(p => p + pts);
      if (isCorrect) playCorrect(); else playWrong();
    });
  };

  const handleNext = () => {
    playNext();
    session.nextQuestion();
  };

  if (session.phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">جاري تحضير الأسئلة...</p>
        </div>
      </div>
    );
  }

  const q = session.currentQuestion;
  if (!q) return null;

  const isReviewing = session.phase === 'reviewing';
  const isLast = session.currentIndex === session.questions.length - 1;
  const lastAnswer = session.answers[session.answers.length - 1];
  const isYoung = ageGroup === '4-5';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SessionProgress
        current={session.currentIndex + 1}
        total={session.questions.length}
        score={session.score}
        pointsThisSession={pointsThisSession}
        onExit={() => setExitConfirm(true)}
        ageGroup={ageGroup}
        skillArea={skillArea}
        muted={muted}
        onToggleMute={() => setMuted(m => !m)}
      />

      <div className="flex-1 overflow-y-auto">
        <div className={`max-w-2xl mx-auto px-4 pt-4 ${isReviewing ? 'pb-28' : 'pb-6'}`}>
          <QuestionCard
            question={q}
            index={session.currentIndex}
            total={session.questions.length}
            ageGroup={ageGroup}
          />

          <div className={`mt-3 ${isYoung ? 'grid grid-cols-2 gap-3' : 'space-y-2.5'}`}>
            {q.options.map((opt, idx) => {
              const isChosen = session.selectedOption === idx;
              const isCorrect = isReviewing && session.reveal !== null && idx === session.reveal.correctOptionIndex;
              const isWrong = isReviewing && session.reveal !== null && isChosen && idx !== session.reveal.correctOptionIndex;
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
                  large={isYoung}
                />
              );
            })}
          </div>

          {isReviewing && session.reveal && lastAnswer && (
            <ExplanationPanel
              options={q.options}
              correctOptionIndex={session.reveal.correctOptionIndex}
              explanationAr={session.reveal.explanationAr}
              isCorrect={lastAnswer.isCorrect}
              pointsEarned={lastAnswer.isCorrect ? POINTS.CORRECT_ANSWER + POINTS.FIRST_TRY_BONUS : 0}
            />
          )}
        </div>
      </div>

      {isReviewing && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-100 shadow-lg p-4 z-40">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleNext}
              className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 active:scale-95 transition-all text-base shadow-emerald-200 shadow-md"
            >
              {isLast ? '🎉 عرض النتائج' : 'السؤال التالي ←'}
            </button>
          </div>
        </div>
      )}

      {exitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setExitConfirm(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">إنهاء الجلسة؟</h3>
            <p className="text-gray-600 mb-4">سيتم إلغاء تقدمك في هذه الجلسة.</p>
            <div className="flex gap-3">
              <button onClick={() => router.push('/practice')} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-semibold hover:bg-red-600 transition-colors">إنهاء</button>
              <button onClick={() => setExitConfirm(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors">تراجع</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SessionContent />
    </Suspense>
  );
}
