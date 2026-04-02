'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import ChildSwitcher from '@/components/ui/ChildSwitcher';
import ChildCard from '@/components/dashboard/ChildCard';
import AddChildModal from '@/components/dashboard/AddChildModal';
import DailySuggestion from '@/components/dashboard/DailySuggestion';
import WeeklyChallenge from '@/components/dashboard/WeeklyChallenge';
import ChildStats from '@/components/dashboard/ChildStats';
import NotificationSettings from '@/components/dashboard/NotificationSettings';
import Link from 'next/link';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

interface Child {
  id: string;
  name: string;
  age: number;
  ageGroup: string;
  role?: 'owner' | 'follower';
}

interface Parent {
  id: string;
  email: string;
  city: string | null;
  weeklyEmailEnabled: boolean;
  achievementEmailEnabled: boolean;
  monthlyReportEnabled: boolean;
  currentWeekNumber: number;
  isAdmin?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [parent, setParent] = useState<Parent | null>(null);
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editChild, setEditChild] = useState<Child | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [shareLinks, setShareLinks] = useState<Record<string, string>>({});
  const [sharingId, setSharingId] = useState<string | null>(null);

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const showPdfReport = useFeatureFlag('child_pdf_report');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        if (!data.parent) {
          router.push('/auth?redirect=/dashboard');
          return;
        }
        setParent(data.parent);
        setChildrenList(data.children);
      })
      .catch(() => {
        router.push('/auth?redirect=/dashboard');
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  async function deleteChild(id: string) {
    setDeleteError(null);
    try {
      const res = await fetch(`/api/children/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setChildrenList(prev => prev.filter(c => c.id !== id));
        setDeleteConfirm(null);
      } else {
        setDeleteError('فشل حذف الطفل. حاول مرة أخرى.');
      }
    } catch {
      setDeleteError('حدث خطأ في الاتصال. حاول مرة أخرى.');
    }
  }

  async function generateShareLink(childId: string) {
    setSharingId(childId);
    try {
      const res = await fetch('/api/children/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId }),
      });
      if (res.ok) {
        const data = await res.json();
        setShareLinks(prev => ({ ...prev, [childId]: data.shareUrl }));
        await navigator.clipboard?.writeText(data.shareUrl).catch(() => {});
      }
    } catch { /* ignore */ }
    setSharingId(null);
  }

  async function downloadReport(childId: string) {
    setDownloadingPdf(childId);
    try {
      const res = await fetch(`/api/reports/child-pdf?childId=${childId}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.match(/filename\*?=.*?''(.+)/)?.[1]
        ? decodeURIComponent(res.headers.get('Content-Disposition')!.match(/filename\*?=.*?''(.+)/)![1])
        : 'bunyan-report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setDownloadingPdf(null);
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
          <div className="flex items-center gap-3">
            {parent?.isAdmin && (
              <Link
                href="/admin"
                className="text-sm bg-slate-700 text-white font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                🔧 لوحة التحكم
              </Link>
            )}
            <ChildSwitcher />
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              تسجيل خروج
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl p-6">
          <h1 className="text-xl font-extrabold mb-1">مرحباً! 👋</h1>
          <p className="text-emerald-200 text-sm">{parent.email}</p>
          {parent.city && <p className="text-emerald-300 text-xs mt-1">{parent.city}</p>}
        </div>

        {/* Daily Suggestions */}
        <DailySuggestion />

        {/* Weekly Challenge */}
        <WeeklyChallenge />

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
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                      {deleteError && <p className="text-xs text-red-600 mb-2">{deleteError}</p>}
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-red-700 font-medium">تأكيد حذف {child.name}؟</p>
                        <div className="flex gap-2">
                          <button onClick={() => setDeleteConfirm(null)} className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100">إلغاء</button>
                          <button onClick={() => deleteChild(child.id)} className="text-sm bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600">حذف</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <ChildCard
                        child={child}
                        onDelete={id => setDeleteConfirm(id)}
                        onEdit={c => { setEditChild(c); setModalOpen(true); }}
                      />
                      {/* Share button */}
                      {child.role !== 'follower' && (
                        <div className="px-5 pb-3">
                          {shareLinks[child.id] ? (
                            <div className="flex items-center gap-2 bg-emerald-50 rounded-lg p-3">
                              <input
                                readOnly
                                value={shareLinks[child.id]}
                                className="flex-1 text-xs bg-transparent text-emerald-800 outline-none"
                              />
                              <span className="text-xs text-emerald-600 font-medium">تم النسخ</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => generateShareLink(child.id)}
                              disabled={sharingId === child.id}
                              className="w-full text-sm text-emerald-600 font-semibold py-2 rounded-xl border border-emerald-200 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                            >
                              {sharingId === child.id ? 'جاري الإنشاء...' : '🔗 شارك طفلك'}
                            </button>
                          )}
                        </div>
                      )}
                      {/* Child Stats */}
                      <ChildStats childId={child.id} childName={child.name} />
                      {/* PDF Report Download */}
                      {showPdfReport.enabled && (
                        <div className="px-1">
                          <button
                            onClick={() => downloadReport(child.id)}
                            disabled={downloadingPdf === child.id}
                            className="w-full text-sm bg-emerald-50 text-emerald-700 font-semibold py-2.5 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            {downloadingPdf === child.id
                              ? 'جاري إعداد التقرير...'
                              : '📄 حمّل تقرير الأداء'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notification settings */}
        <NotificationSettings
          parent={parent}
          onUpdate={(settings) => {
            setParent(prev => prev ? { ...prev, ...settings } : null);
          }}
        />

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
