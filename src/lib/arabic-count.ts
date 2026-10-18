type CountKind = 'riyal' | 'cup' | 'customer';

const forms: Record<CountKind, { zero: string; one: string; two: string; few: string; many: string }> = {
  riyal: { zero: '0 ريال', one: 'ريال واحد', two: 'ريالان', few: 'ريالات', many: 'ريالاً' },
  cup: { zero: '0 كوب', one: 'كوب واحد', two: 'كوبان', few: 'أكواب', many: 'كوباً' },
  customer: { zero: '0 زبون', one: 'زبون واحد', two: 'زبونان', few: 'زبائن', many: 'زبوناً' },
};

/** Formats the few Arabic noun forms needed by the simulation consistently. */
export function formatArabicCount(value: number, kind: CountKind): string {
  const number = Math.max(0, Math.floor(value));
  const form = forms[kind];
  if (number === 0) return form.zero;
  if (number === 1) return form.one;
  if (number === 2) return form.two;
  if (number >= 3 && number <= 10) return `${number} ${form.few}`;
  return `${number} ${form.many}`;
}

export const formatRiyals = (value: number) => formatArabicCount(value, 'riyal');
export const formatCups = (value: number) => formatArabicCount(value, 'cup');
export const formatCustomers = (value: number) => formatArabicCount(value, 'customer');
