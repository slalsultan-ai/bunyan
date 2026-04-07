'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { computeAgeGroupClient } from '@/lib/age-utils';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';

interface MockTestInfo {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  totalQuestions: number;
}

export default function MockTestListPage() {
  const router = useRouter();
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag('mock_tests');
  const { selectedChild, loading: childLoading } = useSelectedChild();

  const [tests, setTests] = useState<MockTestInfo[]>([]);
  const [completedTestIds, setCompletedTestIds] = useState<number[]>([]);
  const [bestScores, setBestScores] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [ageRestricted, setAgeRestricted] = useState(false);

  useEffect(() => {
    if (flagLoading || childLoading) return;

    if (!flagEnabled) {
      router.replace('/practice');
      return;
    }

    if (!selectedChild) {
      router.replace('/practice');
      return;
    }

    const ageGroup = computeAgeGroupClient(selectedChild.age);
    if (ageGroup !== '10-12') {
      setAgeRestricted(true);
      setLoading(false);
      return;
    }

    fetch(`/api/mock-tests?childId=${selectedChild.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.enabled === false) {
          router.replace('/practice');
          return;
        }
        if (data.ageRestricted) {
          setAgeRestricted(true);
        } else {
          setTests(data.tests || []);
          setCompletedTestIds(data.completedTestIds || []);
          setBestScores(data.bestScores || {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [flagEnabled, flagLoading, selectedChild, childLoading, router]);

  if (flagLoading || childLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">جاري التحميل...</div>
      </div>
    );
  }

  if (ageRestricted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">اختبارات المحاكاة</h1>
          <p className="text-gray-500 mb-8">اختبارات المحاكاة متاحة للفئة 10-12 فقط</p>
          <Link
            href="/practice"
            className="inline-block bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors"
          >
            العودة للتمرين
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">📝 اختبارات المحاكاة</h1>
          <p className="text-gray-600">
            تدرّب على اختبارات تحاكي القدرات الفعلي.
            <br />
            30 سؤال | 30 دقيقة | تقرير فوري
          </p>
        </div>

        <div className="space-y-4">
          {tests.map((test) => {
            const isCompleted = completedTestIds.includes(test.id);
            const best = bestScores[test.id];

            return (
              <div
                key={test.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">📝 {test.title}</h3>
                    {test.description && (
                      <p className="text-gray-500 text-sm mt-1">"{test.description}"</p>
                    )}
                  </div>
                </div>

                <div className="text-gray-500 text-sm mb-3">
                  {test.totalQuestions} سؤال · {test.durationMinutes} دقيقة
                </div>

                {isCompleted ? (
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-600 font-medium text-sm">
                      ✅ مكتمل — أفضل درجة: {Math.round(best)}%
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/practice/mock/${test.id}`)}
                        className="bg-gray-100 text-gray-700 font-bold px-4 py-2 rounded-xl text-sm hover:bg-gray-200 transition-colors"
                      >
                        🔄 أعد الاختبار
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">⏳ لم يبدأ</span>
                    <button
                      onClick={() => router.push(`/practice/mock/${test.id}`)}
                      className="bg-emerald-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-emerald-700 transition-colors"
                    >
                      🚀 ابدأ الاختبار
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {tests.length === 0 && (
            <div className="text-center text-gray-400 py-12">
              لا توجد اختبارات متاحة حالياً
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Logo size="sm" />
        <Link href="/practice" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">
          العودة للتمرين
        </Link>
      </div>
    </div>
  );
}
