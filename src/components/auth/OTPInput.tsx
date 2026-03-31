'use client';
import { useRef, useCallback, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';

interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export default function OTPInput({ value, onChange, disabled }: OTPInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Always produce a 6-char array; use empty string for unfilled slots
  const digits: string[] = [];
  for (let i = 0; i < 6; i++) {
    const ch = value[i];
    digits.push(ch && /\d/.test(ch) ? ch : '');
  }

  const buildValue = useCallback(
    (arr: string[]) => arr.join('').replace(/\D/g, '').padEnd(6, ' ').slice(0, 6).replace(/ /g, ''),
    [],
  );

  function focusInput(index: number) {
    const clamped = Math.max(0, Math.min(index, 5));
    // Use requestAnimationFrame to ensure the DOM is ready (fixes iOS Safari)
    requestAnimationFrame(() => {
      inputsRef.current[clamped]?.focus();
    });
  }

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '');

    if (raw.length > 1) {
      // Multi-digit input (autofill or fast typing) — treat as paste
      const filled = raw.slice(0, 6);
      onChange(filled);
      focusInput(Math.min(filled.length, 5));
      return;
    }

    const digit = raw.slice(-1);
    const next = [...digits];
    next[index] = digit;
    onChange(next.join(''));

    if (digit && index < 5) {
      focusInput(index + 1);
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        onChange(next.join(''));
      } else if (index > 0) {
        const next = [...digits];
        next[index - 1] = '';
        onChange(next.join(''));
        focusInput(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < 5) {
      focusInput(index + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    onChange(pasted);
    focusInput(Math.min(pasted.length, 5));
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
          value={digits[i]}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          disabled={disabled}
          maxLength={6}
          aria-label={`الرقم ${i + 1}`}
          style={{
            color: '#1F2937',
            backgroundColor: '#FFFFFF',
            caretColor: '#1F2937',
            fontSize: '1.25rem',
            opacity: 1,
            WebkitTextFillColor: '#1F2937',
          }}
          className="w-10 h-12 sm:w-12 sm:h-14 text-center sm:text-2xl font-bold border-2 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:bg-gray-50 border-gray-300"
        />
      ))}
    </div>
  );
}
