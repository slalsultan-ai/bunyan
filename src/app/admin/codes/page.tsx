'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Code {
  id: number;
  code: string;
  institutionName: string;
  institutionType: string;
  maxUsers: number;
  currentUsers: number;
  durationDays: number;
  status: string;
  notes: string | null;
  createdAt: string;
  expiresAt: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  school: 'مدرسة',
  training_center: 'مركز تدريب',
  charity: 'جمعية خيرية',
  other: 'أخرى',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-600',
  paused: 'text-amber-600',
  expired: 'text-red-600',
};

const STATUS_ICONS: Record<string, string> = {
  active: '\u{1F7E2}',
  paused: '\u{1F7E1}',
  expired: '\u{1F534}',
};

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: '', institutionName: '', institutionType: 'school',
    maxUsers: '50', durationDays: '30', notes: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchCodes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/codes');
      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.code.trim() || !createForm.institutionName.trim()) {
      setCreateError('الكود واسم المؤسسة مطلوبان');
      return;
    }
    setCreateLoading(true);
    setCreateError('');
    try {
      const res = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: createForm.code,
          institutionName: createForm.institutionName,
          institutionType: createForm.institutionType,
          maxUsers: Number(createForm.maxUsers) || 50,
          durationDays: Number(createForm.durationDays) || 30,
          notes: createForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || 'خطأ'); }
      else {
        setShowCreate(false);
        setCreateForm({ code: '', institutionName: '', institutionType: 'school', maxUsers: '50', durationDays: '30', notes: '' });
        fetchCodes();
      }
    } catch { setCreateError('خطأ في الاتصال'); }
    setCreateLoading(false);
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    await fetch(`/api/admin/codes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchCodes();
  };

  const activeCodes = codes.filter(c => c.status === 'active');
  const otherCodes = codes.filter(c => c.status !== 'active');

  if (loading) {
    return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إدارة أكواد المؤسسات</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          + إنشاء كود جديد
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-bold text-gray-900 mb-2">إنشاء كود جديد</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الكود *</label>
              <input type="text" value={createForm.code}
                onChange={e => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                placeholder="مثال: SCHOOL-NOOR"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المؤسسة *</label>
              <input type="text" value={createForm.institutionName}
                onChange={e => setCreateForm({ ...createForm, institutionName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نوع المؤسسة</label>
              <select value={createForm.institutionType}
                onChange={e => setCreateForm({ ...createForm, institutionType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">عدد المستخدمين</label>
              <input type="number" value={createForm.maxUsers}
                onChange={e => setCreateForm({ ...createForm, maxUsers: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المدة (بالأيام)</label>
              <input type="number" value={createForm.durationDays}
                onChange={e => setCreateForm({ ...createForm, durationDays: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <p className="text-xs text-gray-400 mt-1">30 = شهر، 90 = 3 أشهر، 365 = سنة</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
              <input type="text" value={createForm.notes}
                onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          {createError && <p className="text-red-600 text-sm">{createError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={createLoading}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {createLoading ? '...' : 'إنشاء الكود'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="text-gray-500 px-4 py-2 rounded-lg text-sm hover:bg-gray-100">إلغاء</button>
          </div>
        </form>
      )}

      {/* Active Codes */}
      {activeCodes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-500 mb-3">الأكواد النشطة ({activeCodes.length})</h2>
          <div className="space-y-3">
            {activeCodes.map(c => (
              <CodeCard key={c.id} code={c} onStatusChange={handleStatusChange} />
            ))}
          </div>
        </div>
      )}

      {/* Other Codes */}
      {otherCodes.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 mb-3">أكواد أخرى ({otherCodes.length})</h2>
          <div className="space-y-3">
            {otherCodes.map(c => (
              <CodeCard key={c.id} code={c} onStatusChange={handleStatusChange} />
            ))}
          </div>
        </div>
      )}

      {codes.length === 0 && (
        <div className="text-center text-gray-500 py-12">لا توجد أكواد بعد</div>
      )}
    </div>
  );
}

function CodeCard({ code: c, onStatusChange }: { code: Code; onStatusChange: (id: number, status: string) => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span>{STATUS_ICONS[c.status] || ''}</span>
            <span className="font-mono font-bold text-gray-900">{c.code}</span>
            <span className={`text-xs font-medium ${STATUS_COLORS[c.status] || 'text-gray-500'}`}>{c.status}</span>
          </div>
          <p className="text-sm text-gray-600">{c.institutionName} | {TYPE_LABELS[c.institutionType] || c.institutionType}</p>
          <p className="text-xs text-gray-400 mt-1">
            المستخدمين: {c.currentUsers}/{c.maxUsers}
            {c.expiresAt && ` | ينتهي: ${new Date(c.expiresAt).toLocaleDateString('ar-SA')}`}
            {` | المدة: ${c.durationDays} يوم`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/admin/codes/${c.id}/users`}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
            المستخدمين
          </Link>
          {c.status === 'active' ? (
            <button onClick={() => onStatusChange(c.id, 'paused')}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
              إيقاف
            </button>
          ) : c.status === 'paused' ? (
            <button onClick={() => onStatusChange(c.id, 'active')}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
              تفعيل
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
