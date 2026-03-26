'use client';
import { useState } from 'react';

const FAQS = [
  {
    q: 'هل هذا اختبار القدرات الفعلي؟',
    a: 'لا. بُنيان منصة تدريب تبني المهارات الأساسية اللي يحتاجها طفلك للتفوق في اختبار القدرات مستقبلاً — التفكير النقدي والتحليلي والاستنتاج، مش الحفظ.',
  },
  {
    q: 'من أي عمر يبدأ طفلي؟',
    a: 'من عمر ٤ سنوات! الأسئلة مصممة لكل فئة عمرية — الصغار يتعلمون بالصور والأشكال، والكبار يتدربون على أسئلة أقرب لاختبار القدرات الفعلي.',
  },
  {
    q: 'هل المنصة فعلاً مجانية؟',
    a: 'نعم، مجانية بالكامل حالياً. نخطط لإضافة باقات مدفوعة مستقبلاً مع ميزات إضافية — لكن التدريب الأساسي سيبقى مجانياً.',
  },
  {
    q: 'كم سؤال في كل جلسة؟',
    a: '١٠ أسئلة لكل جلسة تدريبية، مع شرح مفصل لكل إجابة يساعد الطفل على الفهم الحقيقي.',
  },
  {
    q: 'هل أقدر أطبع الأسئلة؟',
    a: 'نعم! يمكنك توليد أوراق عمل PDF مصممة وطباعتها لطفلك ليحلها بقلم وورق — تجربة تعليمية بدون شاشة.',
  },
  {
    q: 'هل يحتاج طفلي حساباً للتسجيل؟',
    a: 'لا! طفلك يبدأ التدريب فوراً بضغطة زر واحدة — لا بريد إلكتروني ولا كلمة مرور ولا أي بيانات شخصية.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">أسئلة شائعة</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-right flex items-center justify-between p-5 font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <span className="flex-1">{faq.q}</span>
                <span className={`text-emerald-500 text-xl transition-transform duration-200 flex-shrink-0 ms-3 ${open === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3 animate-fade-in-up">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
