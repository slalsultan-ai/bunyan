'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function HeroSection() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);

  return (
    <section className="relative bg-gradient-to-br from-emerald-50 via-white to-amber-50 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-amber-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-40 h-40 bg-emerald-200 rounded-full opacity-20 blur-2xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-20 md:py-28 text-center">
        <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-sm font-semibold px-4 py-2 rounded-full mb-6 border border-emerald-200">
            <span>🎁</span>
            <span>مجاني لفترة محدودة — سجّل الآن واستفد!</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            ابنِ قدرات طفلك
            <span className="block text-emerald-600">من اليوم</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            منصة تدريب تفاعلية تجهّز طفلك لاختبار القدرات العامة من عمر <strong className="text-gray-800">4 سنوات</strong> — بأسلوب ممتع يحبه الأطفال
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/practice"
              className="bg-emerald-600 text-white font-bold text-lg px-8 py-4 rounded-2xl hover:bg-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 w-full sm:w-auto"
            >
              ابدأ التدريب الآن — مجاناً 🚀
            </Link>
            <Link
              href="/progress"
              className="bg-white text-emerald-700 font-semibold text-base px-6 py-4 rounded-2xl border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all w-full sm:w-auto"
            >
              📊 عرض التقدم
            </Link>
          </div>
        </div>

        {/* Hero illustration - abstract visual */}
        <div className={`mt-14 transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex justify-center gap-4 flex-wrap">
            {[
              { bg: 'bg-emerald-500', icon: '🔢', label: 'كمي' },
              { bg: 'bg-blue-500', icon: '📖', label: 'لفظي' },
              { bg: 'bg-amber-500', icon: '🧩', label: 'منطقي' },
            ].map((item, i) => (
              <div
                key={i}
                className={`${item.bg} text-white rounded-2xl px-6 py-4 flex items-center gap-3 shadow-lg transform hover:-translate-y-1 transition-transform`}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="font-bold text-base">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
