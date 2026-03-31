'use client';
import { useState, useRef, useEffect } from 'react';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import Link from 'next/link';

const AVATARS = ['👦', '👧', '🧒'];
function getAvatar(name: string) {
  return AVATARS[(name.charCodeAt(0) || 0) % AVATARS.length];
}

export default function ChildSwitcher() {
  const { children, selectedChild, setSelectedChildId, isLoggedIn, loading } = useSelectedChild();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (loading || !isLoggedIn || children.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-emerald-600 transition-colors bg-gray-50 hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-gray-200"
      >
        <span>{selectedChild ? getAvatar(selectedChild.name) : '🧒'}</span>
        <span className="max-w-[100px] truncate">{selectedChild?.name || 'اختر طفلاً'}</span>
        <span className="text-xs text-gray-400">▼</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 end-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[200px] py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => {
                setSelectedChildId(child.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                selectedChild?.id === child.id
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{getAvatar(child.name)}</span>
              <div className="flex-1 text-right">
                <div className="font-semibold">{child.name}</div>
                <div className="text-xs text-gray-400">{child.age} سنوات</div>
              </div>
              {selectedChild?.id === child.id && (
                <span className="text-emerald-500">✓</span>
              )}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              <span>➕</span>
              <span className="font-medium">أضف طفل</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
