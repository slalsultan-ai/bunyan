'use client';

import { useEffect, useState, useRef } from 'react';
import BunaaAvatar from './BunaaAvatar';
import type { BunaaMessage } from '@/lib/mascot/bunaa-messages';

interface BunaaBubbleProps {
  message: BunaaMessage | null;
  visible: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'center';
  autoHide?: number;
  onClose?: () => void;
}

export default function BunaaBubble({
  message,
  visible,
  position = 'bottom-right',
  autoHide = 4000,
  onClose,
}: BunaaBubbleProps) {
  const [show, setShow] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible && message) {
      setAnimatingOut(false);
      setShow(true);

      // Auto-hide timer
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        handleClose();
      }, autoHide);
    } else if (!visible && show) {
      handleClose();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, message]);

  function handleClose() {
    setAnimatingOut(true);
    setTimeout(() => {
      setShow(false);
      setAnimatingOut(false);
      onClose?.();
    }, 300);
  }

  if (!show || !message) return null;

  const positionClasses = {
    'bottom-right': 'bottom-20 left-4 sm:left-auto sm:right-4',
    'bottom-left': 'bottom-20 right-4 sm:right-auto sm:left-4',
    center: 'bottom-20 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={`fixed z-50 ${positionClasses[position]} transition-all duration-300 ${
        animatingOut ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
      style={{ animation: animatingOut ? undefined : 'bunaaSlideIn 0.3s ease-out' }}
    >
      {/* Bubble */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg px-4 py-3 max-w-[250px] relative mb-2">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-1 left-1 w-5 h-5 flex items-center justify-center text-gray-300 hover:text-gray-500 text-xs rounded-full transition-colors"
          aria-label="إغلاق"
        >
          ×
        </button>

        <p className="text-gray-700 text-sm leading-relaxed text-right pr-0 pl-4">
          {message.text}
        </p>

        {/* Arrow pointing down */}
        <div className="absolute -bottom-2 right-5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white drop-shadow-sm" />
      </div>

      {/* Avatar */}
      <div className="flex justify-end pr-2">
        <BunaaAvatar expression={message.expression} size={48} />
      </div>

      {/* Keyframe animation */}
      <style jsx>{`
        @keyframes bunaaSlideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
