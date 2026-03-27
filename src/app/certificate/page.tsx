'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSkillAreaLabel, getAgeGroupLabel } from '@/lib/utils';
import { AgeGroup, SkillArea } from '@/types';

function CertificateContent() {
  const params = useSearchParams();
  const name = params.get('name') || 'الطفل المتميز';
  const score = parseInt(params.get('score') || '0');
  const total = parseInt(params.get('total') || '10');
  const skill = (params.get('skill') || 'mixed') as SkillArea;
  const age = (params.get('age') || '6-9') as AgeGroup;
  const [today, setToday] = useState('');

  useEffect(() => {
    const d = new Date();
    setToday(`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`);
  }, []);

  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const isPerfect = score === total;
  const stars = isPerfect ? 5 : pct >= 80 ? 4 : pct >= 60 ? 3 : 2;

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col items-center justify-center py-8 px-4 print:bg-white print:p-0 print:min-h-0" dir="rtl">

      {/* Print controls */}
      <div className="print:hidden mb-6 flex gap-3">
        <button
          onClick={() => window.print()}
          className="bg-emerald-600 text-white font-bold px-8 py-3 rounded-2xl hover:bg-emerald-700 transition-colors shadow-lg flex items-center gap-2"
        >
          🖨️ طباعة الشهادة
        </button>
        <button
          onClick={() => window.close()}
          className="bg-white text-gray-700 font-semibold px-6 py-3 rounded-2xl hover:bg-gray-50 transition-colors shadow border border-gray-200"
        >
          ✕ إغلاق
        </button>
      </div>

      {/* Certificate */}
      <div className="certificate bg-white w-full max-w-2xl shadow-2xl print:shadow-none print:max-w-none print:w-full" style={{ minHeight: '500px' }}>

        {/* Gold outer border */}
        <div className="border-8 border-amber-400 m-3 print:m-4" style={{ minHeight: '470px' }}>
          <div className="border-2 border-amber-300 h-full flex flex-col">

            {/* Header */}
            <div className="bg-emerald-700 text-white py-5 px-8 text-center relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-emerald-600 rounded-full opacity-40" />
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-emerald-600 rounded-full opacity-40" />
              <div className="absolute top-2 right-2 text-amber-300 text-2xl">✦</div>
              <div className="absolute top-2 left-2 text-amber-300 text-2xl">✦</div>

              <div className="flex items-center justify-center gap-3 mb-1">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white font-extrabold text-xl border border-white/30">ب</div>
                <span className="font-extrabold text-xl tracking-wide">بُنيان</span>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white font-extrabold text-xl border border-white/30">ب</div>
              </div>
              <p className="text-emerald-200 text-xs tracking-widest">منصة تنمية المهارات</p>
            </div>

            {/* Title */}
            <div className="text-center py-6 px-6 border-b-2 border-amber-200 bg-amber-50">
              <div className="text-amber-600 text-3xl mb-1">🏆</div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-wide mb-0.5">شهادة تميّز</h1>
              <p className="text-gray-500 text-sm tracking-widest font-medium">Certificate of Achievement</p>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-6 space-y-4">
              <p className="text-gray-500 text-base">تُشهد منصة بُنيان بأن المتميز/ة</p>

              {/* Name */}
              <div className="relative py-3 px-10">
                <div className="absolute inset-0 border-b-4 border-amber-400 opacity-60" />
                <h2 className="text-4xl font-extrabold text-emerald-700 relative" style={{ fontFamily: 'serif' }}>
                  ✦ {name} ✦
                </h2>
              </div>

              <p className="text-gray-600 text-base leading-relaxed max-w-md">
                قد أتمّ بنجاح جلسة تدريبية في
                <span className="font-bold text-gray-900 mx-1">مهارة {getSkillAreaLabel(skill)}</span>
                للفئة العمرية
                <span className="font-bold text-gray-900 mx-1">{getAgeGroupLabel(age)}</span>
              </p>

              {/* Score */}
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-8 py-4 flex items-center gap-6">
                <div className="text-center">
                  <div className="text-4xl font-extrabold text-emerald-700">{score}<span className="text-2xl text-gray-400">/{total}</span></div>
                  <div className="text-xs text-gray-500 mt-0.5">النتيجة</div>
                </div>
                <div className="w-px h-12 bg-emerald-200" />
                <div className="text-center">
                  <div className="text-4xl font-extrabold text-emerald-700">{pct}٪</div>
                  <div className="text-xs text-gray-500 mt-0.5">الدقة</div>
                </div>
              </div>

              {/* Stars */}
              <div className="flex gap-1 text-3xl">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < stars ? 'text-amber-400' : 'text-gray-200'}>★</span>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-amber-200 bg-amber-50 px-8 py-4 flex items-center justify-between">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">التاريخ</div>
                <div className="text-sm font-bold text-gray-700">{today}</div>
              </div>

              {/* Stamp */}
              <div className="w-20 h-20 rounded-full border-4 border-emerald-600 flex flex-col items-center justify-center text-emerald-700">
                <div className="text-lg font-extrabold leading-none">ب</div>
                <div className="text-[8px] font-bold tracking-tight text-center leading-tight">بُنيان<br/>مُعتمد</div>
              </div>

              <div className="text-center">
                <div className="w-24 border-b-2 border-gray-400 border-dotted mb-1" />
                <div className="text-xs text-gray-500">توقيع ولي الأمر</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { margin: 0; }
          .certificate { width: 100%; max-width: 100%; }
        }
      `}</style>
    </div>
  );
}

export default function CertificatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <CertificateContent />
    </Suspense>
  );
}
