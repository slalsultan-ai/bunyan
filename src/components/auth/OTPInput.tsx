'use client';
import { useRef, KeyboardEvent, ClipboardEvent } from 'react';

interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export default function OTPInput({ value, onChange, disabled }: OTPInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.padEnd(6, '').split('').slice(0, 6);

  function handleChange(index: number, char: string) {
    const cleaned = char.replace(/\D/g, '');
    if (cleaned.length > 1) {
      // Typed or autofilled multiple digits — treat like paste
      const filled = cleaned.slice(0, 6);
      onChange(filled.padEnd(6, '').slice(0, 6));
      const lastFilled = Math.min(filled.length, 5);
      inputsRef.current[lastFilled]?.focus();
      return;
    }
    const digit = cleaned.slice(-1);
    const next = digits.map((d, i) => (i === index ? digit : d)).join('');
    onChange(next.slice(0, 6));
    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = digits.map((d, i) => (i === index ? '' : d)).join('');
        onChange(next);
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        const next = digits.map((d, i) => (i === index - 1 ? '' : d)).join('');
        onChange(next);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted.padEnd(6, '').slice(0, 6));
    const lastFilled = Math.min(pasted.length, 5);
    inputsRef.current[lastFilled]?.focus();
  }

  return (
    <div className="flex gap-1.5 sm:gap-2 justify-center" dir="ltr">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          value={digits[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          disabled={disabled}
          className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:bg-gray-50 bg-white text-gray-900 border-gray-300"
          aria-label={`الرقم ${i + 1}`}
        />
      ))}
    </div>
  );
}
