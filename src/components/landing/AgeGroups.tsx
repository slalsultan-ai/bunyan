import Link from 'next/link';

const GROUPS = [
  {
    age: '4-5',
    label: '4 — 5 سنوات',
    emoji: '🌱',
    desc: 'أسئلة مصورة وألوان وأشكال — مصممة لمن لا يقرأون بعد',
    color: 'from-green-400 to-emerald-500',
    bg: 'bg-green-50 border-green-200',
    features: ['أسئلة بالصور', 'عد وأشكال', 'ألوان وأنماط'],
  },
  {
    age: '6-9',
    label: '6 — 9 سنوات',
    emoji: '📚',
    desc: 'أسئلة متنوعة تجمع بين الصور والنصوص القصيرة',
    color: 'from-blue-400 to-blue-500',
    bg: 'bg-blue-50 border-blue-200',
    features: ['جمع وطرح وضرب', 'مفردات عربية', 'أنماط وسلاسل'],
  },
  {
    age: '10-12',
    label: '10 — 12 سنة',
    emoji: '🚀',
    desc: 'تمارين متقدمة تحاكي أسلوب اختبار القدرات الفعلي',
    color: 'from-purple-400 to-purple-500',
    bg: 'bg-purple-50 border-purple-200',
    features: ['نسبة وتناسب', 'تناظر لغوي', 'استدلال منطقي'],
  },
];

export default function AgeGroups() {
  return (
    <section className="bg-white py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">محتوى مناسب لكل عمر</h2>
          <p className="text-gray-600">أسئلة متدرجة تتطور مع طفلك</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {GROUPS.map((g, i) => (
            <div key={i} className={`rounded-2xl border ${g.bg} p-6 hover:shadow-lg transition-shadow`}>
              <div className={`w-14 h-14 bg-gradient-to-br ${g.color} rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-md`}>
                {g.emoji}
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-2">{g.label}</h3>
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">{g.desc}</p>
              <ul className="space-y-1.5 mb-5">
                {g.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-emerald-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/practice?age=${g.age}`}
                className="block w-full text-center bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 transition-colors text-sm"
              >
                ابدأ لهذه الفئة
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
