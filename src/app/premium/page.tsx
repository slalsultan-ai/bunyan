'use client';

import { useState } from 'react';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';

const FEATURES = [
  'جلسات غير محدودة',
  'تحدي يومي مع نجمات وأوسمة',
  'مسار تدريب ذكي مخصص',
  'شروحات تفاعلية لكل سؤال',
  'تقارير أداء احترافية',
  'تنبيهات أسبوعية',
  'بنك أسئلة GAT كامل (1,000+ سؤال)',
  'اختبارات محاكاة',
];

export default function PremiumPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('أدخل بريد إلكتروني صالح');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/premium-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError('حدث خطأ، حاول مرة أخرى');
      }
    } catch {
      setError('تحقق من اتصالك بالإنترنت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            الرئيسية
          </Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="text-5xl mb-4">🚀</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">بُنيان+</h1>
        <p className="text-gray-600 mb-8">ارتقِ بتدريب طفلك للمستوى التالي</p>

        {/* Features list */}
        <div className="bg-white rounded-2xl p-6 border border-emerald-100 mb-8 text-right">
          <ul className="space-y-3">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="text-emerald-500 shrink-0">✅</span>
                <span className="text-gray-700">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Waitlist form */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-1">قريباً</h2>
          <p className="text-gray-500 text-sm mb-4">سجّل اهتمامك وسنبلغك عند الإطلاق</p>

          {submitted ? (
            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl font-medium">
              ✅ تم التسجيل! سنبلغك عند الإطلاق
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="البريد الإلكتروني"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                dir="ltr"
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? '...' : '📩 أبلغني عند الإطلاق'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
