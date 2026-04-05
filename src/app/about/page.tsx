import Logo from '@/components/ui/Logo';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Logo size="sm" linkable={false} />
          </Link>
          <Link
            href="/practice"
            className="bg-emerald-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors"
          >
            ابدأ التدريب
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* About */}
        <section>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">عن منصة بُنيان</h1>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-400 text-amber-900 text-xs font-black px-2 py-0.5 rounded-lg">BETA</span>
              <span className="text-amber-800 font-bold text-sm">نسخة تجريبية</span>
            </div>
            <p className="text-amber-700 text-sm leading-relaxed">
              منصة بُنيان لا تزال في مراحلها الأولى وفي طور التطوير والاختبار. قد تواجه بعض الأخطاء أو التغييرات المفاجئة أثناء استخدامك للمنصة.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <p className="text-gray-700 leading-relaxed">
              بُنيان هي منصة تدريبية تفاعلية تهدف إلى تهيئة الأطفال لاختبار القدرات العامة (GAT) من سن 4 سنوات. نقدم أسئلة تدريبية في المهارات الكمية واللفظية والمنطقية مصمّمة لكل فئة عمرية.
            </p>
            <p className="text-gray-700 leading-relaxed">
              نؤمن أن كل طفل يستحق فرصة متساوية في الإعداد لمستقبله الأكاديمي، ونسعى لتوفير أداة تعليمية ممتعة ومجانية تساعد الأسر السعودية في هذا المسعى.
            </p>
          </div>
        </section>

        {/* Disclaimer */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">إخلاء المسؤولية</h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
              <p>
                <strong className="text-gray-800">1. طبيعة المحتوى:</strong> جميع الأسئلة والمحتوى التدريبي المقدّم في منصة بُنيان هو محتوى تدريبي تقريبي ولا يمثّل أسئلة اختبار القدرات الفعلية الصادرة من هيئة تقويم التعليم والتدريب (قياس). المنصة ليست جهة رسمية ولا تتبع لأي جهة حكومية.
              </p>
              <p>
                <strong className="text-gray-800">2. لا ضمانات للنتائج:</strong> لا تضمن منصة بُنيان تحقيق نتائج محددة في الاختبارات الرسمية. المنصة أداة تدريبية مساعدة فقط ولا تُغني عن الإعداد الرسمي أو الاستعانة بمختصين.
              </p>
              <p>
                <strong className="text-gray-800">3. مرحلة بيتا:</strong> المنصة في مرحلة تجريبية وقد تحتوي على أخطاء في المحتوى أو التقنية. نعمل باستمرار على تحسين الجودة، لكن لا نضمن خلو المحتوى من الأخطاء.
              </p>
              <p>
                <strong className="text-gray-800">4. البيانات والخصوصية:</strong> نحتفظ بالحد الأدنى من البيانات اللازمة لتشغيل المنصة (البريد الإلكتروني عند التسجيل). لا نشارك بياناتك مع أطراف ثالثة.
              </p>
              <p>
                <strong className="text-gray-800">5. التغييرات:</strong> نحتفظ بحق تعديل المحتوى والخدمات والأسعار (إن وُجدت مستقبلاً) في أي وقت دون إشعار مسبق.
              </p>
              <p>
                <strong className="text-gray-800">6. المسؤولية:</strong> لا تتحمل منصة بُنيان أي مسؤولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام المنصة أو الاعتماد على محتواها.
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">تواصل معنا</h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <p className="text-gray-600 text-sm leading-relaxed mb-5">
              لأي ملاحظات أو اقتراحات أو استفسارات، يسعدنا تواصلك عبر واتساب. نقدّر ملاحظاتكم خصوصاً في هذه المرحلة المبكرة من المشروع.
            </p>
            <a
              href="https://wa.me/966503979994"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.464 3.488"/>
              </svg>
              <span>راسلنا عبر واتساب</span>
              <span dir="ltr" className="text-emerald-100 font-normal text-sm">0503979994</span>
            </a>
          </div>
        </section>

        {/* Back */}
        <div className="text-center pt-4">
          <Link
            href="/"
            className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm transition-colors"
          >
            ← العودة للصفحة الرئيسية
          </Link>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="bg-gray-950 text-gray-500 py-6 px-4 text-center text-xs">
        <p>&copy; {new Date().getFullYear()} بُنيان. جميع الحقوق محفوظة. <span className="text-gray-600">|</span> نسخة تجريبية (بيتا)</p>
      </footer>
    </div>
  );
}
