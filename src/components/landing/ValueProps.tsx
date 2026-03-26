const PROPS = [
  {
    icon: '🧠',
    title: 'بناء التفكير النقدي من عمر مبكر',
    desc: 'نبني المهارات الذهنية اللي يحتاجها طفلك قبل ما يوصل للاختبار',
    color: 'bg-purple-50 border-purple-100',
    iconBg: 'bg-purple-100',
  },
  {
    icon: '📝',
    title: 'أسئلة بأسلوب اختبار القدرات',
    desc: 'أسئلة كمية ولفظية ومنطقية مصممة خصيصاً لكل فئة عمرية',
    color: 'bg-blue-50 border-blue-100',
    iconBg: 'bg-blue-100',
  },
  {
    icon: '📊',
    title: 'تقارير أداء + أوراق عمل للطباعة',
    desc: 'تابع تقدم طفلك واطبع تمارين يحلها بدون شاشة',
    color: 'bg-amber-50 border-amber-100',
    iconBg: 'bg-amber-100',
  },
  {
    icon: '⚡',
    title: 'بدون تسجيل — ابدأ فوراً',
    desc: 'لا حساب ولا بيانات — طفلك يبدأ التدريب بضغطة زر',
    color: 'bg-emerald-50 border-emerald-100',
    iconBg: 'bg-emerald-100',
  },
];

export default function ValueProps() {
  return (
    <section className="bg-white py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">لماذا بُنيان؟</h2>
          <p className="text-gray-600 max-w-xl mx-auto">منصة مصممة خصيصاً للأطفال السعوديين — تبني المهارات الحقيقية، مش الحفظ</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {PROPS.map((p, i) => (
            <div key={i} className={`rounded-2xl border p-6 ${p.color} hover:shadow-md transition-shadow`}>
              <div className={`w-12 h-12 ${p.iconBg} rounded-xl flex items-center justify-center text-2xl mb-4`}>
                {p.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{p.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
