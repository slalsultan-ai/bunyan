import { describe, expect, it } from 'vitest';
import { formatCups, formatCustomers, formatRiyals } from '@/lib/arabic-count';

describe('Arabic simulation number formatting', () => {
  const cases = [0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 20, 21, 22, 23, 45, 100];

  it('formats every required currency count', () => {
    expect(cases.map(formatRiyals)).toEqual(['0 ريال', 'ريال واحد', 'ريالان', '3 ريالات', '4 ريالات', '5 ريالات', '10 ريالات', '11 ريالاً', '12 ريالاً', '13 ريالاً', '20 ريالاً', '21 ريالاً', '22 ريالاً', '23 ريالاً', '45 ريالاً', '100 ريالاً']);
  });

  it('formats cups and customers without broken singular/plural text', () => {
    expect(formatCups(2)).toBe('كوبان');
    expect(formatCups(11)).toBe('11 كوباً');
    expect(formatCustomers(5)).toBe('5 زبائن');
    expect(formatCustomers(11)).toBe('11 زبوناً');
  });
});
