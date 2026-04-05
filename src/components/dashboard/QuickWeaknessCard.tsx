'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Weakness {
  subSkill: string;
  skillArea: string;
  accuracy: number;
  total: number;
}

interface Props {
  childId: string;
  childName: string;
}

export default function QuickWeaknessCard({ childId, childName }: Props) {
  const [weakness, setWeakness] = useState<Weakness | null>(null);
  const [ageGroup, setAgeGroup] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/dashboard/weakness?childId=${encodeURIComponent(childId)}`)
      .then(r => (r.ok ? r.json() : { weakness: null }))
      .then(data => {
        if (cancelled) return;
        setWeakness(data.weakness ?? null);
        setAgeGroup(data.ageGroup ?? '');
      })
      .catch(() => !cancelled && setWeakness(null))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [childId]);

  if (loading || !weakness || !ageGroup) return null;

  const href = `/practice/session?age=${encodeURIComponent(ageGroup)}&skill=${encodeURIComponent(weakness.skillArea)}&subskill=${encodeURIComponent(weakness.subSkill)}&count=5`;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
      <span className="text-2xl mt-0.5">🎯</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-amber-900 mb-1">
          3 دقائق لتحسين {weakness.subSkill}
        </p>
        <p className="text-xs text-amber-700">
          أضعف مهارة عند {childName} ({weakness.accuracy}% من {weakness.total} سؤال) — 5 أسئلة مخصصة
        </p>
      </div>
      <Link
        href={href}
        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg shrink-0 transition-colors active:scale-95"
      >
        ابدأ الآن
      </Link>
    </div>
  );
}
