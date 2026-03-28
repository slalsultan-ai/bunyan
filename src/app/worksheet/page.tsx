'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AgeGroup, SkillArea, Difficulty, PublicQuestion } from '@/types';
import { getSkillAreaLabel, getAgeGroupLabel } from '@/lib/utils';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';

type QuestionCount = 10 | 15 | 20;
const LETTERS = ['أ', 'ب', 'ج', 'د'];
const DIFFICULTY_LABELS: Record<string, string> = { easy: 'سهل', medium: 'متوسط', hard: 'صعب', mixed: 'متنوع' };

function WorksheetContent() {
  const params = useSearchParams();
  const [ageGroup, setAgeGroup] = useState<AgeGroup>((params.get('age') as AgeGroup) || '6-9');
  const [skillArea, setSkillArea] = useState<SkillArea>((params.get('skill') as SkillArea) || 'mixed');
  const [difficulty, setDifficulty] = useState<Difficulty>('mixed');
  const [count, setCount] = useState<QuestionCount>(10);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [today, setToday] = useState('');

  useEffect(() => {
    const d = new Date();
    setToday(`${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`);
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/worksheet/questions?age_group=${ageGroup}&skill_area=${skillArea}&difficulty=${difficulty}&count=${count}`);
      const data = await res.json();
      setQuestions(data.questions || []);
      setPreviewing(true);
    } catch {
      alert('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (!previewing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
        {/* nav */}
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <Logo size="sm" />
            <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">الرئيسية</Link>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-10">
          {/* motivation header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-sm">
              🖨️
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ورقة تدريب للطباعة</h1>
            <p className="text-gray-600 text-sm max-w-xs mx-auto leading-relaxed">
              الطباعة والكتابة بالقلم تُعمّق الفهم وتُقوّي الذاكرة — اطبع لطفلك وشجّعه!
            </p>
          </div>

          {/* tip banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3 items-start">
            <span className="text-xl shrink-0">💡</span>
            <p className="text-amber-800 text-xs leading-relaxed">
              <strong>نصيحة:</strong> اجلس مع طفلك، دعه يحل الأسئلة بالقلم، ثم راجعوا الأداء لاحقاً داخل التدريب التفاعلي لنفس المهارة.
            </p>
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
                {(['easy', 'medium', 'hard', 'mixed'] as Difficulty[]).map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${difficulty === d ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300'}`}>
                    {DIFFICULTY_LABELS[d]}
                  </button>
                ))}
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
              className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base shadow-lg shadow-emerald-100">
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري التوليد...
                </>
              ) : (
                <>🖨️ توليد ورقة العمل</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════
  // Preview + Print mode
  // ═══════════════════════════════
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Print controls — hidden on print */}
      <div className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={handlePrint}
            className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-md shadow-emerald-100">
            🖨️ طباعة / حفظ PDF
          </button>
          <button onClick={() => { setPreviewing(false); setQuestions([]); }}
            className="bg-gray-100 text-gray-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-200 transition-colors">
            ← تعديل
          </button>
          <span className="text-sm text-gray-500 mr-auto">
            {questions.length} سؤال — {getAgeGroupLabel(ageGroup)} — {getSkillAreaLabel(skillArea)}
          </span>
        </div>
      </div>

      {/* ═══ PRINTABLE WORKSHEET ═══ */}
      <div className="max-w-3xl mx-auto py-6 px-4 print:py-0 print:px-0 print:max-w-none">
        <div className="bg-white shadow-xl print:shadow-none rounded-2xl overflow-hidden print:rounded-none">

          {/* ── Header (green bar) ── */}
          <div className="worksheet-header bg-emerald-600 text-white px-8 py-5 print:px-10 print:py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white font-extrabold text-xl">ب</div>
                <div>
                  <div className="font-extrabold text-xl tracking-wide">بُنيان</div>
                  <div className="text-emerald-100 text-xs">منصة تنمية المهارات</div>
                </div>
              </div>
              <div className="text-left text-xs text-emerald-100 leading-relaxed">
                <div className="font-bold text-white text-sm mb-0.5">ورقة تدريب</div>
                <div>{getAgeGroupLabel(ageGroup)}</div>
                <div>{getSkillAreaLabel(skillArea)} — {DIFFICULTY_LABELS[difficulty]}</div>
              </div>
            </div>
          </div>

          {/* ── Student info strip ── */}
          <div className="bg-emerald-50 border-b-2 border-emerald-100 px-8 py-4 print:px-10">
            <div className="grid grid-cols-2 gap-6 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-600 shrink-0">👤 الاسم:</span>
                <span className="flex-1 border-b-2 border-gray-400 border-dotted pb-0.5 min-h-[22px]"> </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-600 shrink-0">📅 التاريخ:</span>
                <span className="flex-1 border-b-2 border-gray-400 border-dotted pb-0.5">{today}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-600 shrink-0">⭐ الدرجة:</span>
                <span className="flex-1 border-b-2 border-gray-400 border-dotted pb-0.5 min-h-[22px]"> </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-600 shrink-0">⏱️ الوقت:</span>
                <span className="flex-1 border-b-2 border-gray-400 border-dotted pb-0.5 min-h-[22px]"> </span>
              </div>
            </div>
          </div>

          {/* ── Instructions ── */}
          <div className="px-8 pt-5 pb-2 print:px-10 border-b border-gray-100">
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 leading-relaxed">
              📝 <strong className="text-gray-700">التعليمات:</strong> اقرأ كل سؤال بتأنٍّ ثم ضع دائرة ◯ حول رمز الإجابة الصحيحة (أ، ب، ج، د).
            </p>
          </div>

          {/* ── Questions ── */}
          <div className="px-8 py-5 print:px-10 space-y-0">
            {questions.map((q, qi) => (
              <div key={q.id}
                className="worksheet-question border-b border-gray-100 last:border-0 py-5">
                {/* Question text */}
                <div className="flex gap-3 mb-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-extrabold mt-0.5 print:bg-emerald-600 print:text-white">
                    {qi + 1}
                  </span>
                  <div className="flex-1">
                    {q.questionType === 'audio' ? (
                      <p className="text-gray-900 font-semibold text-base leading-relaxed">
                        🔊 {q.questionTextAr}
                      </p>
                    ) : (
                      <p className="text-gray-900 font-semibold text-base leading-relaxed whitespace-pre-line">
                        {q.questionTextAr}
                      </p>
                    )}
                    {q.questionImageUrl && q.questionType !== 'audio' && (
                      <div className="mt-2">
                        <img
                          src={q.questionImageUrl}
                          alt="صورة السؤال"
                          className="max-h-36 object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Options — 2×2 grid */}
                <div className="grid grid-cols-2 gap-2 mr-10">
                  {q.options.map((opt, oi) => (
                    <div key={oi}
                      className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 print:bg-transparent print:border-gray-300">
                      {/* Bubble to circle */}
                      <span className="shrink-0 w-7 h-7 rounded-full border-2 border-emerald-500 flex items-center justify-center text-xs font-bold text-emerald-700 print:border-emerald-600">
                        {LETTERS[oi]}
                      </span>
                      <span className="text-gray-800 text-sm leading-tight">{opt.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mx-8 mb-8 print:mx-10 mt-2 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 print:rounded-none">
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">🛡️</span>
              <div className="text-right">
                <p className="font-bold text-sky-900 text-sm mb-1">النسخة العامة لا تتضمن مفتاح الإجابات</p>
                <p className="text-sky-800 text-xs leading-relaxed">
                  للحفاظ على جودة بنك الأسئلة، اطبع الورقة أولاً ثم راجع نفس المهارة داخل التدريب التفاعلي إذا رغبت في التحقق من الحلول خطوة بخطوة.
                </p>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="bg-emerald-600 print:bg-emerald-600 px-8 py-3 print:px-10 flex items-center justify-between">
            <span className="text-emerald-100 text-xs">bunyan.app — كل بُنيان يبدأ بلبنة</span>
            <span className="text-emerald-100 text-xs">© {new Date().getFullYear()}</span>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function WorksheetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <WorksheetContent />
    </Suspense>
  );
}
