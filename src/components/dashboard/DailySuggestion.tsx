'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Suggestion {
  childId: string;
  childName: string;
  type: 'warning' | 'success' | 'info';
  message: string;
  suggestedSkill?: string;
  ageGroup?: string;
}

const TYPE_CONFIG = {
  warning: {
    icon: '⚠️',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    btn: 'bg-amber-600 hover:bg-amber-700',
  },
  success: {
    icon: '🌟',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    btn: 'bg-emerald-600 hover:bg-emerald-700',
  },
  info: {
    icon: '💡',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    btn: 'bg-blue-600 hover:bg-blue-700',
  },
};

export default function DailySuggestion() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/suggestions')
      .then(res => (res.ok ? res.json() : { suggestions: [] }))
      .then(data => setSuggestions(data.suggestions ?? []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-900 text-lg">💬 اقتراحات اليوم</h3>
      {suggestions.map((s, i) => {
        const config = TYPE_CONFIG[s.type];
        return (
          <div
            key={`${s.childId}-${i}`}
            className={`${config.bg} ${config.border} border rounded-xl p-4 flex items-start gap-3`}
          >
            <span className="text-xl mt-0.5">{config.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${config.text}`}>{s.message}</p>
            </div>
            {s.suggestedSkill && (
              <Link
                href={`/practice?age=${s.ageGroup || ''}&skill=${s.suggestedSkill}`}
                className={`${config.btn} text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 transition-colors`}
              >
                ابدأ جلسة
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
