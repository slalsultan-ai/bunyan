'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import ChildCard from '@/components/dashboard/ChildCard';
import AddChildModal from '@/components/dashboard/AddChildModal';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
  age: number;
  ageGroup: string;
}

interface Parent {
  id: string;
  email: string;
  city: string | null;
  weeklyEmailEnabled: boolean;
  currentWeekNumber: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [parent, setParent] = useState<Parent | null>(null);
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editChild, setEditChild] = useState<Child | null>(null);
  const [emailToggling, setEmailToggling] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.parent) {
          router.push('/auth?redirect=/dashboard');
          return;
        }
        setParent(data.parent);
        setChildrenList(data.children);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  async function deleteChild(id: string) {
    const res = await fetch(`/api/children/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setChildrenList(prev => prev.filter(c => c.id !== id));
      setDeleteConfirm(null);
    }
  }

  async function toggleEmail() {
    if (!parent) return;
    setEmailToggling(true);
    const res = await fetch('/api/settings/email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weeklyEmailEnabled: !parent.weeklyEmailEnabled }),
    });
    if (res.ok) {
      setParent(prev => prev ? { ...prev, weeklyEmailEnabled: !prev.weeklyEmailEnabled } : null);
    }
    setEmailToggling(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!parent) return null;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            تسجيل خروج
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl p-6">
          <h1 className="text-xl font-extrabold mb-1">مرحباً! 👋</h1>
          <p className="text-emerald-200 text-sm">{parent.email}</p>
          {parent.city && <p className="text-emerald-300 text-xs mt-1">{parent.city}</p>}
        </div>

        {/* Children */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 text-lg">أطفالي</h2>
            {childrenList.length < 10 && (
              <button
                onClick={() => { setEditChild(null); setModalOpen(true); }}
                className="text-sm bg-emerald-100 text-emerald-700 font-semibold px-3 py-1.5 rounded-xl hover:bg-emerald-200 transition-colors"
              >
                + إضافة طفل
              </button>
            )}
          </div>

          {childrenList.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
              <div className="text-4xl mb-3">👶</div>
              <p className="text-gray-600 mb-4">لم تضف أي طفل بعد</p>
              <button
                onClick={() => { setEditChild(null); setModalOpen(true); }}
                className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                أضف طفلك الأول
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {childrenList.map(child => (
                <div key={child.id}>
                  {deleteConfirm === child.id ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                      <p className="text-sm text-red-700 font-medium">تأكيد حذف {child.name}؟</p>
                      <div className="flex gap-2">
                        <button onClick={() => setDeleteConfirm(null)} className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100">إلغاء</button>
                        <button onClick={() => deleteChild(child.id)} className="text-sm bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600">حذف</button>
                      </div>
                    </div>
                  ) : (
                    <ChildCard
                      child={child}
                      onDelete={id => setDeleteConfirm(id)}
                      onEdit={c => { setEditChild(c); setModalOpen(true); }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email settings */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-1">البريد الأسبوعي</h3>
          <p className="text-sm text-gray-500 mb-4">أسئلة وألعاب ونصائح مخصصة لعمر طفلك كل أسبوع</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {parent.weeklyEmailEnabled ? '✅ مفعّل' : '❌ موقوف'}
            </span>
            <button
              onClick={toggleEmail}
              disabled={emailToggling}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${parent.weeklyEmailEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${parent.weeklyEmailEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/practice" className="bg-emerald-600 text-white text-center font-bold py-3.5 rounded-2xl hover:bg-emerald-700 transition-colors">
            🎯 ابدأ تدريباً
          </Link>
          <Link href="/progress" className="bg-white text-gray-700 text-center font-semibold py-3.5 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors">
            📊 التقدم
          </Link>
        </div>
      </div>

      <AddChildModal
        open={modalOpen}
        editChild={editChild}
        onClose={() => setModalOpen(false)}
        onSaved={child => {
          if (editChild) {
            setChildrenList(prev => prev.map(c => c.id === child.id ? child : c));
          } else {
            setChildrenList(prev => [...prev, child]);
          }
        }}
      />
    </div>
  );
}
