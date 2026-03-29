import Link from 'next/link';

export default function WeeklyEmailSection() {
  return (
    <section className="py-16 px-4 bg-gradient-to-b from-white to-emerald-50" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl border-2 border-emerald-100 p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">
            📬
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">تمارين أسبوعية على بريدك</h2>
          <p className="text-gray-600 mb-6 text-base leading-relaxed">
            سجّل مجاناً واحصل كل أسبوع على أسئلة وألعاب ونصائح مخصصة لعمر طفلك
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-right">
            <div className="flex items-start gap-3 bg-emerald-50 rounded-2xl p-4">
              <span className="text-xl shrink-0">🔢</span>
              <p className="text-sm text-gray-700 font-medium leading-snug">أسئلة كمية ولفظية جديدة كل أسبوع</p>
            </div>
            <div className="flex items-start gap-3 bg-emerald-50 rounded-2xl p-4">
              <span className="text-xl shrink-0">🧩</span>
              <p className="text-sm text-gray-700 font-medium leading-snug">ألعاب ذهنية تلعبها مع طفلك</p>
            </div>
            <div className="flex items-start gap-3 bg-emerald-50 rounded-2xl p-4">
              <span className="text-xl shrink-0">💡</span>
              <p className="text-sm text-gray-700 font-medium leading-snug">نصائح تربوية لبناء التفكير النقدي</p>
            </div>
          </div>

          <Link
            href="/auth"
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base px-8 py-3.5 rounded-2xl transition-colors shadow-md"
          >
            سجّل مجاناً
          </Link>
          <p className="text-xs text-gray-400 mt-3">مجاني بالكامل • بدون التزام • إلغاء في أي وقت</p>
        </div>
      </div>
    </section>
  );
}
