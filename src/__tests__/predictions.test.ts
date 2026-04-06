import { describe, it, expect } from 'vitest';
import { calculateWeeklyImprovement, predictGoalDate, generatePredictionMessage } from '@/lib/predictions';

describe('calculateWeeklyImprovement', () => {
  it('returns 0 for less than 2 data points', () => {
    expect(calculateWeeklyImprovement([])).toBe(0);
    expect(calculateWeeklyImprovement([50])).toBe(0);
  });

  it('calculates positive improvement', () => {
    const result = calculateWeeklyImprovement([50, 55, 60, 65]);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeCloseTo(5, 0);
  });

  it('calculates negative improvement (decline)', () => {
    const result = calculateWeeklyImprovement([80, 75, 70, 65]);
    expect(result).toBeLessThan(0);
  });

  it('returns 0 for stable performance', () => {
    const result = calculateWeeklyImprovement([70, 70, 70, 70]);
    expect(result).toBe(0);
  });

  it('only uses last 4 weeks', () => {
    // First values should be ignored
    const result = calculateWeeklyImprovement([10, 20, 30, 50, 55, 60, 65]);
    const resultShort = calculateWeeklyImprovement([50, 55, 60, 65]);
    expect(result).toBeCloseTo(resultShort, 0);
  });
});

describe('predictGoalDate', () => {
  it('returns already achieved when current >= target', () => {
    const result = predictGoalDate(90, 85, 3);
    expect(result.weeks).toBe(0);
    expect(result.reachable).toBe(true);
  });

  it('returns unreachable when improvement <= 0', () => {
    const result = predictGoalDate(60, 90, 0);
    expect(result.reachable).toBe(false);
    expect(result.weeks).toBe(-1);
  });

  it('returns unreachable for negative improvement', () => {
    const result = predictGoalDate(60, 90, -2);
    expect(result.reachable).toBe(false);
  });

  it('calculates correct weeks for positive improvement', () => {
    const result = predictGoalDate(60, 90, 5);
    expect(result.weeks).toBe(6); // ceil(30/5) = 6
    expect(result.reachable).toBe(true);
  });

  it('warns when goal takes more than 12 weeks', () => {
    const result = predictGoalDate(10, 90, 2);
    expect(result.weeks).toBe(40);
    expect(result.reachable).toBe(true);
    expect(result.message).toContain('وقت أطول');
  });
});

describe('generatePredictionMessage', () => {
  it('generates encouragement for no improvement', () => {
    const msg = generatePredictionMessage('أحمد', 60, 0);
    expect(msg).toContain('أحمد');
    expect(msg).toContain('الاستمرار');
  });

  it('generates prediction for positive improvement', () => {
    const msg = generatePredictionMessage('سارة', 70, 5);
    expect(msg).toContain('سارة');
    expect(msg).toContain('80');
  });

  it('caps projection at 100%', () => {
    const msg = generatePredictionMessage('محمد', 95, 10);
    expect(msg).toContain('100');
  });
});
