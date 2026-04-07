'use client';

import { useState, useEffect, useCallback } from 'react';

interface GrantRequest {
  id: number;
  requestNumber: string;
  institutionName: string;
  institutionType: string;
  institutionTypeOther: string | null;
  studentCount: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string | null;
  status: string;
  adminNotes: string | null;
  reviewedAt: string | null;
  generatedCode: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  school: 'مدرسة',
  training_center: 'مركز تدريب',
  charity: 'جمعية خيرية',
  other: 'أخرى',
};

export default function AdminGrantsPage() {
  const [requests, setRequests] = useState<GrantRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/grants');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const pending = requests.filter(r => r.status === 'pending');
  const reviewed = requests.filter(r => r.status !== 'pending');

  if (loading) return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">طلبات المنح</h1>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-500 mb-3">طلبات جديدة ({pending.length})</h2>
          <div className="space-y-4">
            {pending.map(r => (
              <PendingGrantCard key={r.id} request={r} onAction={fetchRequests} />
            ))}
          </div>
        </div>
      )}

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 mb-3">طلبات سابقة ({reviewed.length})</h2>
          <div className="space-y-2">
            {reviewed.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                <span className={r.status === 'approved' ? 'text-emerald-600' : 'text-red-500'}>
                  {r.status === 'approved' ? '\u2713' : '\u2717'}
                </span>
                <span className="font-mono text-sm text-gray-600">{r.requestNumber}</span>
                <span className="text-sm text-gray-700">{r.institutionName}</span>
                <span className={`text-xs font-medium ${r.status === 'approved' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {r.status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}
                </span>
                {r.generatedCode && (
                  <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">{r.generatedCode}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <div className="text-center text-gray-500 py-12">لا توجد طلبات بعد</div>
      )}
    </div>
  );
}

function PendingGrantCard({ request: r, onAction }: { request: GrantRequest; onAction: () => void }) {
  const [adminNotes, setAdminNotes] = useState('');
  const [code, setCode] = useState('');
  const [durationDays, setDurationDays] = useState('90');
  const [maxUsers, setMaxUsers] = useState(String(r.studentCount || 50));
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAction = async (action: 'approve' | 'reject') => {
    if (action === 'approve' && !code.trim()) {
      setError('أدخل الكود');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/grants/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          adminNotes: adminNotes || undefined,
          code: action === 'approve' ? code : undefined,
          durationDays: action === 'approve' ? Number(durationDays) || 90 : undefined,
          maxUsers: action === 'approve' ? Number(maxUsers) || 50 : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'خطأ'); }
      else { onAction(); }
    } catch { setError('خطأ في الاتصال'); }
    setActionLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-amber-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-bold text-gray-900">{r.requestNumber}</span>
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">جديد</span>
          </div>
          <p className="text-sm text-gray-700">{r.institutionName} | {TYPE_LABELS[r.institutionType] || r.institutionType} | {r.studentCount} طالب</p>
          <p className="text-sm text-gray-600 mt-1">{r.contactName} | {r.contactPhone}</p>
          <p className="text-xs text-gray-400 mt-1">{r.contactEmail} | {new Date(r.createdAt).toLocaleDateString('ar-SA')}</p>
          {r.notes && <p className="text-sm text-gray-500 mt-2 bg-gray-50 px-3 py-2 rounded-lg">{r.notes}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ملاحظات الأدمن</label>
          <input type="text" value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">كود (لو موافق)</label>
          <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="مثال: CHARITY-HELP" dir="ltr"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">المدة (بالأيام)</label>
          <input type="number" value={durationDays} onChange={e => setDurationDays(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">عدد المستخدمين</label>
          <input type="number" value={maxUsers} onChange={e => setMaxUsers(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <div className="flex gap-2">
        <button onClick={() => handleAction('approve')} disabled={actionLoading}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
          {actionLoading ? '...' : 'موافقة + إنشاء كود'}
        </button>
        <button onClick={() => handleAction('reject')} disabled={actionLoading}
          className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50">
          رفض
        </button>
      </div>
    </div>
  );
}
