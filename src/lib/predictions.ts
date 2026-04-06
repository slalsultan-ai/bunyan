/**
 * Calculate weekly improvement rate from accuracy data.
 * Uses linear regression on the last 4+ data points.
 */
export function calculateWeeklyImprovement(weeklyAccuracies: number[]): number {
  if (weeklyAccuracies.length < 2) return 0;

  const data = weeklyAccuracies.slice(-4); // Last 4 weeks max
  const n = data.length;

  // Simple linear regression: y = mx + b
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  return Math.round(slope * 10) / 10; // Round to 1 decimal
}

/**
 * Predict when a child will reach their goal.
 */
export function predictGoalDate(
  currentValue: number,
  targetValue: number,
  weeklyImprovement: number
): { weeks: number; reachable: boolean; message: string } {
  if (currentValue >= targetValue) {
    return { weeks: 0, reachable: true, message: 'تم تحقيق الهدف!' };
  }

  if (weeklyImprovement <= 0) {
    return {
      weeks: -1,
      reachable: false,
      message: 'استمر بالتدريب — التحسن يأتي مع المثابرة',
    };
  }

  const gap = targetValue - currentValue;
  const weeks = Math.ceil(gap / weeklyImprovement);

  if (weeks > 12) {
    return {
      weeks,
      reachable: true,
      message: 'الهدف يحتاج وقت أطول — حاول زيادة عدد الجلسات الأسبوعية',
    };
  }

  return {
    weeks,
    reachable: true,
    message: `المتوقع الوصول خلال ${weeks} ${weeks === 1 ? 'أسبوع' : 'أسابيع'}`,
  };
}

/**
 * Generate prediction message for weekly digest email.
 */
export function generatePredictionMessage(
  childName: string,
  currentAccuracy: number,
  weeklyImprovement: number
): string {
  if (weeklyImprovement <= 0) {
    return `شجّع ${childName} على الاستمرار في التدريب — الثبات يصنع الفرق!`;
  }

  const projected = Math.min(100, Math.round(currentAccuracy + weeklyImprovement * 2));
  return `لو استمر ${childName} بهذا المعدل، نتوقع دقته ترتفع إلى ~${projected}% خلال أسبوعين!`;
}
