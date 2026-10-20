'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import Confetti from '@/components/ui/Confetti';
import BunaaBubble from '@/components/mascot/BunaaBubble';
import { useBunaa } from '@/hooks/useBunaa';
import { useSound } from '@/hooks/useSound';
import { speakArabic } from '@/lib/speech';
import { cn } from '@/lib/utils';

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
  skill: { key: string; nameAr: string; area: string } | null;
  results: boolean[];
  completed: boolean;
}

interface MasteredSkill {
  key: string;
  nameAr: string;
}

type Phase = 'loading' | 'ready' | 'playing' | 'completed' | 'error';

const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
const AREA_ICON: Record<string, string> = {
  quantitative: '🔢', verbal: '📖', logical_patterns: '🧩', spatial: '🧭', scientific: '🔬',
};

export interface MasteryTrackCopy {
  /** Track id sent to the API ('6-9' = smart path, 'mawhiba_l1' = Mawhiba). */
  track?: string;
  title: string;
  icon: string;
  subtitle: string;
  /** Where the header link and "back" buttons go. */
  backHref?: string;
}

const SMART_PATH_COPY: MasteryTrackCopy = {
  title: 'المسار الذكي',
  icon: '🧠',
  subtitle: 'أسئلة تتكيّف معك وأنت تحلّ',
};
const MUTE_KEY = 'mastery_muted';

/** Short answers (numbers, single words) read best as big tiles in a 2×2 grid. */
function isShortOptionSet(options: ServedQuestion['options']): boolean {
  return options.length <= 4 && options.every((o) => !o.imageUrl && o.text.trim().length <= 14);
}

// ─── Small pieces ───────────────────────────────────────────────────────────

function ProgressSegments({ results, total, answeredNow }: { results: boolean[]; total: number; answeredNow: boolean }) {
  return (
    <div className="flex gap-1.5" dir="rtl" aria-hidden>
      {Array.from({ length: total }, (_, i) => {
        const r = results[i];
        const isCurrent = i === results.length && !answeredNow;
        return (
          <div
            key={i}
            className={cn(
              'h-2.5 flex-1 rounded-full transition-colors duration-300',
              r === true && 'bg-emerald-500',
              r === false && 'bg-rose-400',
              r === undefined && (isCurrent ? 'bg-indigo-400 animate-pulse-slow' : 'bg-slate-200'),
            )}
          />
        );
      })}
    </div>
  );
}

function OptionButton({
  index, text, short, state, onClick, disabled,
}: {
  index: number;
  text: string;
  short: boolean;
  state: 'idle' | 'pending' | 'correct' | 'wrong' | 'faded';
  onClick: () => void;
  disabled: boolean;
}) {
  const badge = state === 'correct' ? '✓' : state === 'wrong' ? '✕' : LETTERS[index];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`الخيار ${LETTERS[index]}: ${text}`}
      className={cn(
        'relative w-full rounded-2xl border-2 bg-white font-bold text-slate-800 transition-all duration-200',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200',
        short
          ? 'flex min-h-[96px] items-center justify-center px-4 py-5 text-3xl sm:min-h-[112px] sm:text-4xl'
          : 'flex min-h-[64px] items-center gap-3 px-4 py-3 text-right text-lg',
        state === 'idle' && 'border-slate-200 shadow-sm hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md active:scale-[0.97]',
        state === 'pending' && 'border-indigo-400 bg-indigo-50 ring-4 ring-indigo-100',
        state === 'correct' && 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-4 ring-emerald-100',
        state === 'wrong' && 'animate-shake border-rose-400 bg-rose-50 text-rose-800',
        state === 'faded' && 'border-slate-100 opacity-45',
        disabled && state === 'idle' && 'cursor-default',
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full text-sm font-black',
          short ? 'absolute right-3 top-3 h-7 w-7' : 'h-9 w-9',
          state === 'correct' ? 'bg-emerald-500 text-white'
            : state === 'wrong' ? 'bg-rose-500 text-white'
              : state === 'pending' ? 'bg-indigo-500 text-white'
                : 'bg-slate-100 text-slate-500',
        )}
      >
        {state === 'pending'
          ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          : badge}
      </span>
      <span className={cn(short ? 'leading-none' : 'flex-1 leading-relaxed')}>{text}</span>
    </button>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

/**
 * Mastery-engine practice: the server picks each next question after scoring
 * the previous answer, so the client only renders what it is handed.
 */
