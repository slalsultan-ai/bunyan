'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const AGE_GROUPS  = ['4-5', '6-9', '10-12'] as const;
const SKILL_AREAS = ['quantitative', 'verbal', 'logical_patterns'] as const;

const AGE_L:   Record<string, string> = { '4-5': '4–5 سنوات', '6-9': '6–9 سنوات', '10-12': '10–12 سنة' };
const SKILL_L: Record<string, string> = { quantitative: '🔢 كمي', verbal: '📖 لفظي', logical_patterns: '🧩 منطقي' };
const DIFF_COLORS: Record<string, string> = {
  easy:   'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard:   'bg-red-100 text-red-700',
  mixed:  'bg-blue-100 text-blue-700',
};
const DIFF_L: Record<string, string> = { easy: 'سهل', medium: 'متوسط', hard: 'صعب', mixed: 'مختلط' };

interface Cell {
  ageGroup: string;
  skillArea: string;
  active: number;
  total: number;
  byDifficulty: Record<string, number>;
}

function cellColor(active: number): string {
  if (active === 0)   return 'bg-red-50 border-red-300 text-red-600';
  if (active < 10)    return 'bg-orange-50 border-orange-300 text-orange-700';
  if (active < 20)    return 'bg-amber-50 border-amber-300 text-amber-700';
  return 'bg-emerald-50 border-emerald-300 text-emerald-700';
}

function cellLabel(active: number): string {
  if (active === 0)  return 'فارغة';
  if (active < 10)   return 'ضعيفة';
  if (active < 20)   return 'مقبولة';
  return 'جيدة';
}

export default function CoveragePage() {
  const [matrix, setMatrix]       = useState<Cell[][] | null>(null);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [hover, setHover]         = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/questions/coverage')
      .then(r => r.json())
      .then(d => { setMatrix(d.matrix); setGrandTotal(d.grandTotal); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!matrix) return null;

  // Summary counts
  const empty   = matrix.flat().filter(c => c.active === 0).length;
  const weak    = matrix.flat().filter(c => c.active > 0 && c.active < 10).length;
  const ok      = matrix.flat().filter(c => c.active >= 10 && c.active < 20).length;
  const good    = matrix.flat().filter(c => c.active >= 20).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تغطية المحتوى</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            توزيع الأسئلة النشطة عبر كل فئة عمرية ومهارة — اكتشف الثغرات قبل أن يكتشفها المستخدم
          </p>
        </div>
        <Link href="/admin/questions/new"
          className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm">
          ➕ سؤال جديد
        </Link>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الأسئلة النشطة', value: grandTotal, icon: '📚', color: 'border-slate-200 bg-slate-50' },
          { label: 'خلايا فارغة',            value: empty,      icon: '🚨', color: 'border-red-200 bg-red-50' },
          { label: 'خلايا ضعيفة (< 10)',     value: weak,       icon: '⚠️', color: 'border-amber-200 bg-amber-50' },
          { label: 'خلايا جيدة (≥ 20)',      value: good,       icon: '✅', color: 'border-emerald-200 bg-emerald-50' },
        ].map(c => (
          <div key={c.label} className={`border-2 rounded-2xl p-4 ${c.color}`}>
            <div className="text-xl mb-1">{c.icon}</div>
            <div className="text-2xl font-extrabold text-gray-900">{c.value}</div>
            <div className="text-xs text-gray-600 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="font-semibold">الكثافة:</span>
        {[
          { color: 'bg-red-200',    label: 'فارغة (0)' },
          { color: 'bg-orange-200', label: 'ضعيفة (1–9)' },
          { color: 'bg-amber-200',  label: 'مقبولة (10–19)' },
          { color: 'bg-emerald-200', label: 'جيدة (≥ 20)' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${l.color}`} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Matrix */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 w-36">
                الفئة العمرية ↓ / المهارة ←
              </th>
              {SKILL_AREAS.map(skill => (
                <th key={skill} className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                  {SKILL_L[skill]}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">المجموع</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, ri) => {
              const rowTotal = row.reduce((s, c) => s + c.active, 0);
              return (
                <tr key={AGE_GROUPS[ri]} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-4 text-sm font-bold text-gray-800 bg-gray-50">
                    {AGE_L[AGE_GROUPS[ri]]}
                  </td>
                  {row.map(cell => {
                    const key = `${cell.ageGroup}|${cell.skillArea}`;
                    const isHovered = hover === key;
                    return (
                      <td
                        key={cell.skillArea}
                        className="px-4 py-3 text-center align-top"
                        onMouseEnter={() => setHover(key)}
                        onMouseLeave={() => setHover(null)}
                      >
                        <Link
                          href={`/admin/questions?age_group=${cell.ageGroup}&skill_area=${cell.skillArea}`}
                          className={`block rounded-xl border-2 p-3 transition-all ${cellColor(cell.active)} ${isHovered ? 'shadow-md scale-105' : ''}`}
                        >
                          <div className="text-2xl font-extrabold">{cell.active}</div>
                          <div className="text-xs font-semibold mt-0.5">{cellLabel(cell.active)}</div>
                          {cell.total !== cell.active && (
                            <div className="text-xs opacity-60 mt-0.5">{cell.total} إجمالي</div>
                          )}
                          {/* Difficulty mini-breakdown */}
                          {isHovered && Object.keys(cell.byDifficulty).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1 justify-center">
                              {Object.entries(cell.byDifficulty).map(([diff, cnt]) => (
                                <span key={diff}
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${DIFF_COLORS[diff] || 'bg-gray-100 text-gray-600'}`}>
                                  {DIFF_L[diff] || diff}: {cnt}
                                </span>
                              ))}
                            </div>
                          )}
                        </Link>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-gray-700">{rowTotal}</span>
                  </td>
                </tr>
              );
            })}
            {/* Column totals */}
            <tr className="bg-gray-50 border-t border-gray-200">
              <td className="px-5 py-3 text-xs font-semibold text-gray-500">المجموع</td>
              {SKILL_AREAS.map((_, ci) => {
                const colTotal = matrix.reduce((s, row) => s + (row[ci]?.active ?? 0), 0);
                return (
                  <td key={ci} className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                    {colTotal}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-center text-sm font-extrabold text-emerald-700">{grandTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Recommendations */}
      {(empty > 0 || weak > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-bold text-amber-800 mb-3">💡 توصيات</h3>
          <ul className="space-y-1.5 text-sm text-amber-700">
            {matrix.flat()
              .filter(c => c.active < 10)
              .sort((a, b) => a.active - b.active)
              .slice(0, 5)
              .map(c => (
                <li key={`${c.ageGroup}|${c.skillArea}`} className="flex items-center gap-2">
                  <span>{c.active === 0 ? '🚨' : '⚠️'}</span>
                  <span>
                    {AGE_L[c.ageGroup]} — {SKILL_L[c.skillArea]}:
                    <strong className="mr-1">{c.active} سؤال</strong>
                    {c.active === 0 ? '— لا يوجد محتوى!' : '— يُنصح بإضافة المزيد'}
                  </span>
                  <Link href={`/admin/questions/new`}
                    className="text-xs text-amber-600 underline hover:text-amber-800 mr-auto">
                    أضف الآن
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
