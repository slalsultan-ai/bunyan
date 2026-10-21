import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الصفحة غير موجودة | بُنيان',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main dir="rtl" className="flex-1 flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4" aria-hidden>🧭</div>
        <p className="text-sm font-bold text-emerald-600 mb-2">خطأ ٤٠٤</p>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-3">الصفحة غير موجودة</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          ربما تغيّر الرابط أو كُتب بشكل خاطئ. يمكنك العودة إلى الصفحة الرئيسية والمتابعة من هناك.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors">
            العودة إلى الرئيسية
          </Link>
          <Link href="/practice" className="bg-white border border-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors">
            ابدأ التمرين
          </Link>
        </div>
      </div>
    </main>
  );
}
