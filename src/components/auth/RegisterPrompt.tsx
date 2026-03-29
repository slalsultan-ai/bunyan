'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface RegisterPromptProps {
  context: 'results' | 'progress' | 'worksheet';
  redirectTo?: string;
}

export default function RegisterPrompt({ context, redirectTo }: RegisterPromptProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.parent) return; // Already logged in

        // Check if user dismissed it this session
        const dismissed = sessionStorage.getItem(`register_prompt_dismissed_${context}`);
        if (!dismissed) setVisible(true);
      })
      .catch(() => {});
  }, [context]);

  function dismiss() {
    sessionStorage.setItem(`register_prompt_dismissed_${context}`, '1');
    setVisible(false);
  }

  if (!visible) return null;

  const authUrl = `/auth${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`;

  if (context === 'results') {
    return (
      <div className="bg-gradient-to-l from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 mt-4">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">📬</span>
          <div>
            <p className="font-bold text-gray-900 text-sm mb-1">احفظ تقدمك واحصل على تمارين أسبوعية</p>
            <p className="text-gray-600 text-xs leading-relaxed">سجّل مجاناً لتتابع تحسّن طفلك وتحصل على أسئلة وألعاب ونصائح كل أسبوع على بريدك.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={authUrl}
            className="flex-1 bg-emerald-600 text-white text-sm font-bold py-2.5 rounded-xl text-center hover:bg-emerald-700 transition-colors"
          >
            سجّل مجاناً
          </Link>
          <button
            onClick={dismiss}
            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ليس الآن
          </button>
        </div>
      </div>
    );
  }

  if (context === 'progress') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3" dir="rtl">
        <span className="text-xl shrink-0">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="text-amber-800 font-semibold text-sm mb-0.5">تقدمك محفوظ على هذا الجهاز فقط</p>
          <p className="text-amber-700 text-xs leading-relaxed">سجّل لحفظه بشكل دائم وتحصل على تمارين أسبوعية مجانية.</p>
        </div>
        <Link
          href={authUrl}
          className="shrink-0 bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-amber-600 transition-colors whitespace-nowrap"
        >
          سجّل
        </Link>
      </div>
    );
  }

  if (context === 'worksheet') {
    return (
      <div className="bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">📬</span>
          <div>
            <p className="font-bold text-gray-900 text-sm mb-1">تبي أوراق عمل جديدة كل أسبوع؟</p>
            <p className="text-gray-600 text-xs leading-relaxed">سجّل مجاناً واحصل على تمارين مخصصة لعمر طفلك مباشرة على بريدك.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={authUrl}
            className="flex-1 bg-blue-600 text-white text-sm font-bold py-2.5 rounded-xl text-center hover:bg-blue-700 transition-colors"
          >
            سجّل مجاناً
          </Link>
          <button
            onClick={dismiss}
            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ليس الآن
          </button>
        </div>
      </div>
    );
  }

  return null;
}
