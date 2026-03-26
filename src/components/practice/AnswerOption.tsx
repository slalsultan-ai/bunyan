'use client';
import { cn } from '@/lib/utils';

interface AnswerOptionProps {
  index: number;
  text: string;
  selected: boolean;
  correct: boolean;
  wrong: boolean;
  disabled: boolean;
  onClick: () => void;
  large?: boolean;
}

const LETTERS = ['أ', 'ب', 'ج', 'د'];

export default function AnswerOption({ index, text, selected, correct, wrong, disabled, onClick, large }: AnswerOptionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-right flex items-center gap-3 rounded-xl border-2 transition-all duration-200 font-medium',
        large ? 'p-5 text-lg min-h-[64px]' : 'p-4 text-base min-h-[56px]',
        !disabled && !selected && 'hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer active:scale-98',
        !correct && !wrong && !selected && 'border-gray-200 bg-white',
        selected && !correct && !wrong && 'border-emerald-400 bg-emerald-50',
        correct && 'border-emerald-500 bg-emerald-100 text-emerald-800',
        wrong && 'border-red-400 bg-red-50 text-red-800 animate-shake',
        disabled && !correct && !wrong && 'cursor-not-allowed opacity-60',
      )}
    >
      <span className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
        correct ? 'bg-emerald-500 text-white' : wrong ? 'bg-red-400 text-white' : 'bg-gray-100 text-gray-600'
      )}>
        {correct ? '✓' : wrong ? '✕' : LETTERS[index]}
      </span>
      <span className="flex-1">{text}</span>
    </button>
  );
}
