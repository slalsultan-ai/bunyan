'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { questionAgeGroupLabel, questionSkillAreaLabel } from '@/lib/question-taxonomy';

const DIFF_L:  Record<string, string> = { easy: 'سهل', medium: 'متوسط', hard: 'صعب', mixed: 'مختلط' };

interface QuestionHealth {
  id: string;
  questionTextAr: string;
  skillArea: string;
  ageGroup: string;
  difficulty: string;
  correctOptionIndex: number;
  isActive: boolean;
  totalAttempts: number;
  correctCount: number;
  avgTimeMs: number;
  passRate: number;
  optionDist: number[];
  status: 'critical' | 'warning' | 'healthy' | 'low_sample';
  suspectedKey: { index: number; share: number } | null;
}

interface Summary {
  critical: number;
  warning: number;
  healthy: number;
  lowSample: number;
  suspectedKey: number;
  avgPassRate: number;
  total: number;
}

const LETTERS = ['أ', 'ب', 'ج', 'د'];
const MIN_ATTEMPTS_FOR_VERDICT = 10;

type Filter = 'all' | 'suspect' | 'critical' | 'warning' | 'healthy' | 'low_sample';

function PassBadge({ rate, lowSample }: { rate: number; lowSample: boolean }) {
  if (lowSample) {
    return (
      <span className="inline-block border rounded-lg px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-500 border-gray-200" title="عينة صغيرة — لا حكم بعد">
        {rate}٪
      </span>
    );
  }
  const color = rate < 30
    ? 'bg-red-100 text-red-700 border-red-200'
    : rate < 50
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return (
    <span className={`inline-block border rounded-lg px-2 py-0.5 text-xs font-bold ${color}`}>
      {rate}٪
    </span>
  );
}

