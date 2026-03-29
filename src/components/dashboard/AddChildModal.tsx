'use client';
import { useState, useEffect } from 'react';

interface Child {
  id: string;
  name: string;
  age: number;
  ageGroup: string;
}

interface AddChildModalProps {
  open: boolean;
  editChild?: Child | null;
  onClose: () => void;
  onSaved: (child: Child) => void;
}

export default function AddChildModal({ open, editChild, onClose, onSaved }: AddChildModalProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(editChild?.name || '');
      setAge(editChild?.age?.toString() || '');
      setError('');
    }
  }, [open, editChild]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !age) return;
    const ageNum = Number(age);
    if (ageNum < 4 || ageNum > 12) { setError('العمر بين ٤ و١٢'); return; }

    setLoading(true);
    setError('');
    try {
      const url = editChild ? `/api/children/${editChild.id}` : '/api/children';
      const method = editChild ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), age: ageNum }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'حدث خطأ'); return; }
      onSaved(data.child);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-5">
          {editChild ? 'تعديل بيانات الطفل' : 'إضافة طفل جديد'}
        </h2>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الطفل</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثال: أحمد"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">العمر</label>
            <select
              value={age}
              onChange={e => setAge(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none bg-white"
              required
            >
              <option value="">اختر العمر</option>
              {Array.from({ length: 9 }, (_, i) => i + 4).map(a => (
                <option key={a} value={a}>{a} سنوات</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !age}
              className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : editChild ? 'حفظ التعديل' : 'إضافة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
