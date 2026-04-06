import { describe, it, expect } from 'vitest';
import { renderWeeklyDigestEmail } from '@/lib/email-templates/weekly-digest';
import type { WeeklyDigestData } from '@/lib/weekly-digest';

function makeDigestData(overrides: Partial<WeeklyDigestData> = {}): WeeklyDigestData {
  return {
    child: { name: 'أحمد', ageGroup: '6-9', id: 'c1' },
    parent: { email: 'test@example.com', id: 'p1' },
    period: { from: '2026-03-30', to: '2026-04-05' },
    thisWeek: { sessions: 9, questions: 72, accuracy: 89, points: 450, daysActive: 5 },
    lastWeek: { sessions: 6, questions: 48, accuracy: 64, points: 200, daysActive: 3 },
    comparison: { sessionsChange: 3, accuracyChange: 25, trend: 'improving', trendMessage: 'تحسّن ملحوظ!' },
    highlights: {
      bestSubSkill: { name: 'المتضادات', accuracy: 100 },
      worstSubSkill: { name: 'الطرح', accuracy: 33 },
      newAchievements: [],
      streak: 5,
    },
    recommendation: { activity: 'لعبة "كم بقي؟"', reason: 'لأن الطرح يحتاج تعزيز', duration: '10 دقائق' },
    noActivity: false,
    predictionMessage: 'لو استمر أحمد بهذا المعدل، نتوقع دقته ترتفع إلى ~95%!',
    ...overrides,
  };
}

describe('renderWeeklyDigestEmail', () => {
  it('returns valid HTML with RTL direction', () => {
    const html = renderWeeklyDigestEmail([makeDigestData()]);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="ar"');
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('includes child name and stats', () => {
    const html = renderWeeklyDigestEmail([makeDigestData()]);
    expect(html).toContain('أحمد');
    expect(html).toContain('89%');
    expect(html).toContain('9'); // sessions
    expect(html).toContain('72'); // questions
  });

  it('includes trend message', () => {
    const html = renderWeeklyDigestEmail([makeDigestData()]);
    expect(html).toContain('تحسّن ملحوظ!');
  });

  it('includes highlights', () => {
    const html = renderWeeklyDigestEmail([makeDigestData()]);
    expect(html).toContain('المتضادات');
    expect(html).toContain('الطرح');
    expect(html).toContain('5'); // streak
  });

  it('includes home activity recommendation', () => {
    const html = renderWeeklyDigestEmail([makeDigestData()]);
    expect(html).toContain('كم بقي');
    expect(html).toContain('10 دقائق');
  });

  it('includes prediction message', () => {
    const html = renderWeeklyDigestEmail([makeDigestData()]);
    expect(html).toContain('95%');
  });

  it('includes unsubscribe link', () => {
    const html = renderWeeklyDigestEmail([makeDigestData()]);
    expect(html).toContain('إلغاء الاشتراك');
    expect(html).toContain('unsubscribe');
  });

  it('shows no-activity template when child was inactive', () => {
    const html = renderWeeklyDigestEmail([makeDigestData({ noActivity: true })]);
    expect(html).toContain('لم يتدرب هذا الأسبوع');
    expect(html).not.toContain('89%'); // No stats shown
  });

  it('handles multiple children in one email', () => {
    const child1 = makeDigestData({ child: { name: 'عبدالله', ageGroup: '4-5', id: 'c1' } });
    const child2 = makeDigestData({ child: { name: 'سارة', ageGroup: '6-9', id: 'c2' } });
    const html = renderWeeklyDigestEmail([child1, child2]);
    expect(html).toContain('عبدالله');
    expect(html).toContain('سارة');
  });

  it('returns empty string for empty data', () => {
    const html = renderWeeklyDigestEmail([]);
    expect(html).toBe('');
  });
});
