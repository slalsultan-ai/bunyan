import Link from 'next/link';

export default function FooterCTA() {
  return (
    <>
      <section className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-5xl mb-4">🌟</div>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-4">جاهز تبني مستقبل طفلك؟</h2>
          <p className="text-emerald-200 mb-8 text-base">ابدأ الآن مجاناً — لا تسجيل ولا انتظار</p>
          <Link
            href="/practice"
            className="inline-block bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold text-lg px-10 py-4 rounded-2xl transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-95"
          >
            ابدأ الآن — مجاناً 🚀
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-right">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="text-white font-bold text-lg">بُنيان</span>
                <span className="bg-amber-400/90 text-amber-900 text-[9px] font-black px-1 py-px rounded leading-none">BETA</span>
              </div>
              <p className="text-sm">كل بُنيان يبدأ بلبنة</p>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <Link href="/practice" className="hover:text-white transition-colors">تدريب</Link>
              <Link href="/worksheet" className="hover:text-white transition-colors">أوراق عمل</Link>
              <Link href="/about" className="hover:text-white transition-colors">عن المنصة</Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
            <p>هذه المنصة في مرحلة تجريبية (بيتا) — المحتوى للتدريب فقط ولا يُغني عن الإعداد الرسمي</p>
            <p className="mt-1">&copy; {new Date().getFullYear()} بُنيان. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
