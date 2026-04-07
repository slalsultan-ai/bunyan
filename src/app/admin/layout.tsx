'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

const NAV = [
  { href: '/admin', label: 'الرئيسية', icon: '📊', exact: true },
  { href: '/admin/questions', label: 'الأسئلة', icon: '❓' },
  { href: '/admin/questions/health', label: 'صحة الأسئلة', icon: '🩺' },
  { href: '/admin/coverage', label: 'تغطية المحتوى', icon: '🗺️' },
  { href: '/admin/content', label: 'المحتوى', icon: '✏️' },
  { href: '/admin/analytics', label: 'التحليلات', icon: '📈' },
  { href: '/admin/codes', label: 'أكواد المؤسسات', icon: '🎟️' },
  { href: '/admin/grants', label: 'طلبات المنح', icon: '📩' },
  { href: '/admin/linkedin', label: 'محتوى لينكدإن', icon: '📝' },
  { href: '/admin/features', label: 'الخصائص', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (pathname === '/admin/login') return <>{children}</>;

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg">ب</div>
          <div>
            <div className="font-bold text-white text-sm">بُنيان</div>
            <div className="text-slate-400 text-xs">لوحة التحكم</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-slate-700 space-y-1">
        <Link href="/dashboard" onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-300 hover:text-white hover:bg-blue-800/40 text-sm font-medium transition-colors">
          <span>👤</span><span>واجهة ولي الأمر</span>
        </Link>
        <Link href="/" target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm transition-colors">
          <span>🌐</span><span>الموقع</span>
        </Link>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 text-sm transition-colors">
          <span>🚪</span><span>خروج</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* Mobile header */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm">ب</div>
          <span className="font-bold text-sm">لوحة التحكم</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute top-0 right-0 w-64 h-full bg-slate-900 text-white flex flex-col z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-slate-900 text-white flex-col shrink-0 fixed top-0 right-0 h-full z-20">
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="md:mr-56 min-h-screen">
        {children}
      </main>
    </div>
  );
}
