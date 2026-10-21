'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import MasteryPractice, { type MasteryTrackCopy } from '@/components/mastery/MasteryPractice';
import { isMawhibaL1Age, MAWHIBA_L1_AGE_MESSAGE } from '@/lib/mawhiba/eligibility';

const MAWHIBA_COPY: MasteryTrackCopy = {
  track: 'mawhiba_l1',
  title: 'مسار موهبة ١',
  icon: '🏆',
  subtitle: 'تدريب تكيّفي على نمط مقياس موهبة، المستوى الأول',
};

/**
 * Mawhiba Level 1 adaptive-mastery track. Reachable with the `mawhiba_l1`
 * flag, or by direct link for everyone while `mawhiba_l1_link` is on.
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

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-sm text-center">
          <div className="mb-3 text-5xl">🏆</div>
          <p className="mb-2 text-lg font-bold text-gray-800">مسار موهبة ١</p>
          <p className="mb-6 text-gray-500">تدريب تكيّفي على نمط مقياس موهبة للأطفال من 6 إلى 11 سنة. سجّل الدخول وأضف طفلك للبدء.</p>
          <Link href="/auth?redirect=/practice/mawhiba" className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white">تسجيل الدخول</Link>
        </div>
      </div>
    );
  }

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
