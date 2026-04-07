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
              <Link href="/premium" className="hover:text-white transition-colors">بُنيان+</Link>
              <Link href="/worksheet" className="hover:text-white transition-colors">أوراق عمل</Link>
              <Link href="/about" className="hover:text-white transition-colors">عن المنصة</Link>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <a
              href="https://wa.me/966503979994"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="تواصل معنا عبر واتساب"
              className="inline-flex items-center gap-2 bg-emerald-600/90 hover:bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.464 3.488"/>
              </svg>
              <span>واتساب</span>
              <span dir="ltr" className="text-emerald-100/80 font-normal">0503979994</span>
            </a>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
            <p>هذه المنصة في مرحلة تجريبية (بيتا) — المحتوى للتدريب فقط ولا يُغني عن الإعداد الرسمي</p>
            <p className="mt-1">&copy; {new Date().getFullYear()} بُنيان. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
