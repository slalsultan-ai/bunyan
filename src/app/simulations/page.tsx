import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export default function SimulationsPage() {
  return (
    <main className="min-h-screen bg-[#fff7e6] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex items-center justify-between">
          <Logo />
          <Link href="/practice" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#174835] shadow-sm">العودة للتدريب</Link>
        </header>
        <section className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-xl shadow-emerald-900/10 md:grid md:grid-cols-2">
          <div className="min-h-72 bg-[url('/assets/simulations/juice-stand/backgrounds/park_day1_sunny.png')] bg-cover bg-center" />
          <div className="p-7 sm:p-10">
            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">6–9 سنوات</span>
            <h1 className="mt-4 text-3xl font-black text-[#174835] sm:text-4xl">مشروعي الأول: عربة العصير</h1>
            <p className="mt-4 leading-8 text-slate-600">أدر عربة عصيرك لثلاثة أيام. اختر الكمية والسعر، ثم شاهد كيف تتغير الحديقة مع قراراتك.</p>
            <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold text-[#117a58]">
              <span className="rounded-xl bg-emerald-50 px-3 py-2">3 أيام</span>
              <span className="rounded-xl bg-emerald-50 px-3 py-2">9 قرارات</span>
              <span className="rounded-xl bg-emerald-50 px-3 py-2">8–10 دقائق</span>
            </div>
            <Link href="/simulations/juice-stand" className="mt-8 inline-flex rounded-2xl bg-[#117a58] px-6 py-3 font-black text-white shadow-lg shadow-emerald-800/20 transition hover:bg-[#174835]">ابدأ المشروع</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
