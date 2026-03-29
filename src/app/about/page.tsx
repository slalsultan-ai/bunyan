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
            <p className="text-gray-600 text-sm leading-relaxed">
              لأي ملاحظات أو اقتراحات أو استفسارات، يسعدنا تواصلك عبر البريد الإلكتروني. نقدّر ملاحظاتكم خصوصاً في هذه المرحلة المبكرة من المشروع.
            </p>
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
