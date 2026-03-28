'use client';
import { useEffect, useState } from 'react';
import type { HeroContent, FaqItem } from '@/lib/content';

type Tab = 'hero' | 'faq';

export default function ContentPage() {
  const [tab, setTab] = useState<Tab>('hero');
  const [hero, setHero] = useState<HeroContent | null>(null);
  const [faq, setFaq] = useState<FaqItem[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/content')
      .then(r => r.json())
      .then(data => {
        setHero(data.hero);
        setFaq(data.faq);
      })
      .catch(() => setError('تعذّر تحميل المحتوى'));
  }, []);

  async function save(key: 'hero' | 'faq', value: unknown) {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        let msg = 'حدث خطأ';
        try { const d = await res.json(); msg = d.error || msg; } catch { /* non-JSON error body */ }
        setError(msg);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError('فشل الاتصال بالخادم');
    } finally {
      setSaving(false);
    }
  }

  if (!hero || !faq) {
    return (
      <div className="p-8 flex items-center justify-center text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full ml-3" />
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">تعديل المحتوى</h1>
        <p className="text-gray-500 text-sm mt-1">تحرير نصوص صفحة الهبوط والأسئلة الشائعة</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(['hero', 'faq'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'hero' ? 'قسم البطل' : 'الأسئلة الشائعة'}
          </button>
        ))}
      </div>

      {/* Status */}
      {saved && (
        <div className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-200">
          ✓ تم الحفظ بنجاح
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-2 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Hero Tab */}
      {tab === 'hero' && (
        <HeroEditor
          hero={hero}
          onChange={setHero}
          onSave={() => save('hero', hero)}
          saving={saving}
        />
      )}

      {/* FAQ Tab */}
      {tab === 'faq' && (
        <FaqEditor
          items={faq}
          onChange={setFaq}
          onSave={() => save('faq', faq)}
          saving={saving}
        />
      )}
    </div>
  );
}

function HeroEditor({
  hero,
  onChange,
  onSave,
  saving,
}: {
  hero: HeroContent;
  onChange: (h: HeroContent) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const fields: { key: keyof HeroContent; label: string; multiline?: boolean }[] = [
    { key: 'badge', label: 'نص الشارة العلوية' },
    { key: 'title', label: 'العنوان الرئيسي' },
    { key: 'titleHighlight', label: 'النص المميز (السطر الثاني)' },
    { key: 'subtitle', label: 'النص التوضيحي (يدعم HTML)', multiline: true },
    { key: 'ctaPrimary', label: 'نص زر البداية' },
  ];

  return (
    <div className="space-y-5">
      {fields.map(({ key, label, multiline }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
          {multiline ? (
            <textarea
              rows={3}
              value={hero[key]}
              onChange={e => onChange({ ...hero, [key]: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none resize-none"
              dir="rtl"
            />
          ) : (
            <input
              type="text"
              value={hero[key]}
              onChange={e => onChange({ ...hero, [key]: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none"
              dir="rtl"
            />
          )}
        </div>
      ))}
      <SaveButton onSave={onSave} saving={saving} />
    </div>
  );
}

function FaqEditor({
  items,
  onChange,
  onSave,
  saving,
}: {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const update = (i: number, field: keyof FaqItem, value: string) => {
    const next = items.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item
    );
    onChange(next);
  };

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const add = () => onChange([...items, { q: '', a: '' }]);

  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="border border-gray-200 rounded-2xl p-4 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">سؤال {i + 1}</span>
            <div className="flex gap-1">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                title="للأعلى"
              >↑</button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                title="للأسفل"
              >↓</button>
              <button
                onClick={() => remove(i)}
                className="px-2 py-1 text-xs text-red-400 hover:text-red-600"
              >حذف</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">السؤال</label>
            <input
              type="text"
              value={item.q}
              onChange={e => update(i, 'q', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none"
              dir="rtl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">الجواب</label>
            <textarea
              rows={2}
              value={item.a}
              onChange={e => update(i, 'a', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none resize-none"
              dir="rtl"
            />
          </div>
        </div>
      ))}

      <button
        onClick={add}
        className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-3 text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
      >
        + إضافة سؤال جديد
      </button>

      <SaveButton onSave={onSave} saving={saving} />
    </div>
  );
}

function SaveButton({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="pt-2">
      <button
        onClick={onSave}
        disabled={saving}
        className="bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors text-sm"
      >
        {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
      </button>
    </div>
  );
}