export default function MasteryPractice({ childId, copy = SMART_PATH_COPY }: { childId: string; copy?: MasteryTrackCopy }) {
  const track = copy.track;
  const backHref = copy.backHref ?? '/practice';
  const bunaa = useBunaa();
  const [muted, setMuted] = useState(false);
  const { playCorrect, playWrong, playFanfare, playNext } = useSound(muted);

  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionView | null>(null);
  const [pendingNext, setPendingNext] = useState<SessionView | null>(null);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);

  const [celebrating, setCelebrating] = useState<MasteredSkill | null>(null);
  const [sessionMastered, setSessionMastered] = useState<MasteredSkill[]>([]);
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try { setMuted(localStorage.getItem(MUTE_KEY) === '1'); } catch { /* storage unavailable */ }
  }, []);

  const toggleMute = () => {
    setMuted((m) => {
      try { localStorage.setItem(MUTE_KEY, m ? '0' : '1'); } catch { /* storage unavailable */ }
      return !m;
    });
  };

  const loadSession = useCallback(async () => {
    setPhase('loading');
    try {
      const res = await fetch('/api/mastery/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, track }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'تعذّر تحميل الجلسة');
        setPhase('error');
        return;
      }
      setSession(data.session);
      setPhase(data.session.served > 0 ? 'playing' : 'ready');
    } catch {
      setError('تعذّر الاتصال بالخادم');
      setPhase('error');
    }
  }, [childId, track]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const resetAnswerState = () => {
    setSelectedOption(null);
    setIsCorrect(null);
    setCorrectOptionIndex(null);
    setExplanation(null);
    setShowWhy(false);
  };

  const handleStart = () => {
    setPhase('playing');
    bunaa.trigger('session_start');
  };

  const question = session?.question ?? null;
  const answered = isCorrect !== null;

  const handleSelect = useCallback(async (optionIndex: number) => {
    if (!session || !question || submitting || answered) return;
    setSelectedOption(optionIndex);
    setSubmitting(true);
    try {
      const res = await fetch('/api/mastery/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          track,
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
      if (data.isCorrect) playCorrect(); else playWrong();
      bunaa.onAnswer(data.isCorrect);
      if (data.masteredSkills?.length) {
        setCelebrating(data.masteredSkills[0]);
        playFanfare();
      }
    } catch {
      setError('تعذّر الاتصال بالخادم');
      setPhase('error');
    } finally {
      setSubmitting(false);
    }
  }, [session, question, submitting, answered, childId, track, loadSession, playCorrect, playWrong, playFanfare, bunaa]);

  const handleNext = useCallback(() => {
    if (!pendingNext) return;
    resetAnswerState();
    setSession(pendingNext);
    if (pendingNext.completed || !pendingNext.question) {
      bunaa.trigger(pendingNext.correct === pendingNext.served ? 'perfect_session' : 'session_end');
      setPhase('completed');
    } else {
      playNext();
    }
    setPendingNext(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pendingNext, bunaa, playNext]);

  // Keyboard: 1–4 (or أ ب ج د) to answer, Enter / Space to continue.
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (celebrating) {
        if (e.key === 'Enter' || e.key === 'Escape') setCelebrating(null);
        return;
      }
      if (answered) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNext(); }
        return;
      }
      const digit = Number(e.key);
      const letter = LETTERS.indexOf(e.key);
      const idx = Number.isInteger(digit) && digit >= 1 ? digit - 1 : letter;
      if (question && idx >= 0 && idx < question.options.length) handleSelect(idx);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, answered, celebrating, question, handleSelect, handleNext]);

  useEffect(() => {
    if (answered && !celebrating) nextButtonRef.current?.focus({ preventScroll: true });
  }, [answered, celebrating]);

  const pageShell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-sky-50">
      <div className="border-b border-slate-200/70 bg-white/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <Logo size="sm" />
          <Link href={backHref} className="text-sm font-medium text-slate-500 hover:text-slate-800">التمارين</Link>
        </div>
      </div>
      {children}
    </div>
  );

  // ─── Loading / error ──────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-indigo-50 to-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-slate-500">نجهّز لك أسئلة على مقاسك…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return pageShell(
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mb-4 text-5xl">😕</div>
        <p className="mb-6 font-bold text-slate-700">{error}</p>
        <button onClick={() => { setError(null); loadSession(); }} className="rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white">
          حاول مرة أخرى
        </button>
      </div>,
    );
  }

  // ─── Ready ────────────────────────────────────────────────────────────
  if (phase === 'ready' && session) {
    const steps = [
      { icon: '🎯', title: 'أسئلة على مقاسك', body: 'كل سؤال يُختار حسب إجابتك السابقة.' },
      { icon: '🏅', title: 'أتقن المهارة', body: 'اجتز تحدّي الإتقان لتفتح مهارة جديدة.' },
      { icon: '💪', title: 'الخطأ يعلّمك', body: 'إذا أخطأت نشرح لك ونساعدك خطوة بخطوة.' },
    ];
    return pageShell(
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-100 text-5xl shadow-inner">{copy.icon}</div>
          <h1 className="mb-2 text-3xl font-black text-slate-900">{copy.title}</h1>
          <p className="text-slate-500">{session.sessionSize} أسئلة · {copy.subtitle}</p>
        </div>
        <div className="mb-8 space-y-3">
          {steps.map((s) => (
            <div key={s.title} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-2xl">{s.icon}</span>
              <div>
                <p className="font-bold text-slate-800">{s.title}</p>
                <p className="text-sm text-slate-500">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleStart}
          autoFocus
          className="w-full rounded-2xl bg-gradient-to-l from-indigo-500 to-blue-600 py-4 text-lg font-black text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl active:scale-[0.98]"
        >
          يلّا نبدأ 🚀
        </button>
      </div>,
    );
  }

  // ─── Completed ────────────────────────────────────────────────────────
  if (phase === 'completed' && session) {
    const total = session.served || session.results.length;
    const pct = total > 0 ? Math.round((session.correct / total) * 100) : 0;
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const headline = pct >= 80 ? 'أداء رائع! 🌟' : pct >= 50 ? 'عمل جميل! 👏' : 'كل محاولة تقرّبك أكثر 💪';
    return pageShell(
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <Confetti active={sessionMastered.length > 0 || pct === 100} />
        <h1 className="mb-6 text-3xl font-black text-slate-900">{headline}</h1>

        <div className="relative mx-auto mb-6 h-36 w-36">
          <svg viewBox="0 0 128 128" className="h-full w-full">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
            <circle
              cx="64" cy="64" r={radius} fill="none" stroke="#10b981" strokeWidth="12" strokeLinecap="round"
              className="progress-ring__circle"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-slate-900">{session.correct}/{total}</span>
            <span className="text-xs text-slate-500">إجابات صحيحة</span>
          </div>
        </div>

        <div className="mx-auto mb-8 flex max-w-xs justify-center gap-1.5" dir="rtl">
          {session.results.map((r, i) => (
            <span key={i} className={cn('h-3 w-3 rounded-full', r ? 'bg-emerald-500' : 'bg-rose-400')} />
          ))}
        </div>

        {sessionMastered.length > 0 && (
          <div className="mb-8 rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-5">
            <p className="mb-3 font-black text-amber-800">🏅 أتقنت في هذه الجلسة</p>
            <div className="flex flex-wrap justify-center gap-2">
              {sessionMastered.map((s) => (
                <span key={s.key} className="rounded-full bg-white px-4 py-2 font-bold text-amber-900 shadow-sm">{s.nameAr}</span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => { setSessionMastered([]); loadSession(); }}
            className="flex-1 rounded-2xl bg-gradient-to-l from-indigo-500 to-blue-600 py-4 font-black text-white shadow-lg shadow-indigo-500/25"
          >
            جلسة جديدة 🚀
          </button>
          <Link href={backHref} className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 text-center font-bold text-slate-700">
            العودة للتمارين
          </Link>
        </div>
      </div>,
    );
  }

  if (!session || !question) return null;

  // ─── Playing ──────────────────────────────────────────────────────────
  const short = isShortOptionSet(question.options);
  const position = Math.min(session.results.length + 1, session.sessionSize);
  const shortPrompt = question.questionTextAr.trim().length <= 32 && !question.questionTextAr.includes('\n');
  const isLast = Boolean(pendingNext?.completed || (pendingNext && !pendingNext.question));
  const correctText = correctOptionIndex !== null ? question.options[correctOptionIndex]?.text : null;

  const stateFor = (idx: number): 'idle' | 'pending' | 'correct' | 'wrong' | 'faded' => {
    if (!answered) return submitting && idx === selectedOption ? 'pending' : 'idle';
    if (idx === correctOptionIndex) return 'correct';
    if (idx === selectedOption) return 'wrong';
    return 'faded';
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-indigo-50 via-white to-sky-50">
      <Confetti active={celebrating !== null} />

      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 px-4 pb-3 pt-3 backdrop-blur">
        <div className="mx-auto max-w-xl">
          <div className="mb-2.5 flex items-center justify-between">
            <Link
              href={backHref}
              aria-label="إنهاء الجلسة"
              className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              ✕
            </Link>
            <span className="text-sm font-bold text-slate-600">سؤال {position} من {session.sessionSize}</span>
            <button
              onClick={toggleMute}
              aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
              className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
          <ProgressSegments
            results={answered && isCorrect !== null ? [...session.results, isCorrect] : session.results}
            total={session.sessionSize}
            answeredNow={answered}
          />
        </div>
      </div>

      {/* Body */}
      <main className={cn('flex-1 px-4 pt-6', answered ? 'pb-56' : 'pb-10')}>
        <div className="mx-auto max-w-xl">
          {session.skill && (
            <div className="mb-4 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-100">
                <span>{AREA_ICON[session.skill.area] ?? '⭐'}</span>
                {session.skill.nameAr}
              </span>
            </div>
          )}

          <div key={question.id} className="animate-fade-in-up mb-6 rounded-3xl bg-white px-5 py-8 text-center shadow-md shadow-indigo-900/5 ring-1 ring-slate-100 sm:px-8">
            {question.questionImageUrl && (
              <img src={question.questionImageUrl} alt="صورة السؤال" className="mx-auto mb-5 max-h-56 w-auto rounded-2xl" />
            )}
            <p className={cn(
              'whitespace-pre-line font-bold text-slate-900',
              shortPrompt ? 'text-3xl leading-snug sm:text-4xl' : 'text-right text-lg leading-loose sm:text-xl',
            )}>
              {question.questionTextAr}
            </p>
            <button
              type="button"
              onClick={() => speakArabic(question.questionTextAr)}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700"
            >
              🔈 اقرأ لي السؤال
            </button>
          </div>

          <div className={cn(short ? 'grid grid-cols-2 gap-3' : 'space-y-3')}>
            {question.options.map((opt, idx) => (
              <OptionButton
                key={`${question.id}-${idx}`}
                index={idx}
                text={opt.text}
                short={short}
                state={stateFor(idx)}
                disabled={answered || submitting}
                onClick={() => handleSelect(idx)}
              />
            ))}
          </div>

          {!answered && (
            <p className="mt-5 text-center text-xs text-slate-400">
              اختر إجابة واحدة<span className="hidden sm:inline"> · أو اضغط 1–4 من لوحة المفاتيح</span>
            </p>
          )}
        </div>
      </main>

      {/* Feedback sheet */}
      {answered && (
        <div
          className={cn(
            'animate-fade-in-up fixed inset-x-0 bottom-0 z-40 border-t-4 px-4 pb-6 pt-4 shadow-[0_-8px_30px_rgba(15,23,42,0.08)]',
            isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-amber-400 bg-amber-50',
          )}
          role="status"
        >
          <div className="mx-auto max-w-xl">
            <div className="mb-3 flex items-start gap-3">
              <span className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-white',
                isCorrect ? 'bg-emerald-500' : 'bg-amber-500',
              )}>
                {isCorrect ? '✓' : '💡'}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-lg font-black', isCorrect ? 'text-emerald-800' : 'text-amber-900')}>
                  {isCorrect ? 'أحسنت! إجابة صحيحة 🎉' : 'ولا يهمّك، نتعلّم منها'}
                </p>
                {!isCorrect && correctText && (
                  <p className="text-sm font-bold text-amber-800">الإجابة الصحيحة: {correctText}</p>
                )}
                {explanation && (!isCorrect || showWhy) && (
                  <p className={cn('mt-2 max-h-28 overflow-y-auto text-sm leading-relaxed', isCorrect ? 'text-emerald-900' : 'text-amber-950')}>
                    {explanation}
                  </p>
                )}
                {explanation && isCorrect && !showWhy && (
                  <button onClick={() => setShowWhy(true)} className="mt-1 text-sm font-bold text-emerald-700 underline-offset-4 hover:underline">
                    كيف حليتها؟
                  </button>
                )}
              </div>
            </div>
            <button
              ref={nextButtonRef}
              onClick={handleNext}
              className={cn(
                'w-full rounded-2xl py-4 text-lg font-black text-white shadow-lg transition active:scale-[0.98]',
                'focus:outline-none focus-visible:ring-4',
                isCorrect
                  ? 'bg-emerald-600 shadow-emerald-600/25 hover:bg-emerald-700 focus-visible:ring-emerald-200'
                  : 'bg-amber-500 shadow-amber-500/25 hover:bg-amber-600 focus-visible:ring-amber-200',
              )}
            >
              {isLast ? 'شوف نتيجتك 🎉' : 'السؤال التالي ←'}
            </button>
          </div>
        </div>
      )}

      {/* Mastery celebration */}
      {celebrating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setCelebrating(null)}>
          <div className="animate-bounce-in w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-amber-200 to-amber-400 text-6xl shadow-lg shadow-amber-400/40">🏅</div>
            <p className="mb-1 text-sm font-bold text-amber-600">مهارة جديدة مُتقنة!</p>
            <h2 className="mb-6 text-2xl font-black text-slate-900">{celebrating.nameAr}</h2>
            <button
              autoFocus
              onClick={() => setCelebrating(null)}
              className="w-full rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 py-4 text-lg font-black text-white"
            >
              رائع! 🎉
            </button>
          </div>
        </div>
      )}

      {bunaa.enabled && (
        <BunaaBubble message={bunaa.message} visible={bunaa.visible} position="bottom-right" autoHide={4000} onClose={bunaa.hide} />
      )}
    </div>
  );
}
