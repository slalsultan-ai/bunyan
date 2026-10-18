export type YoungQuestionOption = { text: string; imageUrl?: string };

export type YoungQuestionCandidate = {
  ageGroup: string;
  questionType: string;
  questionImageUrl?: string | null;
  options: YoungQuestionOption[];
};

const LETTER = /\p{L}/u;
const EASTERN_ARABIC_DIGIT = /[٠-٩]/;

/** A four-year-old can choose a recognisable symbol, numeral, or image without reading. */
export function isVisualAnswerOption(option: YoungQuestionOption): boolean {
  if (typeof option.imageUrl === 'string' && option.imageUrl.trim().length > 0) return true;
  return typeof option.text === 'string'
    && option.text.trim().length > 0
    && !LETTER.test(option.text)
    && !EASTERN_ARABIC_DIGIT.test(option.text);
}

/**
 * Keeps the 4-5 experience pre-literate. Other groups retain the full bank.
 * Audio questions may use spoken prompts; image questions must supply an image.
 */
export function isYoungQuestionSafe(question: YoungQuestionCandidate): boolean {
  if (question.ageGroup !== '4-5') return true;

  const hasSupportedPrompt = question.questionType === 'audio'
    || (question.questionType === 'image' && Boolean(question.questionImageUrl?.trim()));

  return hasSupportedPrompt
    && question.options.length === 4
    && question.options.every(isVisualAnswerOption);
}

export function getYoungQuestionViolation(question: YoungQuestionCandidate): string | null {
  if (question.ageGroup !== '4-5' || isYoungQuestionSafe(question)) return null;
  if (question.questionType !== 'audio' && question.questionType !== 'image') {
    return 'أسئلة عمر 4-5 يجب أن تكون صوتية أو بصرية.';
  }
  if (question.questionType === 'image' && !question.questionImageUrl?.trim()) {
    return 'السؤال البصري لعمر 4-5 يحتاج رسمة أو صورة.';
  }
  return 'خيارات عمر 4-5 يجب أن تكون صوراً أو رموزاً أو أرقاماً غربية بلا كلمات.';
}
