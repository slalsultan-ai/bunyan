'use client';
import { useEffect, useState, useRef } from 'react';
import { formatTime } from '@/lib/utils';

interface ChildInfo {
  id: string;
  name: string;
  age: number;
  ageGroup: string;
}

interface ParentInfo {
  id: string;
  email: string;
  city: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  weeklyEmailEnabled: boolean;
  children: ChildInfo[];
}

interface SessionInfo {
  id: string;
  guestId: string | null;
  parentId: string | null;
  childId: string | null;
  ageGroup: string;
  skillArea: string;
  score: number | null;
  totalQuestions: number;
  timeTakenMs: number | null;
  startedAt: string;
  completedAt: string | null;
  ipAddress: string | null;
}

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
  parents: ParentInfo[];
  totalParents: number;
  totalChildren: number;
  sessions: SessionInfo[];
}

const TYPE_LABELS: Record<string, string> = { text: 'نصي', audio: 'صوتي', image: 'صوري', mixed: 'مختلط' };
const SKILL_LABELS: Record<string, string> = { quantitative: 'كمي', verbal: 'لفظي', logical_patterns: 'منطقي' };
const AGE_LABELS: Record<string, string> = { '4-5': '4-5 سنوات', '6-9': '6-9 سنوات', '10-12': '10-12 سنة' };

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [testWeek, setTestWeek] = useState(1);
  const [testAgeGroup, setTestAgeGroup] = useState<'4-5' | '6-9' | '10-12'>('6-9');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const testResultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats).finally(() => setLoading(false));
  }, []);

  async function handleSendTestEmail(e: React.FormEvent) {
    e.preventDefault();
    if (testSending) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, weekNumber: testWeek, ageGroup: testAgeGroup }),
      });
      const data = await res.json();
      const ok = res.ok;
      setTestResult({ ok, msg: ok ? `تم الإرسال بنجاح (${data.emailId})` : (data.error || 'حدث خطأ') });
      if (testResultTimer.current) clearTimeout(testResultTimer.current);
      testResultTimer.current = setTimeout(() => setTestResult(null), 8000);
    } catch {
      setTestResult({ ok: false, msg: 'فشل الاتصال بالخادم' });
    } finally {
      setTestSending(false);
    }
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!stats) return null;

  const cards = [
    { label: 'أولياء الأمور', value: stats.totalParents, sub: `${stats.totalChildren} طفل مسجل`, icon: '👨‍👩‍👧', color: 'bg-indigo-50 border-indigo-200', iconBg: 'bg-indigo-100' },
    { label: 'إجمالي الجلسات', value: stats.totalSessions, sub: `${stats.todaySessions} اليوم`, icon: '📝', color: 'bg-emerald-50 border-emerald-200', iconBg: 'bg-emerald-100' },
    { label: 'إجمالي الأسئلة', value: stats.totalQuestions, sub: `${stats.activeQuestions} نشطة`, icon: '❓', color: 'bg-blue-50 border-blue-200', iconBg: 'bg-blue-100' },
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

      {/* Registered Parents */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">أولياء الأمور المسجلين</h3>
          <p className="text-xs text-gray-400 mt-0.5">{stats.totalParents} ولي أمر — {stats.totalChildren} طفل</p>
        </div>
        {stats.parents.length === 0 ? (
          <p className="text-center text-gray-400 py-8">لا يوجد مستخدمين مسجلين بعد</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="px-5 py-3 text-right font-semibold">البريد الإلكتروني</th>
                  <th className="px-5 py-3 text-right font-semibold">المدينة</th>
                  <th className="px-5 py-3 text-right font-semibold">الأطفال</th>
                  <th className="px-5 py-3 text-right font-semibold">البريد الأسبوعي</th>
                  <th className="px-5 py-3 text-right font-semibold">تاريخ التسجيل</th>
                  <th className="px-5 py-3 text-right font-semibold">آخر دخول</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.parents.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-800 font-medium" dir="ltr">{p.email}</td>
                    <td className="px-5 py-3 text-gray-600">{p.city || '—'}</td>
                    <td className="px-5 py-3">
                      {p.children.length === 0 ? (
                        <span className="text-gray-400">لا يوجد</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {p.children.map(c => (
                            <span key={c.id} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full border border-emerald-200">
                              {c.name} <span className="text-emerald-500">({c.age} سنة)</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.weeklyEmailEnabled ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                        {p.weeklyEmailEnabled ? 'مفعّل' : 'معطّل'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{p.createdAt?.slice(0, 10) || '—'}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{p.lastLoginAt?.slice(0, 16).replace('T', ' ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Sessions */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">جميع الجلسات</h3>
          <p className="text-xs text-gray-400 mt-0.5">آخر 50 جلسة — الجلسات الوهمية (بدون نتيجة أو وقت) مُعلّمة</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="px-4 py-3 text-right font-semibold">النوع</th>
                <th className="px-4 py-3 text-right font-semibold">الفئة العمرية</th>
                <th className="px-4 py-3 text-right font-semibold">المهارة</th>
                <th className="px-4 py-3 text-right font-semibold">النتيجة</th>
                <th className="px-4 py-3 text-right font-semibold">الوقت</th>
                <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
                <th className="px-4 py-3 text-right font-semibold">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.sessions.map(s => {
                const isSuspicious = s.score === null && s.completedAt === null;
                const pct = s.score != null && s.totalQuestions > 0 ? Math.round((s.score / s.totalQuestions) * 100) : null;
                return (
                  <tr key={s.id} className={`transition-colors ${isSuspicious ? 'bg-amber-50/50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.parentId ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                        {s.parentId ? 'مسجّل' : 'زائر'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{AGE_LABELS[s.ageGroup] || s.ageGroup}</td>
                    <td className="px-4 py-3 text-gray-600">{SKILL_LABELS[s.skillArea] || s.skillArea}</td>
                    <td className="px-4 py-3">
                      {pct !== null ? (
                        <span className={`font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                          {s.score}/{s.totalQuestions} ({pct}٪)
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.timeTakenMs ? formatTime(s.timeTakenMs) : '—'}</td>
                    <td className="px-4 py-3">
                      {s.completedAt ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">مكتملة</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{isSuspicious ? 'وهمية؟' : 'جارية'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{s.startedAt?.slice(0, 16).replace('T', ' ')}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono" dir="ltr">{s.ipAddress || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {stats.sessions.length === 0 && (
            <p className="text-center text-gray-400 py-8">لا توجد جلسات بعد</p>
          )}
        </div>
      </div>

      {/* Send test email */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 mb-1">إرسال بريد تجريبي</h3>
        <p className="text-xs text-gray-400 mb-4">معاينة البريد الأسبوعي بإرساله لبريد محدد</p>
        <form onSubmit={handleSendTestEmail} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600">البريد الإلكتروني</label>
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 text-left"
              dir="ltr"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">الأسبوع</label>
            <select
              value={testWeek}
              onChange={e => setTestWeek(Number(e.target.value))}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {Array.from({ length: 8 }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>الأسبوع {w}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">الفئة العمرية</label>
            <select
              value={testAgeGroup}
              onChange={e => setTestAgeGroup(e.target.value as '4-5' | '6-9' | '10-12')}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="4-5">4-5 سنوات</option>
              <option value="6-9">6-9 سنوات</option>
              <option value="10-12">10-12 سنة</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={testSending}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-xl transition-colors"
          >
            {testSending ? 'جاري الإرسال...' : 'إرسال'}
          </button>
        </form>
        {testResult && (
          <div className={`mt-3 text-sm px-4 py-2 rounded-xl ${testResult.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {testResult.ok ? '✅' : '❌'} {testResult.msg}
          </div>
        )}
      </div>

    </div>
  );
}
