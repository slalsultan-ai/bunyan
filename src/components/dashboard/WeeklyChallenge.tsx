'use client';
import { useState, useEffect } from 'react';
import Confetti from '@/components/ui/Confetti';

interface ChallengeData {
  challenge: {
    id: string;
    titleAr: string;
    goalTarget: number;
  };
  progress: {
    childId: string;
    childName: string;
    currentValue: number;
    completed: boolean;
  }[];
  familyTotal: number;
  familyCompleted: boolean;
}

export default function WeeklyChallenge() {
  const [data, setData] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/challenge')
      .then(res => (res.ok ? res.json() : null))
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.challenge) return null;

  const { challenge, progress, familyTotal, familyCompleted } = data;
  const progressPct = Math.min(100, Math.round((familyTotal / challenge.goalTarget) * 100));

  return (
    <div className="bg-gradient-to-bl from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
      <Confetti active={familyCompleted} />

      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-24 h-24 bg-white/5 rounded-full -translate-x-8 -translate-y-8" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-12 translate-y-12" />

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <h3 className="font-bold text-lg">تحدي الأسبوع</h3>
        </div>

        {/* Challenge title */}
        <p className="text-xl font-bold text-white/95">{challenge.titleAr}</p>

        {/* Overall progress bar */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-white/80">تقدم العائلة</span>
            <span className="font-bold">
              {familyTotal} / {challenge.goalTarget}
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-white h-3 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Per-child badges */}
        <div className="flex flex-wrap gap-2">
          {progress.map(child => (
            <div
              key={child.childId}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                child.completed
                  ? 'bg-white text-emerald-700'
                  : 'bg-white/15 text-white'
              }`}
            >
              {child.completed && <span>✓</span>}
              <span>{child.childName}</span>
              <span className="font-bold">{child.currentValue}</span>
            </div>
          ))}
        </div>

        {/* Celebration */}
        {familyCompleted && (
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center animate-bounce-slow">
            <p className="text-lg font-bold">🎉 مبروك! تحدي الأسبوع مكتمل!</p>
          </div>
        )}
      </div>
    </div>
  );
}
