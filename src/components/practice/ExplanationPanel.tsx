import { Question } from '@/types';

const LETTERS = ['أ', 'ب', 'ج', 'د'];

interface ExplanationPanelProps {
  question: Question;
  isCorrect: boolean;
  pointsEarned: number;
}

export default function ExplanationPanel({ question, isCorrect, pointsEarned }: ExplanationPanelProps) {
  const correctLetter = LETTERS[question.correctOptionIndex];
  const correctText = question.options[question.correctOptionIndex]?.text;

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
      <p className="text-gray-600 text-xs leading-relaxed mt-1">{question.explanationAr}</p>
    </div>
  );
}
