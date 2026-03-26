'use client';
import { useEffect, useRef, useState } from 'react';

const STATS = [
  { value: 700, suffix: '+', label: 'سؤال تفاعلي', icon: '📝' },
  { value: 3, suffix: '', label: 'مهارات أساسية', icon: '🎯' },
  { value: 3, suffix: '', label: 'فئات عمرية', icon: '👶' },
  { value: 100, suffix: '٪', label: 'مجاني', icon: '🎁' },
];

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const duration = 1500;
        const step = Math.ceil(target / (duration / 16));
        const timer = setInterval(() => {
          start = Math.min(start + step, target);
          setCount(start);
          if (start >= target) clearInterval(timer);
        }, 16);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);

  return <div ref={ref} className="text-4xl font-extrabold text-emerald-600">{count}{suffix}</div>;
}

export default function StatsSection() {
  return (
    <section className="bg-emerald-600 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s, i) => (
            <div key={i} className="text-white">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-4xl font-extrabold text-white">
                {s.value}{s.suffix}
              </div>
              <div className="text-emerald-200 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
