/**
 * Question health classification for the admin "صحة الأسئلة" page.
 *
 * - A pass-rate verdict (critical / warning / healthy) needs a minimum sample;
 *   below it the question is "low_sample" so three unlucky attempts do not
 *   raise a critical alarm.
 * - A suspected answer-key error is flagged when most attempts converge on
 *   the same wrong option — the typical signature of a wrong saved answer.
 */

export const MIN_ATTEMPTS_FOR_VERDICT = 10;
export const KEY_SUSPECT_MIN_ATTEMPTS = 5;
export const KEY_SUSPECT_SHARE = 0.5;
export const CRITICAL_BELOW = 30;
export const WARNING_BELOW = 50;

export type HealthStatus = 'critical' | 'warning' | 'healthy' | 'low_sample';

export interface HealthInput {
  totalAttempts: number;
  correctCount: number;
  optionDist: number[];
  correctOptionIndex: number;
}

export interface HealthVerdict {
  passRate: number;
  status: HealthStatus;
  /** Wrong option most attempts chose, when that looks like a key error. */
  suspectedKey: { index: number; share: number } | null;
}

export function classifyQuestionHealth(q: HealthInput): HealthVerdict {
  const passRate = q.totalAttempts > 0 ? Math.round((q.correctCount / q.totalAttempts) * 100) : 0;

  let status: HealthStatus;
  if (q.totalAttempts < MIN_ATTEMPTS_FOR_VERDICT) status = 'low_sample';
  else if (passRate < CRITICAL_BELOW) status = 'critical';
  else if (passRate < WARNING_BELOW) status = 'warning';
  else status = 'healthy';

  let suspectedKey: HealthVerdict['suspectedKey'] = null;
  if (q.totalAttempts >= KEY_SUSPECT_MIN_ATTEMPTS) {
    let topIndex = -1;
    let topCount = 0;
    q.optionDist.forEach((n, i) => {
      if (i !== q.correctOptionIndex && n > topCount) { topIndex = i; topCount = n; }
    });
    const share = topCount / q.totalAttempts;
    if (topIndex >= 0 && share >= KEY_SUSPECT_SHARE && topCount > q.correctCount) {
      suspectedKey = { index: topIndex, share: Math.round(share * 100) / 100 };
    }
  }

  return { passRate, status, suspectedKey };
}

export interface HealthSummary {
  critical: number;
  warning: number;
  healthy: number;
  lowSample: number;
  suspectedKey: number;
  avgPassRate: number;
  total: number;
}

export function summarizeHealth(verdicts: HealthVerdict[]): HealthSummary {
  const judged = verdicts.filter((v) => v.status !== 'low_sample');
  return {
    critical: verdicts.filter((v) => v.status === 'critical').length,
    warning: verdicts.filter((v) => v.status === 'warning').length,
    healthy: verdicts.filter((v) => v.status === 'healthy').length,
    lowSample: verdicts.filter((v) => v.status === 'low_sample').length,
    suspectedKey: verdicts.filter((v) => v.suspectedKey).length,
    avgPassRate: judged.length > 0 ? Math.round(judged.reduce((s, v) => s + v.passRate, 0) / judged.length) : 0,
    total: verdicts.length,
  };
}

/** Suspected key errors first, then judged questions by pass rate, then low samples. */
export function healthSortKey(v: HealthVerdict): [number, number] {
  if (v.suspectedKey) return [0, -v.suspectedKey.share];
  if (v.status === 'low_sample') return [2, v.passRate];
  return [1, v.passRate];
}
