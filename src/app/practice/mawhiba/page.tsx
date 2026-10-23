'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import MasteryPractice, { type MasteryTrackCopy } from '@/components/mastery/MasteryPractice';
import { isMawhibaL1Age, MAWHIBA_L1_AGE_MESSAGE, MAWHIBA_L1_MAX_AGE, MAWHIBA_L1_MIN_AGE } from '@/lib/mawhiba/eligibility';

const MAWHIBA_COPY: MasteryTrackCopy = {
  track: 'mawhiba_l1',
  title: 'مسار موهبة ١',
  icon: '🏆',
  subtitle: 'تدريب تكيّفي على نمط مقياس موهبة، المستوى الأول',
};

const GUEST_AGES = Array.from({ length: MAWHIBA_L1_MAX_AGE - MAWHIBA_L1_MIN_AGE + 1 }, (_, i) => MAWHIBA_L1_MIN_AGE + i);

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm text-center">{children}</div>
    </div>
  );
}

/**
 * Visitor without an account on the direct link: pick the child's age once,
 * then practise as a guest (progress lives in this browser's guest cookie).
 */
function GuestMawhiba() {
  const [state, setState] = useState<'loading' | 'closed' | 'pick' | 'ready'>('loading');
  const [childId, setChildId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/mastery/guest')
      .then((r) => r.json())
      .then((d) => {
        if (!d.open) return setState('closed');
        if (d.guest?.childId) { setChildId(d.guest.childId); setState('ready'); }
        else setState('pick');
      })
      .catch(() => setState('pick'));
  }, []);

  const start = async (age: number) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/mastery/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.guest?.childId) { setError(d.error ?? 'تعذّر البدء، حاول مرة أخرى'); return; }
      setChildId(d.guest.childId);
      setState('ready');
    } catch {
      setError('تعذّر الاتصال بالخادم');
    } finally {
      setSaving(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (state === 'ready' && childId) {
    return <MasteryPractice key={childId} childId={childId} copy={MAWHIBA_COPY} />;
  }

  if (state === 'closed') {
    return (
      <CenteredCard>
        <div className="mb-3 text-5xl">🏆</div>
        <p className="mb-2 text-lg font-bold text-gray-800">مسار موهبة ١</p>
        <p className="mb-6 text-gray-500">سجّل الدخول وأضف طفلك للبدء.</p>
        <Link href="/auth?redirect=/practice/mawhiba" className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white">تسجيل الدخول</Link>
      </CenteredCard>
    );
  }

  return (
    <CenteredCard>
      <div className="mb-3 text-5xl">🏆</div>
      <h1 className="mb-2 text-2xl font-black text-gray-900">مسار موهبة ١</h1>
      <p className="mb-6 text-gray-500">تدريب تكيّفي على نمط مقياس موهبة، المستوى الأول. كم عمر الطفل؟</p>
      <div className="mb-4 grid grid-cols-3 gap-3">
        {GUEST_AGES.map((age) => (
          <button
            key={age}
            onClick={() => start(age)}
            disabled={saving}
            className="rounded-2xl border-2 border-indigo-100 bg-white py-4 text-xl font-black text-indigo-700 shadow-sm transition-colors hover:border-indigo-400 disabled:opacity-50"
          >
            {age}
            <span className="block text-xs font-semibold text-gray-400">سنوات</span>
          </button>
        ))}
      </div>
      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      <p className="text-sm text-gray-400">
        بلا تسجيل، ويُحفظ التقدّم في هذا المتصفح.{' '}
        <Link href="/auth?redirect=/practice/mawhiba" className="font-semibold text-emerald-600 underline">لديك حساب؟ سجّل الدخول</Link>
      </p>
    </CenteredCard>
  );
}

/**
 * Mawhiba Level 1 adaptive-mastery track. Reachable with the `mawhiba_l1`
 * flag, or by direct link for everyone while `mawhiba_l1_link` is on —
 * visitors without an account practise as guests.
 */
export default function MawhibaPage() {
  const router = useRouter();
  const mainFlag = useFeatureFlag('mawhiba_l1');
  const linkFlag = useFeatureFlag('mawhiba_l1_link');
  const flag = { loading: mainFlag.loading || linkFlag.loading, enabled: mainFlag.enabled || linkFlag.enabled };
  const { selectedChild, loading, isLoggedIn } = useSelectedChild();

  useEffect(() => {
    if (!flag.loading && !flag.enabled) router.replace('/practice');
  }, [flag.loading, flag.enabled, router]);

  if (flag.loading || loading || !flag.enabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!isLoggedIn) return <GuestMawhiba />;

  if (!selectedChild) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <p className="mb-2 text-lg font-bold text-gray-700">اختر طفلًا أولًا</p>
          <p className="mb-4 text-gray-500">مسار موهبة متاح للأطفال المسجلين</p>
          <Link href="/practice" className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white">التمارين</Link>
        </div>
      </div>
    );
  }

  if (!isMawhibaL1Age(selectedChild.age)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-sm text-center">
          <div className="mb-3 text-5xl">🏆</div>
          <p className="mb-2 text-lg font-bold text-gray-800">{MAWHIBA_L1_AGE_MESSAGE}</p>
          <p className="mb-6 text-gray-500">{selectedChild.name} عمره {selectedChild.age} سنوات. يمكنك اختيار طفل آخر من صفحة التمارين.</p>
          <Link href="/practice" className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white">التمارين</Link>
        </div>
      </div>
    );
  }

  return <MasteryPractice key={selectedChild.id} childId={selectedChild.id} copy={MAWHIBA_COPY} />;
}
