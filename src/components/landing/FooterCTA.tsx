import Link from 'next/link';

export default function FooterCTA() {
  return (
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
        <div className="mt-10 pt-8 border-t border-emerald-700 text-emerald-300 text-sm">
          <p className="font-bold text-white text-base mb-1">بُنيان</p>
          <p>كل بُنيان يبدأ بلبنة</p>
        </div>
      </div>
    </section>
  );
}
