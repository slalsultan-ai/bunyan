/**
 * The single rule every practice mode uses to score a multiple-choice answer:
 * the chosen option index must equal the question's saved correct index.
 * Anything that is not a whole in-range index is "no answer", never index 0.
 */

export function parseSelectedOption(value: unknown, optionCount = 4): number | null {
  let n: number;
  if (typeof value === 'number') n = value;
  else if (typeof value === 'string' && /^\d+$/.test(value.trim())) n = Number(value.trim());
  else return null;
  return Number.isInteger(n) && n >= 0 && n < optionCount ? n : null;
}

export function isAnswerCorrect(selected: number | null, correctIndex: number | null | undefined): boolean {
  return selected !== null && correctIndex !== null && correctIndex !== undefined && selected === correctIndex;
}
