'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import Logo from '@/components/ui/Logo';
import MasteryPractice, { type MasteryTrackCopy } from '@/components/mastery/MasteryPractice';
import { isMawhibaL1Age, isMawhibaL2Age, MAWHIBA_L1_AGE_MESSAGE, MAWHIBA_L2_AGE_MESSAGE } from '@/lib/mawhiba/eligibility';

type Level = '1' | '2';

const TESTS: Record<Level, {
  copy: MasteryTrackCopy;
  name: string;
  grades: string;
  sections: string;
  ageOk: (age: number) => boolean;
  ageMessage: string;
}> = {
  '1': {
    copy: {
      track: 'mawhiba_l1', title: 'اختبار موهبة ١', icon: '🏆',
      subtitle: 'تدريب تكيّفي على نمط مقياس موهبة، المستوى الأول',
      backHref: '/practice/mawhiba', backLabel: 'تغيير الاختبار',
    },
    name: 'اختبار موهبة ١',
    grades: 'المستوى الأول · من الصف الثالث إلى الخامس الابتدائي',
    sections: 'لفظي · رياضي · مكاني · علمي وميكانيكي',
    ageOk: isMawhibaL1Age,
    ageMessage: MAWHIBA_L1_AGE_MESSAGE,
  },
  '2': {
    copy: {
      track: 'mawhiba_l2', title: 'اختبار موهبة ٢', icon: '🎓',
      subtitle: 'تدريب تكيّفي على نمط مقياس موهبة، المستوى الثاني',
      backHref: '/practice/mawhiba', backLabel: 'تغيير الاختبار',
    },
    name: 'اختبار موهبة ٢',
    grades: 'المستوى الثاني · من الصف السادس الابتدائي إلى الثاني المتوسط',
    sections: 'لغوي وفهم مقروء · مرونة عقلية · رياضي ومكاني · علمي وميكانيكي',
    ageOk: isMawhibaL2Age,
    ageMessage: MAWHIBA_L2_AGE_MESSAGE,
  },
};

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
    </div>
  );
}

function readLevel(): Level | null {
  const v = new URLSearchParams(window.location.search).get('test');
  return v === '1' || v === '2' ? v : null;
}

/** Pick Mawhiba 1 or 2. */
function Chooser({ onPick }: { onPick: (level: Level) => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-sky-50">
      <div className="border-b border-slate-200/70 bg-white/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between"><Logo size="sm" /></div>
      </div>
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="mb-2 text-center text-3xl font-black text-slate-900">اختبارات موهبة التدريبية</h1>
        <p className="mb-8 text-center text-slate-500">اختر الاختبار المناسب لصفّك وابدأ مباشرة، بلا تسجيل.</p>
        <div className="space-y-4">
          {(['1', '2'] as const).map((level) => {
            const t = TESTS[level];
            return (
              <button
                key={level}
                onClick={() => onPick(level)}
                className="flex w-full items-center gap-4 rounded-3xl border-2 border-indigo-100 bg-white p-5 text-right shadow-sm transition hover:border-indigo-400 hover:shadow-md active:scale-[0.99]"
              >
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-4xl">{t.copy.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xl font-black text-slate-900">{t.name}</span>
                  <span className="mt-1 block text-sm font-semibold text-indigo-700">{t.grades}</span>
                  <span className="mt-1 block text-xs text-slate-500">{t.sections}</span>
                </span>
                <span className="text-2xl text-indigo-400" aria-hidden>←</span>
              </button>
            );
          })}
        </div>
        <p className="mt-8 text-center text-sm text-slate-400">
          يُحفظ تقدّمك في هذا المتصفح.{' '}
          <Link href="/auth?redirect=/practice/mawhiba" className="font-semibold text-emerald-600 underline">لديك حساب؟ سجّل الدخول</Link>
        </p>
      </main>
    </div>
  );
}

/** A guest learner id for this browser (created on first use). */
function useGuestId(enabled: boolean) {
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'ready' | 'closed' | 'error'; childId?: string; error?: string }>({ status: 'idle' });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState({ status: 'loading' });
    fetch('/api/mastery/guest', { method: 'POST' })
      .then(async (res) => {
        const d = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 403) setState({ status: 'closed' });
        else if (!res.ok || !d.guest?.childId) setState({ status: 'error', error: d.error ?? 'تعذّر البدء، حاول مرة أخرى' });
        else setState({ status: 'ready', childId: d.guest.childId });
      })
      .catch(() => { if (!cancelled) setState({ status: 'error', error: 'تعذّر الاتصال بالخادم' }); });
    return () => { cancelled = true; };
  }, [enabled]);

  return state;
}

/**
 * Mawhiba practice tests (levels 1 and 2), reached by direct link. Open to
 * everyone while `mawhiba_l1_link` is on; visitors without an account (or
 * without a child of the right age) practise as guests.
 */
export default function MawhibaPage() {
  const router = useRouter();
  const mainFlag = useFeatureFlag('mawhiba_l1');
  const linkFlag = useFeatureFlag('mawhiba_l1_link');
  const flagsLoading = mainFlag.loading || linkFlag.loading;
  const anyFlag = mainFlag.enabled || linkFlag.enabled;
  const { selectedChild, loading: childLoading, isLoggedIn } = useSelectedChild();
  const [level, setLevel] = useState<Level | null>(null);
  const [levelRead, setLevelRead] = useState(false);

  useEffect(() => { setLevel(readLevel()); setLevelRead(true); }, []);
  useEffect(() => {
    const onPop = () => setLevel(readLevel());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => {
    if (!flagsLoading && !anyFlag) router.replace('/practice');
  }, [flagsLoading, anyFlag, router]);

  const pick = useCallback((l: Level) => {
    window.history.pushState(null, '', `/practice/mawhiba?test=${l}`);
    setLevel(l);
  }, []);

  const test = level ? TESTS[level] : null;
  const childFits = !!(isLoggedIn && selectedChild && test && test.ageOk(selectedChild.age));
  const guest = useGuestId(!!test && !childLoading && !flagsLoading && !childFits && linkFlag.enabled);

  if (flagsLoading || childLoading || !levelRead || !anyFlag) return <Spinner />;
  if (!test) return <Chooser onPick={pick} />;

  if (childFits && selectedChild) {
    return <MasteryPractice key={`${selectedChild.id}:${level}`} childId={selectedChild.id} copy={test.copy} />;
  }

  if (!linkFlag.enabled || guest.status === 'closed') {
    // Link closed: only registered children of the right age can practise.
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-sm text-center">
          <div className="mb-3 text-5xl">{test.copy.icon}</div>
          <p className="mb-2 text-lg font-bold text-gray-800">{isLoggedIn ? test.ageMessage : test.name}</p>
          <p className="mb-6 text-gray-500">{isLoggedIn ? 'اختر طفلاً مناسباً من صفحة التمارين.' : 'سجّل الدخول وأضف طفلك للبدء.'}</p>
          <Link href={isLoggedIn ? '/practice' : '/auth?redirect=/practice/mawhiba'} className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white">
            {isLoggedIn ? 'التمارين' : 'تسجيل الدخول'}
          </Link>
        </div>
      </div>
    );
  }

  if (guest.status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-sm text-center">
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-red-600">{guest.error}</p>
          <button onClick={() => window.location.reload()} className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white">إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  if (guest.status !== 'ready' || !guest.childId) return <Spinner />;
  return <MasteryPractice key={`${guest.childId}:${level}`} childId={guest.childId} copy={test.copy} />;
}
