import { Question } from '@/types';

const LETTERS = ['أ', 'ب', 'ج', 'د'];

interface ExplanationPanelProps {
  question: Question;
  isCorrect: boolean;
  pointsEarned: number;
  onNext: () => void;
  isLast: boolean;
}

export default function ExplanationPanel({ question, isCorrect, pointsEarned, onNext, isLast }: ExplanationPanelProps) {
  const correctLetter = LETTERS[question.correctOptionIndex];
  const correctText = question.options[question.correctOptionIndex]?.text;

  return (
    <div className={`mt-4 rounded-xl p-4 border-2 animate-fade-in-up ${isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{isCorrect ? '✅' : '💡'}</span>
          <span className={`font-bold text-base ${isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
            {isCorrect ? 'إجابة صحيحة!' : 'الإجابة الصحيحة:'}
          </span>
          {!isCorrect && (
            <span className="text-amber-800 font-semibold">
              ({correctLetter}) {correctText}
            </span>
          )}
        </div>
        {pointsEarned > 0 && (
          <span className="bg-amber-400 text-white text-sm font-bold px-3 py-1 rounded-full animate-bounce-in">
            +{pointsEarned} نقطة
          </span>
        )}
      </div>
      <p className="text-gray-700 text-sm leading-relaxed mb-4">{question.explanationAr}</p>
      <button
        onClick={onNext}
        className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 transition-colors active:scale-95"
      >
        {isLast ? '🎉 عرض النتائج' : 'السؤال التالي ←'}
      </button>
    </div>
  );
}
