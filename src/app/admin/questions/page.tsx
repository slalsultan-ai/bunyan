'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Question {
  id: string; ageGroup: string; skillArea: string; subSkill: string;
  difficulty: string; questionType: string; questionTextAr: string;
  options: { text: string; imageUrl?: string }[];
  correctOptionIndex: number; explanationAr: string;
  questionImageUrl?: string; isActive: boolean; createdAt: string;
}

const AGES = ['', '4-5', '6-9', '10-12'];
const SKILLS = ['', 'quantitative', 'verbal', 'logical_patterns'];
const DIFFS = ['', 'easy', 'medium', 'hard'];
const TYPES = ['', 'text', 'audio', 'image'];
const SKILL_L: Record<string, string> = { quantitative: 'كمي', verbal: 'لفظي', logical_patterns: 'منطقي' };
const DIFF_L: Record<string, string> = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
const TYPE_L: Record<string, string> = { text: '📝', audio: '🔊', image: '🖼️' };
const TYPE_LBL: Record<string, string> = { text: 'نصي', audio: 'صوتي', image: 'صوري' };

function PreviewModal({ q, onClose }: { q: Question; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" dir="rtl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">{TYPE_L[q.questionType]}</span>
            <h3 className="font-bold text-gray-900">معاينة السؤال</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2 flex-wrap text-xs">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg font-semibold">{q.ageGroup} سنوات</span>
            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-lg font-semibold">{SKILL_L[q.skillArea] || q.skillArea}</span>
            <span className={`px-2 py-0.5 rounded-lg font-semibold ${q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
              {DIFF_L[q.difficulty]}
            </span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{q.subSkill}</span>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            {q.questionType === 'audio' && (
              <div className="flex items-center gap-2 mb-2 text-blue-600 text-sm font-semibold">
                <span>🔊</span><span>سؤال صوتي — يُقرأ للطفل</span>
              </div>
            )}
            {q.questionImageUrl && (
              <img src={q.questionImageUrl} alt="question" className="w-full max-h-40 object-contain rounded-lg mb-3 bg-white" />
            )}
            <p className="text-gray-900 font-semibold text-base leading-relaxed">{q.questionTextAr}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {q.options.map((opt, i) => (
              <div key={i} className={`rounded-xl border-2 p-3 text-center font-semibold text-sm ${
                i === q.correctOptionIndex
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}>
                {i === q.correctOptionIndex && <span className="text-xs block text-emerald-500 mb-0.5">✓ صحيحة</span>}
                {opt.imageUrl
                  ? <img src={opt.imageUrl} alt={`opt${i}`} className="h-12 object-contain mx-auto" />
                  : opt.text}
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            <span className="font-bold">الشرح: </span>{q.explanationAr}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ImportResult {
  inserted: number;
  skipped: number;
  total: number;
}

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setStatus('loading');
    setErrors([]);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors || [data.error || 'خطأ غير معروف']);
        setStatus('error');
      } else {
        setResult(data);
        setStatus('done');
      }
    } catch (e) {
      setErrors([e instanceof SyntaxError ? 'ملف JSON غير صالح' : 'خطأ في رفع الملف']);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" dir="rtl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">استيراد أسئلة (JSON)</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {status === 'idle' && (
            <>
              <p className="text-sm text-gray-500">
                ارفع ملف JSON بنفس تنسيق التصدير. سيتم تخطي الأسئلة ذات المعرّف المكرر.
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-8 text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors text-sm font-semibold"
              >
                📁 اختر ملف JSON
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <p className="text-xs text-gray-400 text-center">الحد الأقصى: 500 سؤال لكل عملية</p>
            </>
          )}

          {status === 'loading' && (
            <div className="py-8 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">جاري معالجة {fileName}...</p>
            </div>
          )}

          {status === 'done' && result && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <div className="text-3xl font-extrabold text-emerald-700">+{result.inserted}</div>
                <div className="text-sm text-emerald-600 font-semibold mt-1">سؤال أُضيف بنجاح</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="font-bold text-gray-700">{result.total}</div>
                  <div className="text-gray-500 text-xs">إجمالي في الملف</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="font-bold text-gray-700">{result.skipped}</div>
                  <div className="text-gray-500 text-xs">مكرر (تم تخطيه)</div>
                </div>
              </div>
              <button
                onClick={() => { onDone(); onClose(); }}
                className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                ✓ حسناً — تحديث القائمة
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="font-bold text-red-700 text-sm mb-2">❌ فشل الاستيراد</p>
                <ul className="space-y-1">
                  {errors.map((e, i) => (
                    <li key={i} className="text-red-600 text-xs">{e}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => { setStatus('idle'); setErrors([]); setFileName(''); if (fileRef.current) fileRef.current.value = ''; }}
                className="w-full bg-gray-100 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-200 transition-colors"
              >
                حاول مرة أخرى
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [preview, setPreview] = useState<Question | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [filters, setFilters] = useState({ age_group: '', skill_area: '', difficulty: '', type: '', active: 'all', search: '' });

  const load = useCallback(async (p = page) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(p),
      ...(filters.age_group && { age_group: filters.age_group }),
      ...(filters.skill_area && { skill_area: filters.skill_area }),
      ...(filters.difficulty && { difficulty: filters.difficulty }),
      ...(filters.type && { type: filters.type }),
      ...(filters.active !== 'all' && { active: filters.active }),
      ...(filters.search && { search: filters.search }),
    });
    const res = await fetch(`/api/admin/questions?${params}`);
    const data = await res.json();
    setQuestions(data.questions || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setLoading(false);
  }, [filters, page]);

  useEffect(() => { load(1); setPage(1); }, [filters]);
  useEffect(() => { load(page); }, [page]);

  const toggleActive = async (q: Question) => {
    await fetch(`/api/admin/questions/${q.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !q.isActive }) });
    load(page);
  };

  const deleteQ = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال نهائياً؟')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'فشل حذف السؤال');
      } else {
        load(page);
      }
    } catch {
      alert('فشل الاتصال بالخادم');
    } finally {
      setDeleting(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const res = await fetch('/api/admin/questions/export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bunyan-questions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const setFilter = (key: string, val: string) => setFilters(f => ({ ...f, [key]: val }));

  return (
    <div className="p-6 space-y-5">
      {preview && <PreviewModal q={preview} onClose={() => setPreview(null)} />}
      {importing && <ImportModal onClose={() => setImporting(false)} onDone={() => load(page)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة الأسئلة</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} سؤال</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/questions/health"
            className="bg-white border border-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm">
            🩺 صحة الأسئلة
          </Link>
          <button onClick={() => setImporting(true)}
            className="bg-white border border-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm">
            ⬆️ استيراد
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="bg-white border border-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm disabled:opacity-50">
            {exporting ? '⏳' : '⬇️'} تصدير
          </button>
          <Link href="/admin/questions/new"
            className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm">
            ➕ سؤال جديد
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="🔍 بحث..."
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none col-span-2 lg:col-span-2" />
          {[
            { key: 'age_group', opts: AGES, label: 'الفئة العمرية', labels: {} as Record<string, string> },
            { key: 'skill_area', opts: SKILLS, label: 'المهارة', labels: SKILL_L },
            { key: 'difficulty', opts: DIFFS, label: 'الصعوبة', labels: DIFF_L },
            { key: 'type', opts: TYPES, label: 'النوع', labels: TYPE_LBL },
          ].map(f => (
            <select key={f.key} value={filters[f.key as keyof typeof filters]}
              onChange={e => setFilter(f.key, e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
              <option value="">{f.label}</option>
              {f.opts.filter(Boolean).map(o => <option key={o} value={o}>{f.labels[o] || o}</option>)}
            </select>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          {(['all', 'true', 'false'] as const).map(v => (
            <button key={v} onClick={() => setFilter('active', v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filters.active === v ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {v === 'all' ? 'الكل' : v === 'true' ? '✅ نشط' : '⛔ معطّل'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold w-12">#</th>
                  <th className="px-4 py-3 text-right font-semibold">السؤال</th>
                  <th className="px-4 py-3 text-right font-semibold">النوع</th>
                  <th className="px-4 py-3 text-right font-semibold">الفئة</th>
                  <th className="px-4 py-3 text-right font-semibold">المهارة</th>
                  <th className="px-4 py-3 text-right font-semibold">الصعوبة</th>
                  <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {questions.map((q, i) => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * 25 + i + 1}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-gray-800 text-sm truncate">{q.questionTextAr}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{q.subSkill}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-lg" title={TYPE_LBL[q.questionType]}>{TYPE_L[q.questionType] || '?'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{q.ageGroup}</td>
                    <td className="px-4 py-3 text-gray-600">{SKILL_L[q.skillArea] || q.skillArea}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {DIFF_L[q.difficulty] || q.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(q)}
                        className={`w-10 h-6 rounded-full transition-colors ${q.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                        <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${q.isActive ? 'translate-x-4' : ''}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPreview(q)}
                          className="text-purple-600 hover:text-purple-800 text-xs font-semibold">معاينة</button>
                        <button onClick={() => router.push(`/admin/questions/${q.id}`)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold">تعديل</button>
                        <button onClick={() => deleteQ(q.id)} disabled={deleting === q.id}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold disabled:opacity-40">حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {questions.length === 0 && (
              <p className="text-center text-gray-400 py-12">لا توجد أسئلة تطابق الفلتر</p>
            )}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-1.5 bg-gray-100 rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-gray-200">
              ← السابق
            </button>
            <span className="text-sm text-gray-500">صفحة {page} من {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-4 py-1.5 bg-gray-100 rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-gray-200">
              التالي →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
