'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const SKILL_L: Record<string, string> = { quantitative: 'كمي', verbal: 'لفظي', logical_patterns: 'منطقي' };
const DIFF_L:  Record<string, string> = { easy: 'سهل', medium: 'متوسط', hard: 'صعب', mixed: 'مختلط' };
const AGE_L:   Record<string, string> = { '4-5': '4-5', '6-9': '6-9', '10-12': '10-12' };

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
}

interface Summary {
  critical: number;
  warning: number;
  healthy: number;
  avgPassRate: number;
  total: number;
}

function PassBadge({ rate }: { rate: number }) {
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
  const letters = ['أ', 'ب', 'ج', 'د'];
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
  const [filter, setFilter]   = useState<'all' | 'critical' | 'warning' | 'healthy'>('all');

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
    if (filter === 'critical') return q.passRate < 30;
    if (filter === 'warning')  return q.passRate >= 30 && q.passRate < 50;
    if (filter === 'healthy')  return q.passRate >= 50;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">صحة الأسئلة</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            أداء كل سؤال بناءً على إجابات المستخدمين — يظهر الأسئلة التي لها ٣ محاولات أو أكثر
          </p>
        </div>
        <Link href="/admin/questions"
          className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
          ← الأسئلة
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'متوسط نسبة النجاح',
            value: `${summary.avgPassRate}٪`,
            sub: `${summary.total} سؤال محلَّل`,
            color: summary.avgPassRate >= 60 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50',
            icon: '🎯',
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
      <div className="flex gap-2">
        {([
          { key: 'all',      label: `الكل (${summary.total})` },
          { key: 'critical', label: `🚨 حرجة (${summary.critical})` },
          { key: 'warning',  label: `⚠️ تحذير (${summary.warning})` },
          { key: 'healthy',  label: `✅ صحية (${summary.healthy})` },
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
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      <span>{AGE_L[q.ageGroup] || q.ageGroup} سنوات</span>
                      <br />
                      <span>{SKILL_L[q.skillArea] || q.skillArea}</span>
                    </td>
                    <td className="px-4 py-3">
                      <PassBadge rate={q.passRate} />
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
          <p>لا توجد بيانات كافية بعد — تحتاج كل سؤال لـ٣ محاولات على الأقل</p>
        </div>
      )}
    </div>
  );
}
