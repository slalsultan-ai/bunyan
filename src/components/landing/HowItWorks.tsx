const STEPS = [
  { icon: '👶', title: 'اختر الفئة العمرية', desc: 'حدد عمر طفلك لتحصل على أسئلة مناسبة' },
  { icon: '🎯', title: 'حدد المهارة', desc: 'كمي أو لفظي أو منطقي أو مزيج من الكل' },
  { icon: '🚀', title: 'ابدأ التدريب', desc: '١٠ أسئلة مع شرح فوري لكل إجابة' },
];

export default function HowItWorks() {
  return (
    <section className="bg-gray-50 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">كيف يعمل بُنيان؟</h2>
          <p className="text-gray-600">٣ خطوات بسيطة للبدء</p>
        </div>
        <div className="relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-10 right-[16.5%] left-[16.5%] h-0.5 bg-emerald-200 z-0" />
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div key={i} className="relative z-10 text-center">
                <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg">
                  {step.icon}
                </div>
                <div className="absolute -top-2 -right-2 md:top-0 md:right-auto md:left-1/2 md:-translate-x-1/2 w-6 h-6 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center text-xs font-bold text-emerald-600">
                  {i + 1}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
