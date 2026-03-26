'use client';
import { useState } from 'react';
import { AgeGroup, SkillArea, Difficulty, Question } from '@/types';
import { getSkillAreaLabel, getAgeGroupLabel } from '@/lib/utils';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';

type QuestionCount = 10 | 15 | 20;

export default function WorksheetPage() {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('6-9');
  const [skillArea, setSkillArea] = useState<SkillArea>('mixed');
  const [difficulty, setDifficulty] = useState<Difficulty>('mixed');
  const [count, setCount] = useState<QuestionCount>(10);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [previewing, setPreviewing] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/questions?age_group=${ageGroup}&skill_area=${skillArea}&difficulty=${difficulty}&count=${count}`);
      const data = await res.json();
      setQuestions(data.questions || []);
      setPreviewing(true);
    } catch (e) {
      alert('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const LETTERS = ['أ', 'ب', 'ج', 'د'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4 print:hidden">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">الرئيسية</Link>
        </div>
      </div>

      {!previewing ? (
        <div className="max-w-xl mx-auto px-4 py-10 print:hidden">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">📄</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">توليد ورقة عمل</h1>
            <p className="text-gray-600 text-sm">اطبع تمارين مخصصة لطفلك يحلها بالقلم</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
            {/* Age */}
            <div>
              <label className="block font-semibold text-gray-800 mb-2 text-sm">الفئة العمرية</label>
              <div className="grid grid-cols-3 gap-2">
                {(['4-5', '6-9', '10-12'] as AgeGroup[]).map(a => (
                  <button key={a} onClick={() => setAgeGroup(a)}
                    className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${ageGroup === a ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300'}`}>
                    {a} سنوات
                  </button>
                ))}
              </div>
            </div>

            {/* Skill */}
            <div>
              <label className="block font-semibold text-gray-800 mb-2 text-sm">المهارة</label>
              <div className="grid grid-cols-2 gap-2">
                {(['quantitative', 'verbal', 'logical_patterns', 'mixed'] as SkillArea[]).map(s => (
                  <button key={s} onClick={() => setSkillArea(s)}
                    className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${skillArea === s ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300'}`}>
                    {getSkillAreaLabel(s)}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block font-semibold text-gray-800 mb-2 text-sm">المستوى</label>
              <div className="grid grid-cols-4 gap-2">
                {(['easy', 'medium', 'hard', 'mixed'] as Difficulty[]).map(d => {
                  const labels = { easy: 'سهل', medium: 'متوسط', hard: 'صعب', mixed: 'متنوع' };
                  return (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={`py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${difficulty === d ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300'}`}>
                      {labels[d]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Count */}
            <div>
              <label className="block font-semibold text-gray-800 mb-2 text-sm">عدد الأسئلة</label>
              <div className="grid grid-cols-3 gap-2">
                {([10, 15, 20] as QuestionCount[]).map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${count === n ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300'}`}>
                    {n} سؤال
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleGenerate} disabled={loading}
              className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'جاري التوليد...' : '📄 توليد الورقة'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Print controls */}
          <div className="max-w-3xl mx-auto px-4 py-4 flex gap-3 print:hidden">
            <button onClick={handlePrint} className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2">
              🖨️ طباعة / حفظ PDF
            </button>
            <button onClick={() => { setPreviewing(false); setQuestions([]); }} className="bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors">
              ← رجوع
            </button>
          </div>

          {/* Printable worksheet */}
          <div className="max-w-3xl mx-auto px-4 print:px-8 print:max-w-none">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 print:rounded-none print:border-0 print:p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">ب</div>
                  <span className="font-bold text-gray-900 text-xl">بُنيان</span>
                </div>
                <div className="text-sm text-gray-500">
                  ورقة تدريب — {getSkillAreaLabel(skillArea)} — {ageGroup} سنوات
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3">
                <div className="text-sm text-gray-700">الاسم: <span className="inline-block border-b border-gray-400 w-32 ms-2"> </span></div>
                <div className="text-sm text-gray-700">التاريخ: <span className="inline-block border-b border-gray-400 w-24 ms-2"> </span></div>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-5">
              {questions.map((q, qi) => (
                <div key={q.id} className="bg-white rounded-2xl border border-gray-200 p-5 print:rounded-none print:border-b print:border-gray-300 print:pb-4">
                  <p className="font-semibold text-gray-900 mb-3 text-base">
                    <span className="text-emerald-600 font-bold ml-2">{qi + 1}.</span>
                    {q.questionTextAr}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs font-bold flex-shrink-0">{LETTERS[oi]}</span>
                        {opt.text}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Answer key */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mt-6 print:rounded-none">
              <p className="font-bold text-amber-800 mb-3 text-sm">🔑 مفتاح الإجابات — لولي الأمر</p>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, qi) => (
                  <div key={q.id} className="text-center">
                    <div className="text-xs text-gray-500">{qi + 1}</div>
                    <div className="font-bold text-emerald-700 text-sm">{LETTERS[q.correctOptionIndex]}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center text-gray-400 text-xs mt-4 mb-8 print:mb-2">
              bunyan.app — كل بُنيان يبدأ بلبنة
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
