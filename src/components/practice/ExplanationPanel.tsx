'use client';

import { useState } from 'react';
import { QuestionOption } from '@/types';

const LETTERS = ['أ', 'ب', 'ج', 'د'];

interface ExplanationPanelProps {
  options: QuestionOption[];
  correctOptionIndex: number;
  explanationAr: string;
  isCorrect: boolean;
  pointsEarned: number;
  showExplanation?: boolean; // controlled by answer_explanations feature flag
}

export default function ExplanationPanel({ options, correctOptionIndex, explanationAr, isCorrect, pointsEarned, showExplanation = false }: ExplanationPanelProps) {
  const correctLetter = LETTERS[correctOptionIndex];
  const correctText = options[correctOptionIndex]?.text;
  const [expanded, setExpanded] = useState(false);

  // Determine if explanation text should be visible
  const hasExplanation = showExplanation && explanationAr && explanationAr.length > 0;
  const explanationVisible = hasExplanation && (!isCorrect || expanded);

  return (
    <div className={`mt-3 rounded-xl px-4 py-3 border-2 animate-fade-in-up ${isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg">{isCorrect ? '✅' : '💡'}</span>
          <span className={`font-bold text-sm ${isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
            {isCorrect ? 'إجابة صحيحة!' : `الصحيح: (${correctLetter}) ${correctText}`}
          </span>
        </div>
        {pointsEarned > 0 && (
          <span className="bg-amber-400 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-bounce-in shrink-0">
            +{pointsEarned} نقطة
          </span>
        )}
      </div>

      {/* Correct answer: show toggle button */}
      {hasExplanation && isCorrect && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 text-emerald-600 text-xs font-medium hover:text-emerald-700 flex items-center gap-1"
        >
          💡 كيف حليتها؟
        </button>
      )}

      {/* Explanation text */}
      {explanationVisible && (
        <div className={`mt-2 rounded-lg px-3 py-2 text-xs leading-relaxed ${
          isCorrect ? 'bg-emerald-100/60 text-emerald-800' : 'bg-amber-100/60 text-amber-900'
        }`}>
          <span className="font-bold">💡 الشرح: </span>
          {explanationAr}
        </div>
      )}

      {/* Fallback: if no explanation feature, still show the old-style inline text */}
      {!showExplanation && explanationAr && (
        <p className="text-gray-600 text-xs leading-relaxed mt-1">{explanationAr}</p>
      )}
    </div>
  );
}
