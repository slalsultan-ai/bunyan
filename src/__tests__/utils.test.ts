import { describe, it, expect } from 'vitest';
import {
  cn,
  formatPoints,
  formatTime,
  getAgeGroupLabel,
  getSkillAreaLabel,
  getSkillAreaIcon,
  getScoreColor,
  getScoreBg,
  generateGuestId,
  formatDateRiyadh,
  formatDateRiyadhShort,
  getTodayDateString,
} from '@/lib/utils';

describe('cn', () => {
  it('joins multiple class strings', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out undefined', () => {
    expect(cn('a', undefined, 'b')).toBe('a b');
  });

  it('filters out null', () => {
    expect(cn('a', null, 'b')).toBe('a b');
  });

  it('filters out false', () => {
    expect(cn('a', false, 'b')).toBe('a b');
  });

  it('returns empty string for no valid classes', () => {
    expect(cn(undefined, null, false)).toBe('');
  });

  it('returns empty string when called with no arguments', () => {
    expect(cn()).toBe('');
  });
});

describe('formatPoints', () => {
  it('returns "0" for 0 points', () => {
    expect(formatPoints(0)).toBe('0');
  });

  it('returns "500" for 500 points', () => {
    expect(formatPoints(500)).toBe('500');
  });

  it('returns "999" for 999 points', () => {
    expect(formatPoints(999)).toBe('999');
  });

  it('returns "1.0k" for 1000 points', () => {
    expect(formatPoints(1000)).toBe('1.0k');
  });

  it('returns "1.5k" for 1500 points', () => {
    expect(formatPoints(1500)).toBe('1.5k');
  });

  it('returns "10.0k" for 10000 points', () => {
    expect(formatPoints(10000)).toBe('10.0k');
  });
});

describe('formatTime', () => {
  it('returns "0 ثانية" for 0ms', () => {
    expect(formatTime(0)).toBe('0 ثانية');
  });

  it('returns "30 ثانية" for 30000ms', () => {
    expect(formatTime(30000)).toBe('30 ثانية');
  });

  it('returns "1:00 دقيقة" for 60000ms', () => {
    expect(formatTime(60000)).toBe('1:00 دقيقة');
  });

  it('returns "2:30 دقيقة" for 150000ms', () => {
    expect(formatTime(150000)).toBe('2:30 دقيقة');
  });
});

describe('getAgeGroupLabel', () => {
  it('maps 4-5 correctly', () => {
    expect(getAgeGroupLabel('4-5')).toBe('4 — 5 سنوات');
  });

  it('maps 6-9 correctly', () => {
    expect(getAgeGroupLabel('6-9')).toBe('6 — 9 سنوات');
  });

  it('maps 10-12 correctly', () => {
    expect(getAgeGroupLabel('10-12')).toBe('10 — 12 سنة');
  });
});

describe('getSkillAreaLabel', () => {
  it('returns كمي for quantitative', () => {
    expect(getSkillAreaLabel('quantitative')).toBe('كمي');
  });

  it('returns لفظي for verbal', () => {
    expect(getSkillAreaLabel('verbal')).toBe('لفظي');
  });

  it('returns تفكير منطقي for logical_patterns', () => {
    expect(getSkillAreaLabel('logical_patterns')).toBe('تفكير منطقي');
  });

  it('returns مزيج for mixed', () => {
    expect(getSkillAreaLabel('mixed')).toBe('مزيج');
  });
});

describe('getSkillAreaIcon', () => {
  it('returns 🔢 for quantitative', () => {
    expect(getSkillAreaIcon('quantitative')).toBe('🔢');
  });

  it('returns 📖 for verbal', () => {
    expect(getSkillAreaIcon('verbal')).toBe('📖');
  });

  it('returns 🧩 for logical_patterns', () => {
    expect(getSkillAreaIcon('logical_patterns')).toBe('🧩');
  });

  it('returns 🎯 for mixed', () => {
    expect(getSkillAreaIcon('mixed')).toBe('🎯');
  });
});

describe('getScoreColor', () => {
  it('returns emerald for >= 80', () => {
    expect(getScoreColor(80)).toBe('text-emerald-600');
    expect(getScoreColor(100)).toBe('text-emerald-600');
  });

  it('returns amber for >= 60 and < 80', () => {
    expect(getScoreColor(60)).toBe('text-amber-500');
    expect(getScoreColor(79)).toBe('text-amber-500');
  });

  it('returns red for < 60', () => {
    expect(getScoreColor(0)).toBe('text-red-500');
    expect(getScoreColor(59)).toBe('text-red-500');
  });
});

describe('getScoreBg', () => {
  it('returns emerald bg for >= 80', () => {
    expect(getScoreBg(80)).toBe('bg-emerald-100 text-emerald-700');
    expect(getScoreBg(100)).toBe('bg-emerald-100 text-emerald-700');
  });

  it('returns amber bg for >= 60 and < 80', () => {
    expect(getScoreBg(60)).toBe('bg-amber-100 text-amber-700');
    expect(getScoreBg(79)).toBe('bg-amber-100 text-amber-700');
  });

  it('returns red bg for < 60', () => {
    expect(getScoreBg(0)).toBe('bg-red-100 text-red-700');
    expect(getScoreBg(59)).toBe('bg-red-100 text-red-700');
  });
});

describe('generateGuestId', () => {
  it('returns a string matching UUID format', () => {
    const id = generateGuestId();
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe('formatDateRiyadh', () => {
  it('formats a date with datetime style by default', () => {
    const result = formatDateRiyadh('2024-06-15T12:00:00Z');
    expect(typeof result).toBe('string');
    // Should contain date components (dd/mm/yyyy) and time
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('formats a date with date-only style', () => {
    const result = formatDateRiyadh('2024-06-15T12:00:00Z', 'date');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    // Should NOT contain time
    expect(result).not.toMatch(/\d{2}:\d{2}/);
  });

  it('returns dash for invalid date string', () => {
    expect(formatDateRiyadh('not-a-date')).toBe('—');
  });
});

describe('formatDateRiyadhShort', () => {
  it('returns MM/DD format for a valid date', () => {
    const result = formatDateRiyadhShort('2024-06-15T12:00:00Z');
    expect(result).toMatch(/\d{2}\/\d{2}/);
  });

  it('returns dash for invalid date', () => {
    expect(formatDateRiyadhShort('invalid')).toBe('—');
  });
});

describe('getTodayDateString', () => {
  it('returns a YYYY-MM-DD formatted string', () => {
    const result = getTodayDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches today\'s date', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(getTodayDateString()).toBe(expected);
  });
});
