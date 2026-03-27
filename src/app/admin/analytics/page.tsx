'use client';
import { useEffect, useState } from 'react';
import { formatTime } from '@/lib/utils';

interface Analytics {
  dailySessions: { date: string; cnt: number; avgScore: number }[];
  ageGroupDist: { ageGroup: string; cnt: number }[];
  skillDist: { skill: string; cnt: number }[];
  topGuests: { guestId: string; totalPoints: number; totalSessions: number; totalCorrect: number; totalAnswered: number; currentStreak: number }[];
  weekAcc: { date: string; accuracy: number }[];
}

const AGE_L: Record<string, string> = { '4-5': '4-5 سنوات', '6-9': '6-9 سنوات', '10-12': '10-12 سنة' };
const SKILL_L: Record<string, string> = { quantitative: 'كمي 🔢', verbal: 'لفظي 📖', logical_patterns: 'منطقي 🧩', mixed: 'مزيج 🎯' };

function Bar({ value, max, color = 'bg-emerald-500' }: { value: number; max: number; color?: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5">
      <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics').then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return null;

  const maxDailyCnt = Math.max(...data.dailySessions.map(d => d.cnt), 1);
  const totalAge = data.ageGroupDist.reduce((s, r) => s + r.cnt, 0) || 1;
  const totalSkill = data.skillDist.reduce((s, r) => s + r.cnt, 0) || 1;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">التحليلات</h1>
        <p className="text-gray-500 text-sm mt-0.5">إحصاءات الاستخدام والأداء</p>
      </div>

      {/* Sessions per day (14 days) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 mb-5">الجلسات اليومية — آخر 14 يوم</h3>
        {data.dailySessions.length === 0 ? (
          <p className="text-gray-400 text-center py-8">لا توجد بيانات</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {data.dailySessions.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 font-semibold">{d.cnt}</span>
                <div className="w-full bg-emerald-500 rounded-t-md transition-all hover:bg-emerald-600"
                  style={{ height: `${Math.max(4, (d.cnt / maxDailyCnt) * 120)}px` }}
                  title={`${d.date}: ${d.cnt} جلسة — متوسط ${d.avgScore}٪`}
                />
                <span className="text-xs text-gray-400 rotate-45 origin-right whitespace-nowrap">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age group distribution */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 mb-4">توزيع الجلسات حسب الفئة العمرية</h3>
          <div className="space-y-4">
            {data.ageGroupDist.map(r => (
              <div key={r.ageGroup}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-gray-700">{AGE_L[r.ageGroup] || r.ageGroup}</span>
                  <span className="text-gray-500">{r.cnt} ({Math.round((r.cnt / totalAge) * 100)}٪)</span>
                </div>
                <Bar value={r.cnt} max={totalAge * 1} color="bg-blue-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Skill distribution */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 mb-4">توزيع الجلسات حسب المهارة</h3>
          <div className="space-y-4">
            {data.skillDist.map(r => (
              <div key={r.skill}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-gray-700">{SKILL_L[r.skill] || r.skill}</span>
                  <span className="text-gray-500">{r.cnt} ({Math.round((r.cnt / totalSkill) * 100)}٪)</span>
                </div>
                <Bar value={r.cnt} max={totalSkill} color="bg-amber-500" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly accuracy trend */}
      {data.weekAcc.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 mb-4">متوسط الدقة آخر 7 أيام</h3>
          <div className="space-y-3">
            {data.weekAcc.map(d => (
              <div key={d.date} className="flex items-center gap-4">
                <span className="text-sm text-gray-500 w-24 shrink-0">{d.date.slice(5)}</span>
                <div className="flex-1">
                  <Bar value={d.accuracy} max={100} color={d.accuracy >= 80 ? 'bg-emerald-500' : d.accuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'} />
                </div>
                <span className={`text-sm font-bold w-12 text-left ${d.accuracy >= 80 ? 'text-emerald-600' : d.accuracy >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                  {d.accuracy}٪
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top guests */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">أكثر الزوار نشاطاً</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100">
            <tr>
              <th className="px-5 py-3 text-right font-semibold">#</th>
              <th className="px-5 py-3 text-right font-semibold">معرّف الزائر</th>
              <th className="px-5 py-3 text-right font-semibold">النقاط</th>
              <th className="px-5 py-3 text-right font-semibold">الجلسات</th>
              <th className="px-5 py-3 text-right font-semibold">الدقة</th>
              <th className="px-5 py-3 text-right font-semibold">الـ Streak</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.topGuests.map((g, i) => {
              const acc = g.totalAnswered > 0 ? Math.round((g.totalCorrect / g.totalAnswered) * 100) : 0;
              return (
                <tr key={g.guestId} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400 font-bold">{i + 1}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{g.guestId.slice(0, 16)}...</td>
                  <td className="px-5 py-3 font-bold text-amber-600">⭐ {g.totalPoints}</td>
                  <td className="px-5 py-3 text-gray-600">{g.totalSessions}</td>
                  <td className="px-5 py-3">
                    <span className={`font-semibold ${acc >= 80 ? 'text-emerald-600' : acc >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{acc}٪</span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{g.currentStreak > 0 ? `🔥 ${g.currentStreak}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data.topGuests.length === 0 && (
          <p className="text-center text-gray-400 py-10">لا توجد بيانات زوار</p>
        )}
      </div>
    </div>
  );
}
