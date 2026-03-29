'use client';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import Confetti from '@/components/ui/Confetti';
import { getBadgeById } from '@/lib/gamification/badges';
import { getSkillAreaLabel, formatTime } from '@/lib/utils';
import RegisterPrompt from '@/components/auth/RegisterPrompt';

function ResultsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [childName, setChildName] = useState('');

  const total = Math.min(Math.max(parseInt(params.get('total') || '10'), 1), 100);
  const score = Math.min(Math.max(parseInt(params.get('score') || '0'), 0), total);
  const points = Math.min(Math.max(parseInt(params.get('points') || '0'), 0), total * 200);
  const time = parseInt(params.get('time') || '0');
  const skill = params.get('skill') || 'mixed';
  const age = params.get('age') || '6-9';
  const newBadgeIds = params.get('badges')?.split(',').filter(Boolean) || [];

  const isPerfect = score === total && total > 0;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  const scoreColor = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500';
  const scoreEmoji = isPerfect ? '🏆' : pct >= 80 ? '🌟' : pct >= 60 ? '👍' : '💪';

  const circumference = 2 * Math.PI * 54;
  const strokeDash = circumference - (pct / 100) * circumference;

  const certUrl = `/certificate?name=${encodeURIComponent(childName || 'المتميز')}&score=${score}&total=${total}&skill=${skill}&age=${age}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-8 px-4">
      <Confetti active={isPerfect} />

      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-lg p-8 text-center mb-4">
          <div className="text-4xl mb-3">{scoreEmoji}</div>
          <div className="relative inline-flex items-center justify-center mb-4">
            <svg width="128" height="128" className="-rotate-90">
              <circle cx="64" cy="64" r="54" fill="none" stroke="#E5E7EB" strokeWidth="10" />
              <circle
                cx="64" cy="64" r="54" fill="none"
                stroke={pct >= 80 ? '#059669' : pct >= 60 ? '#F59E0B' : '#EF4444'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDash}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute text-center">
              <div className={`text-3xl font-extrabold ${scoreColor}`}>{score}/{total}</div>
              <div className="text-sm text-gray-500">{pct}٪</div>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {isPerfect ? 'ممتاز! علامة كاملة! 🎉' : pct >= 80 ? 'أحسنت! أداء رائع!' : pct >= 60 ? 'جيد! استمر في التدريب' : 'لا بأس، حاول مرة أخرى!'}
          </h2>
          <p className="text-gray-600 text-sm">مهارة {getSkillAreaLabel(skill as never)} — {age} سنوات</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <div className="text-amber-500 font-bold text-xl">+{points}</div>
            <div className="text-xs text-gray-500 mt-1">نقطة</div>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <div className="text-emerald-600 font-bold text-xl">{score}</div>
            <div className="text-xs text-gray-500 mt-1">صحيح</div>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <div className="text-blue-500 font-bold text-sm">{formatTime(time)}</div>
            <div className="text-xs text-gray-500 mt-1">الوقت</div>
          </div>
        </div>

        {newBadgeIds.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 animate-bounce-in">
            <p className="text-amber-700 font-bold text-sm mb-2">🏅 شارات جديدة!</p>
            <div className="flex gap-3 flex-wrap">
              {newBadgeIds.map(id => {
                const b = getBadgeById(id);
                return b ? (
                  <div key={id} className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2">
                    <span className="text-xl">{b.icon}</span>
                    <span className="text-sm font-semibold text-gray-800">{b.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* 🎓 شهادة إتمام */}
        <div className="bg-gradient-to-l from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-4 mb-3 shadow-sm">
          <p className="font-bold text-amber-800 text-sm mb-3 flex items-center gap-2">
            <span className="text-xl">🎓</span> اطبع شهادة تميّز للطفل
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={childName}
              onChange={e => setChildName(e.target.value)}
              placeholder="اكتب اسم الطفل..."
              className="flex-1 border-2 border-amber-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:border-amber-400 focus:outline-none bg-white"
            />
            <Link
              href={certUrl}
              target="_blank"
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shrink-0 flex items-center gap-1"
            >
              🖨️ طباعة
            </Link>
          </div>
        </div>

        {/* Print worksheet CTA */}
        <Link
          href={`/worksheet?age=${age}&skill=${skill}`}
          className="block bg-gradient-to-l from-emerald-600 to-emerald-500 text-white rounded-2xl p-4 mb-3 shadow-md shadow-emerald-100 hover:shadow-lg hover:from-emerald-700 hover:to-emerald-600 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
              🖨️
            </div>
            <div className="flex-1">
              <p className="font-bold text-base leading-tight">اطبع وتدرّب بالقلم!</p>
              <p className="text-emerald-100 text-xs mt-0.5 leading-relaxed">ورقة عمل جاهزة لنفس المهارة — الكتابة تُرسّخ التعلم</p>
            </div>
            <span className="text-xl opacity-80 group-hover:translate-x-1 transition-transform">←</span>
          </div>
        </Link>

        <RegisterPrompt context="results" redirectTo="/dashboard" />

        <div className="space-y-3 mt-4">
          <button onClick={() => router.push(`/practice?age=${age}&skill=${skill}`)}
            className="w-full bg-white border-2 border-emerald-600 text-emerald-700 font-bold py-3.5 rounded-2xl hover:bg-emerald-50 transition-colors">
            🔁 جلسة جديدة
          </button>
          <button onClick={() => router.push('/progress')}
            className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-2xl hover:bg-gray-200 transition-colors">
            📊 تقدمي
          </button>
          <button onClick={() => router.push('/')} className="w-full text-gray-400 py-2 text-sm hover:text-gray-600 transition-colors">
            الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ResultsContent />
    </Suspense>
  );
}
