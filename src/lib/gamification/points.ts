export const POINTS = {
  CORRECT_ANSWER: 10,
  FIRST_TRY_BONUS: 5,
  SESSION_COMPLETE: 20,
  PERFECT_SCORE: 50,
  DAILY_STREAK: 15,
  FIRST_SESSION_TODAY: 10,
};

export function calculateSessionPoints(
  correctAnswers: number,
  totalQuestions: number,
  isFirstSessionToday: boolean,
  streakDays: number
): number {
  let points = 0;
  points += correctAnswers * POINTS.CORRECT_ANSWER;
  if (correctAnswers === totalQuestions) points += POINTS.PERFECT_SCORE;
  if (totalQuestions > 0) points += POINTS.SESSION_COMPLETE;
  if (isFirstSessionToday) points += POINTS.FIRST_SESSION_TODAY;
  if (streakDays > 1) points += POINTS.DAILY_STREAK * Math.min(streakDays, 7);
  return points;
}
