'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface CodeUser {
  parentId: string;
  parentEmail: string;
  childName: string | null;
  childAgeGroup: string | null;
  activatedAt: string;
  expiresAt: string;
  status: string;
}

interface CodeInfo {
  id: number;
  code: string;
  institutionName: string;
  maxUsers: number;
  currentUsers: number;
}

export default function CodeUsersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [users, setUsers] = useState<CodeUser[]>([]);
  const [codeInfo, setCodeInfo] = useState<CodeInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/codes/${id}/users`).then(r => r.json()),
      fetch(`/api/admin/codes/${id}`).then(r => r.json()),
    ]).then(([usersData, codeData]) => {
      setUsers(usersData.users || []);
      setCodeInfo(codeData.code || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link href="/admin/codes" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">&larr; العودة للأكواد</Link>

      {codeInfo && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">مستخدمو كود: <span className="font-mono">{codeInfo.code}</span></h1>
          <p className="text-gray-600">{codeInfo.institutionName}</p>
          <p className="text-sm text-gray-500 mt-1">المستخدمين: {codeInfo.currentUsers}/{codeInfo.maxUsers}</p>
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center text-gray-500 py-12 bg-white rounded-xl border border-gray-200">لا يوجد مستخدمين بعد</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-right font-medium text-gray-600">الطفل</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">ولي الأمر</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">الفئة</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">تاريخ التفعيل</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 text-gray-900">{u.childName || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{u.parentEmail}</td>
                    <td className="px-4 py-3 text-gray-600">{u.childAgeGroup || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(u.activatedAt).toLocaleDateString('ar-SA')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {u.status === 'active' ? 'نشط' : u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
