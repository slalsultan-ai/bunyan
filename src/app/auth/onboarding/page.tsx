'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';

const SAUDI_CITIES = ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'بريدة', 'أبها', 'تبوك', 'حائل', 'الطائف', 'نجران', 'جازان', 'الخبر', 'الظهران', 'القصيم', 'أخرى'];

interface ChildInput { name: string; age: string }

export default function OnboardingPage() {
  const router = useRouter();
  const [city, setCity] = useState('');
  const [childrenData, setChildrenData] = useState<ChildInput[]>([{ name: '', age: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addChild() {
    if (childrenData.length < 10) {
      setChildrenData(prev => [...prev, { name: '', age: '' }]);
    }
  }

  function updateChild(index: number, field: keyof ChildInput, value: string) {
    setChildrenData(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  }

  function removeChild(index: number) {
    if (childrenData.length > 1) {
      setChildrenData(prev => prev.filter((_, i) => i !== index));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    for (const c of childrenData) {
      if (!c.name.trim()) { setError('أدخل اسم كل طفل'); return; }
      const age = Number(c.age);
      if (!age || age < 4 || age > 12) { setError('العمر يجب أن يكون بين ٤ و١٢'); return; }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: city || undefined,
          children: childrenData.map(c => ({ name: c.name.trim(), age: Number(c.age) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'حدث خطأ'); return; }

      // Check for guest data to migrate
      try {
        const guestRaw = localStorage.getItem('bunyan_guest');
        if (guestRaw && data.children?.[0]?.id) {
          // Data stored in localStorage — it stays there for now
          // (full migration would require additional API endpoint)
          localStorage.setItem('bunyan_migrated_child_id', data.children[0].id);
        }
      } catch { /* ignore */ }

      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-10 px-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="md" className="justify-center mb-3" />
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">أخبرنا عن طفلك</h1>
          <p className="text-gray-500 text-sm">نخصص التمارين والبريد الأسبوعي بناءً على عمره</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 space-y-6">
          {/* City */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              المدينة <span className="text-gray-400 font-normal">(اختياري)</span>
            </label>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none bg-white"
            >
              <option value="">اختر مدينتك</option>
              {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Children */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">بيانات الطفل / الأطفال</label>
            {childrenData.map((child, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    {childrenData.length > 1 ? `الطفل ${i + 1}` : 'الطفل'}
                  </span>
                  {childrenData.length > 1 && (
                    <button type="button" onClick={() => removeChild(i)} className="text-red-400 hover:text-red-600 text-xs">
                      حذف
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={child.name}
                  onChange={e => updateChild(i, 'name', e.target.value)}
                  placeholder="اسم الطفل"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  required
                />
                <select
                  value={child.age}
                  onChange={e => updateChild(i, 'age', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none bg-white"
                  required
                >
                  <option value="">العمر</option>
                  {Array.from({ length: 9 }, (_, j) => j + 4).map(age => (
                    <option key={age} value={age}>{age} سنوات</option>
                  ))}
                </select>
              </div>
            ))}

            {childrenData.length < 10 && (
              <button
                type="button"
                onClick={addChild}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
              >
                + أضف طفلاً آخر
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري الحفظ...
              </span>
            ) : 'ابدأ رحلة طفلك →'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          تقدر تعدّل أو تضيف أطفالاً لاحقاً من لوحتك
        </p>
      </div>
    </div>
  );
}
