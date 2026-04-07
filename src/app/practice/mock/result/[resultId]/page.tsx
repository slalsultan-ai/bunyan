'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';

interface SectionResult {
  name: string;
  icon: string;
  score: number;
  accuracy: number;
  totalQuestions: number;
}

interface QuestionDetail {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  timeSpent: number;
  correctAnswer: string;
  skillArea: string;
  subSkill: string;
  questionText: string;
  explanation: string;
}

interface MockResult {
  id: number;
  mockTestId: number;
  testTitle: string;
  score: number;
  accuracy: number;
  timeSpent: number;
  durationMinutes: number;
  status: string;
  sections: SectionResult[];
  percentile: number;
  grade: string;
  details: QuestionDetail[];
  recommendations: string[];
}

export default function MockTestResultPage() {
  const router = useRouter();
  const params = useParams();
  const resultId = Number(params.resultId);
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag('mock_tests');

  const [result, setResult] = useState<MockResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  useEffect(() => {
    if (flagLoading) return;
    if (!flagEnabled) {
      router.replace('/practice');
      return;
    }

    fetch(`/api/mock-tests/result?resultId=${resultId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.enabled === false || data.error) {
          router.replace('/practice');
          return;
        }
        setResult(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [flagEnabled, flagLoading, resultId, router]);

  if (flagLoading || loading || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">جاري التحميل...</div>
      </div>
    );
  }

  const timeMinutes = Math.round(result.timeSpent / 60);
  const wrongQuestions = result.details.filter((d) => !d.isCorrect && d.answer !== '');

  const gradeColor =
    result.accuracy >= 80
      ? 'text-emerald-600'
      : result.accuracy >= 60
      ? 'text-amber-500'
      : 'text-red-500';

  const gradeEmoji =
    result.accuracy >= 90
      ? '🏆'
      : result.accuracy >= 80
      ? '⭐'
      : result.accuracy >= 70
      ? '👍'
      : result.accuracy >= 60
      ? '💪'
      : '📖';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <Link href="/practice/mock" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">
            قائمة الاختبارات
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">📊 نتيجة اختبار المحاكاة</h1>
          <p className="text-gray-500 text-sm">{result.testTitle}</p>
          {result.status === 'timed_out' && (
            <p className="text-amber-500 text-sm mt-1">⏱️ انتهى الوقت</p>
          )}
        </div>

        {/* Main score card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center mb-6 shadow-sm">
          <div className="text-5xl font-bold text-gray-900 mb-1">
            {result.score} / {result.details.length}
          </div>
          <div className={`text-3xl font-bold mb-1 ${gradeColor}`}>{result.accuracy}%</div>
          <div className={`text-lg font-bold ${gradeColor}`}>
            {gradeEmoji} {result.grade}
          </div>
          <div className="flex justify-center gap-6 mt-4 text-sm text-gray-500">
            <span>⏱️ {timeMinutes} دقيقة من {result.durationMinutes}</span>
            <span>📊 أفضل من {result.percentile}% من المختبرين</span>
          </div>
        </div>

        {/* Section breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">تفصيل الأقسام</h3>
          <div className="space-y-4">
            {result.sections.map((section) => (
              <div key={section.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-700 font-medium text-sm">
                    {section.icon} {section.name}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {section.score}/{section.totalQuestions} ({section.accuracy}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      section.accuracy >= 80
                        ? 'bg-emerald-500'
                        : section.accuracy >= 60
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                    }`}
                    style={{ width: `${section.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wrong answers */}
        {wrongQuestions.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
            <h3 className="font-bold text-gray-900 mb-4">
              الأسئلة الخاطئة ({wrongQuestions.length})
            </h3>
            <div className="space-y-3">
              {wrongQuestions.map((detail) => {
                const isExpanded = expandedQuestion === detail.questionId;
                const qNum = result.details.findIndex((d) => d.questionId === detail.questionId) + 1;

                return (
                  <div
                    key={detail.questionId}
                    className="border border-gray-100 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-gray-500 text-xs">سؤال {qNum}: {detail.subSkill}</span>
                        <p className="text-gray-800 text-sm mt-1 line-clamp-2">
                          {detail.questionText}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm mb-2">
                      <span className="text-red-500">إجابتك: {detail.answer || '—'}</span>
                      <span className="text-emerald-600">الصحيحة: {detail.correctAnswer}</span>
                    </div>
                    <button
                      onClick={() =>
                        setExpandedQuestion(isExpanded ? null : detail.questionId)
                      }
                      className="text-blue-500 text-sm hover:underline"
                    >
                      💡 {isExpanded ? 'أخفِ الشرح' : 'اعرض الشرح'}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                        {detail.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
            <h3 className="font-bold text-gray-900 mb-3">توصيات</h3>
            <ul className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <li key={i} className="text-gray-600 text-sm flex items-start gap-2">
                  <span className="shrink-0">{i === 0 ? '💪' : i === 1 ? '🎯' : '📝'}</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/practice/mock"
            className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-center hover:bg-gray-200 transition-colors text-sm"
          >
            📋 قائمة الاختبارات
          </Link>
          <Link
            href={`/practice/mock/${result.mockTestId}`}
            className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl text-center hover:bg-emerald-700 transition-colors text-sm"
          >
            🔄 أعد الاختبار
          </Link>
        </div>
      </div>
    </div>
  );
}
