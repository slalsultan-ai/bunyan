'use client';
import { useEffect, useState } from 'react';
import { formatTime } from '@/lib/utils';

interface Stats {
  totalQuestions: number;
  activeQuestions: number;
  totalSessions: number;
  todaySessions: number;
  totalGuests: number;
  avgAccuracy: number;
  byAge: { ageGroup: string; cnt: number }[];
  byType: { type: string; cnt: number }[];
  bySkill: { skill: string; cnt: number }[];
  recentSessions: { id: string; ageGroup: string; skillArea: string; score: number; totalQuestions: number; timeTakenMs: number; startedAt: string }[];
}

const TYPE_LABELS: Record<string, string> = { text: 'نصي', audio: 'صوتي', image: 'صوري', mixed: 'مختلط' };
const SKILL_LABELS: Record<string, string> = { quantitative: 'كمي', verbal: 'لفظي', logical_patterns: 'منطقي' };
const AGE_LABELS: Record<string, string> = { '4-5': '4-5 سنوات', '6-9': '6-9 سنوات', '10-12': '10-12 سنة' };

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!stats) return null;

  const cards = [
    { label: 'إجمالي الأسئلة', value: stats.totalQuestions, sub: `${stats.activeQuestions} نشطة`, icon: '❓', color: 'bg-blue-50 border-blue-200', iconBg: 'bg-blue-100' },
    { label: 'إجمالي الجلسات', value: stats.totalSessions, sub: `${stats.todaySessions} اليوم`, icon: '📝', color: 'bg-emerald-50 border-emerald-200', iconBg: 'bg-emerald-100' },
    { label: 'إجمالي الزوار', value: stats.totalGuests, sub: 'زائر مسجل', icon: '👤', color: 'bg-amber-50 border-amber-200', iconBg: 'bg-amber-100' },
    { label: 'متوسط الدقة', value: `${stats.avgAccuracy}٪`, sub: 'على جميع الجلسات', icon: '🎯', color: 'bg-purple-50 border-purple-200', iconBg: 'bg-purple-100' },
  ];

  const totalByAge = stats.byAge.reduce((s, r) => s + r.cnt, 0) || 1;
  const totalByType = stats.byType.reduce((s, r) => s + r.cnt, 0) || 1;
  const totalBySkill = stats.bySkill.reduce((s, r) => s + r.cnt, 0) || 1;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
        <p className="text-gray-500 text-sm mt-0.5">نظرة عامة على النظام</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`bg-white border-2 ${c.color} rounded-2xl p-5`}>
            <div className={`w-10 h-10 ${c.iconBg} rounded-xl flex items-center justify-center text-xl mb-3`}>{c.icon}</div>
            <div className="text-2xl font-extrabold text-gray-900">{c.value}</div>
            <div className="text-sm font-semibold text-gray-700 mt-0.5">{c.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Age Group */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 mb-4">الأسئلة حسب الفئة العمرية</h3>
          <div className="space-y-3">
            {stats.byAge.map(r => (
              <div key={r.ageGroup}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{AGE_LABELS[r.ageGroup] || r.ageGroup}</span>
                  <span className="text-gray-500">{r.cnt}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(r.cnt / totalByAge) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Type */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 mb-4">الأسئلة حسب النوع</h3>
          <div className="space-y-3">
            {stats.byType.map(r => (
              <div key={r.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{TYPE_LABELS[r.type] || r.type}</span>
                  <span className="text-gray-500">{r.cnt}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(r.cnt / totalByType) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Skill */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 mb-4">الأسئلة حسب المهارة</h3>
          <div className="space-y-3">
            {stats.bySkill.map(r => (
              <div key={r.skill}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{SKILL_LABELS[r.skill] || r.skill}</span>
                  <span className="text-gray-500">{r.cnt}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${(r.cnt / totalBySkill) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">آخر الجلسات</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="px-5 py-3 text-right font-semibold">الفئة العمرية</th>
                <th className="px-5 py-3 text-right font-semibold">المهارة</th>
                <th className="px-5 py-3 text-right font-semibold">النتيجة</th>
                <th className="px-5 py-3 text-right font-semibold">الوقت</th>
                <th className="px-5 py-3 text-right font-semibold">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.recentSessions.map(s => {
                const pct = s.totalQuestions > 0 ? Math.round((s.score / s.totalQuestions) * 100) : 0;
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-800">{AGE_LABELS[s.ageGroup] || s.ageGroup}</td>
                    <td className="px-5 py-3 text-gray-600">{SKILL_LABELS[s.skillArea] || s.skillArea}</td>
                    <td className="px-5 py-3">
                      <span className={`font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                        {s.score}/{s.totalQuestions} ({pct}٪)
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{s.timeTakenMs ? formatTime(s.timeTakenMs) : '—'}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{s.startedAt?.slice(0, 16).replace('T', ' ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {stats.recentSessions.length === 0 && (
            <p className="text-center text-gray-400 py-8">لا توجد جلسات بعد</p>
          )}
        </div>
      </div>
    </div>
  );
}
