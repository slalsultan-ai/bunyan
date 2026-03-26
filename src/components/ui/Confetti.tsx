'use client';
import { useEffect } from 'react';

export default function Confetti({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    let confetti: ((opts: object) => void) | undefined;
    import('canvas-confetti').then(mod => {
      confetti = mod.default as (opts: object) => void;
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      setTimeout(() => confetti?.({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } }), 250);
      setTimeout(() => confetti?.({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } }), 400);
    });
  }, [active]);

  return null;
}