function OptionDistBar({ dist, correctIndex }: { dist: number[]; correctIndex: number }) {
  const total = dist.reduce((s, n) => s + n, 0) || 1;
  const letters = LETTERS;
  return (
    <div className="flex gap-1 items-end h-8">
      {dist.map((n, i) => {
        const pct = Math.round((n / total) * 100);
        const isCorrect = i === correctIndex;
        return (
          <div key={i} className="flex flex-col items-center gap-0.5" title={`${letters[i]}: ${n} (${pct}٪)`}>
            <div
              className={`w-5 rounded-sm ${isCorrect ? 'bg-emerald-500' : 'bg-gray-300'}`}
              style={{ height: `${Math.max(3, pct * 0.28)}px` }}
            />
            <span className="text-[9px] text-gray-400">{letters[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function QuestionHealthPage() {
  const [data, setData]       = useState<{ questions: QuestionHealth[]; summary: Summary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<Filter>('all');

  useEffect(() => {
    fetch('/api/admin/questions/health')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return null;

  const { questions, summary } = data;

  const filtered = questions.filter(q => {
    if (filter === 'suspect') return q.suspectedKey !== null;
    if (filter === 'all') return true;
    return q.status === filter;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">صحة الأسئلة</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            أداء كل سؤال من إجابات المستخدمين (3 محاولات فأكثر). الحكم بالنسبة يحتاج {MIN_ATTEMPTS_FOR_VERDICT} محاولات على الأقل، وما دونها «عينة صغيرة»
          </p>
        </div>
        <Link href="/admin/questions"
          className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
          ← الأسئلة
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          {
            label: 'متوسط نسبة النجاح',
            value: `${summary.avgPassRate}٪`,
            sub: `${summary.total - summary.lowSample} سؤال بعينة كافية`,
            color: summary.avgPassRate >= 60 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50',
            icon: '🎯',
          },
          {
            label: 'اشتباه بخطأ في الإجابة',
            value: summary.suspectedKey,
            sub: 'أغلب الأطفال اختاروا الخيار نفسه',
            color: 'border-purple-200 bg-purple-50',
            icon: '🔑',
          },
          {
            label: 'حرجة — أقل من 30٪',
            value: summary.critical,
            sub: 'تحتاج مراجعة فورية',
            color: 'border-red-200 bg-red-50',
            icon: '🚨',
          },
          {
            label: 'تحذير — 30–50٪',
            value: summary.warning,
            sub: 'تحتاج تحسيناً',
            color: 'border-amber-200 bg-amber-50',
            icon: '⚠️',
          },
          {
            label: 'صحية — أكثر من 50٪',
            value: summary.healthy,
            sub: 'أداء مقبول',
            color: 'border-emerald-200 bg-emerald-50',
            icon: '✅',
          },
          {
            label: 'عينة صغيرة',
            value: summary.lowSample,
            sub: `أقل من ${MIN_ATTEMPTS_FOR_VERDICT} محاولات — لا حكم بعد`,
            color: 'border-gray-200 bg-gray-50',
            icon: '🔍',
          },
        ].map(c => (
          <div key={c.label} className={`border-2 rounded-2xl p-5 ${c.color}`}>
            <div className="text-2xl mb-1">{c.icon}</div>
            <div className="text-2xl font-extrabold text-gray-900">{c.value}</div>
            <div className="text-sm font-semibold text-gray-700 mt-0.5">{c.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'all',        label: `الكل (${summary.total})` },
          { key: 'suspect',    label: `🔑 اشتباه بالإجابة (${summary.suspectedKey})` },
          { key: 'critical',   label: `🚨 حرجة (${summary.critical})` },
          { key: 'warning',    label: `⚠️ تحذير (${summary.warning})` },
          { key: 'healthy',    label: `✅ صحية (${summary.healthy})` },
          { key: 'low_sample', label: `🔍 عينة صغيرة (${summary.lowSample})` },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f.key ? 'bg-slate-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-16">لا توجد أسئلة في هذه الفئة</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold">السؤال</th>
                  <th className="px-4 py-3 text-right font-semibold">الفئة / المهارة</th>
                  <th className="px-4 py-3 text-right font-semibold">نسبة النجاح</th>
                  <th className="px-4 py-3 text-right font-semibold">المحاولات</th>
                  <th className="px-4 py-3 text-right font-semibold">متوسط الوقت</th>
                  <th className="px-4 py-3 text-right font-semibold">توزيع الخيارات</th>
                  <th className="px-4 py-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(q => (
                  <tr key={q.id} className={`hover:bg-gray-50 transition-colors ${!q.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-gray-800 truncate" title={q.questionTextAr}>{q.questionTextAr}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{DIFF_L[q.difficulty] || q.difficulty}</p>
                      {q.suspectedKey && (
                        <p className="mt-1 inline-block rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                          🔑 {Math.round(q.suspectedKey.share * 100)}٪ اختاروا ({LETTERS[q.suspectedKey.index]}) بدل المحفوظة ({LETTERS[q.correctOptionIndex]}) — راجع مفتاح الإجابة
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      <span>{questionAgeGroupLabel(q.ageGroup)}</span>
                      <br />
                      <span>{questionSkillAreaLabel(q.skillArea)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <PassBadge rate={q.passRate} lowSample={q.status === 'low_sample'} />
                      <div className="text-xs text-gray-400 mt-0.5">
                        {q.correctCount}/{q.totalAttempts}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-semibold">{q.totalAttempts}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {q.avgTimeMs > 0
                        ? q.avgTimeMs >= 60000
                          ? `${Math.round(q.avgTimeMs / 60000)}د`
                          : `${Math.round(q.avgTimeMs / 1000)}ث`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <OptionDistBar dist={q.optionDist} correctIndex={q.correctOptionIndex} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/questions/${q.id}`}
                        className="text-blue-600 hover:text-blue-800 text-xs font-semibold">
                        تعديل
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {summary.total === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">📊</div>
          <p>لا توجد بيانات كافية بعد — تحتاج كل سؤال لـ3 محاولات على الأقل</p>
        </div>
      )}
    </div>
  );
}
