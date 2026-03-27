'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface QuestionFormData {
  ageGroup: string; skillArea: string; subSkill: string;
  difficulty: string; questionType: string; questionTextAr: string;
  questionImageUrl: string; options: string[]; correctOptionIndex: number;
  explanationAr: string; tags: string; isActive: boolean;
}

const DEFAULTS: QuestionFormData = {
  ageGroup: '4-5', skillArea: 'quantitative', subSkill: '', difficulty: 'easy',
  questionType: 'text', questionTextAr: '', questionImageUrl: '',
  options: ['', '', '', ''], correctOptionIndex: 0, explanationAr: '', tags: '', isActive: true,
};

export default function QuestionForm({ initial, id }: { initial?: Partial<QuestionFormData & { options: { text: string }[] }>; id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<QuestionFormData>(() => {
    if (!initial) return DEFAULTS;
    return {
      ...DEFAULTS, ...initial,
      options: initial.options ? initial.options.map((o: { text: string } | string) => typeof o === 'string' ? o : o.text) : DEFAULTS.options,
      tags: Array.isArray(initial.tags) ? (initial.tags as string[]).join(', ') : (initial.tags || ''),
      questionImageUrl: initial.questionImageUrl || '',
      isActive: initial.isActive !== undefined ? !!initial.isActive : true,
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof QuestionFormData, val: unknown) => setForm(f => ({ ...f, [key]: val }));
  const setOption = (i: number, val: string) => setForm(f => { const opts = [...f.options]; opts[i] = val; return { ...f, options: opts }; });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.options.some(o => !o.trim())) return setError('يجب ملء جميع الخيارات الأربعة');
    if (!form.questionTextAr.trim()) return setError('نص السؤال مطلوب');
    if (!form.explanationAr.trim()) return setError('الشرح مطلوب');

    setSaving(true);
    const body = { ...form, options: form.options.map(t => ({ text: t })), tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
    const url = id ? `/api/admin/questions/${id}` : '/api/admin/questions';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) { router.push('/admin/questions'); router.refresh(); }
    else { const d = await res.json(); setError(d.error || 'خطأ في الحفظ'); }
  };

  const FIELD = 'w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:border-emerald-500 focus:outline-none transition-colors text-sm';
  const LBL = 'block text-sm font-semibold text-gray-700 mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LBL}>الفئة العمرية</label>
          <select value={form.ageGroup} onChange={e => set('ageGroup', e.target.value)} className={FIELD}>
            <option value="4-5">4-5 سنوات</option>
            <option value="6-9">6-9 سنوات</option>
            <option value="10-12">10-12 سنة</option>
          </select>
        </div>
        <div>
          <label className={LBL}>المهارة الرئيسية</label>
          <select value={form.skillArea} onChange={e => set('skillArea', e.target.value)} className={FIELD}>
            <option value="quantitative">كمي</option>
            <option value="verbal">لفظي</option>
            <option value="logical_patterns">تفكير منطقي</option>
          </select>
        </div>
        <div>
          <label className={LBL}>المهارة الفرعية</label>
          <input value={form.subSkill} onChange={e => set('subSkill', e.target.value)} placeholder="مثال: العد، الأنماط..." className={FIELD} />
        </div>
        <div>
          <label className={LBL}>الصعوبة</label>
          <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)} className={FIELD}>
            <option value="easy">سهل</option>
            <option value="medium">متوسط</option>
            <option value="hard">صعب</option>
          </select>
        </div>
      </div>

      <div>
        <label className={LBL}>نوع السؤال</label>
        <div className="flex gap-3">
          {[{ v: 'text', l: '📝 نصي' }, { v: 'audio', l: '🔊 صوتي' }, { v: 'image', l: '🖼️ صوري' }].map(t => (
            <button key={t.v} type="button" onClick={() => set('questionType', t.v)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${form.questionType === t.v ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={LBL}>نص السؤال (عربي)</label>
        <textarea value={form.questionTextAr} onChange={e => set('questionTextAr', e.target.value)}
          rows={3} placeholder="اكتب السؤال هنا..." className={`${FIELD} resize-none`} />
        {form.questionType === 'audio' && (
          <p className="text-xs text-blue-600 mt-1">💡 هذا النص سيُقرأ بالصوت تلقائياً للطفل</p>
        )}
      </div>

      {form.questionType === 'image' && (
        <div>
          <label className={LBL}>رابط الصورة</label>
          <input value={form.questionImageUrl} onChange={e => set('questionImageUrl', e.target.value)}
            placeholder="/q-images/اسم-الصورة.svg" className={FIELD} />
          {form.questionImageUrl && (
            <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200 inline-block">
              <img src={form.questionImageUrl} alt="معاينة" className="max-h-24 object-contain" />
            </div>
          )}
        </div>
      )}

      <div>
        <label className={LBL}>الخيارات الأربعة</label>
        <div className="grid grid-cols-2 gap-3">
          {form.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button type="button" onClick={() => set('correctOptionIndex', i)}
                className={`w-8 h-8 rounded-full border-2 shrink-0 flex items-center justify-center text-sm font-bold transition-colors ${form.correctOptionIndex === i ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 text-gray-500 hover:border-emerald-400'}`}>
                {['أ', 'ب', 'ج', 'د'][i]}
              </button>
              <input value={opt} onChange={e => setOption(i, e.target.value)}
                placeholder={`الخيار ${['أ', 'ب', 'ج', 'د'][i]}`} className={`${FIELD} flex-1`} />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">اضغط على الدائرة لتحديد الإجابة الصحيحة — الإجابة الصحيحة الآن: {['أ', 'ب', 'ج', 'د'][form.correctOptionIndex]}</p>
      </div>

      <div>
        <label className={LBL}>الشرح</label>
        <textarea value={form.explanationAr} onChange={e => set('explanationAr', e.target.value)}
          rows={2} placeholder="اشرح سبب الإجابة الصحيحة..." className={`${FIELD} resize-none`} />
      </div>

      <div>
        <label className={LBL}>التصنيفات (tags) — اختياري</label>
        <input value={form.tags} onChange={e => set('tags', e.target.value)}
          placeholder="مثال: audio, counting, pattern" className={FIELD} />
      </div>

      {id && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => set('isActive', !form.isActive)}
            className={`w-12 h-7 rounded-full transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}>
            <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${form.isActive ? 'translate-x-5' : ''}`} />
          </button>
          <label className="text-sm font-semibold text-gray-700">{form.isActive ? 'السؤال نشط' : 'السؤال معطّل'}</label>
        </div>
      )}

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          {saving ? 'جاري الحفظ...' : id ? '💾 حفظ التعديلات' : '➕ إضافة السؤال'}
        </button>
        <button type="button" onClick={() => router.push('/admin/questions')}
          className="bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors">
          إلغاء
        </button>
      </div>
    </form>
  );
}
