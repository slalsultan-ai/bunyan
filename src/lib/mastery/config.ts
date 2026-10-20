/**
 * Tunable thresholds for the adaptive-mastery engine. Defaults live here;
 * admins override any subset through site_content key `mastery_config`.
 */

export interface MasteryConfig {
  /** BKT P(L) that triggers the parallel test. */
  masteryThreshold: number;
  testSize: number;
  testPassCount: number;
  /** Practice answers required after a failed test before retesting. */
  minPracticeBeforeRetest: number;
  /** Stuck rule: this many answers in the current status … */
  stuckAttempts: number;
  /** … while P(L) stays below this → remediation. */
  stuckPKnown: number;
  reviewIntervalsDays: number[];
  reviewWrongsToRelapse: number;
  relapsePKnown: number;
  easyBelow: number;
  hardAbove: number;
  sessionSize: number;
  maxReviewsPerSession: number;
  maxDiagnosticsPerSession: number;
  /** Practice questions per skill in one session before rotating to another open skill. */
  maxPracticePerSkillPerSession: number;
  diagnosticPerSkill: number;
  minQuestionsPerSkill: number;
  /** Practice avoids questions the child saw within this many days. */
  recentExcludeDays: number;
  defaultPInit: number;
  defaultPTransit: number;
  defaultPSlip: number;
  /** Upper bound for the per-question guess rate 1 / options. */
  maxPGuess: number;
}

export const DEFAULT_MASTERY_CONFIG: MasteryConfig = {
  masteryThreshold: 0.8,
  testSize: 5,
  testPassCount: 4,
  minPracticeBeforeRetest: 3,
  stuckAttempts: 20,
  stuckPKnown: 0.5,
  reviewIntervalsDays: [3, 7, 14],
  reviewWrongsToRelapse: 2,
  relapsePKnown: 0.6,
  easyBelow: 0.4,
  hardAbove: 0.7,
  sessionSize: 10,
  maxReviewsPerSession: 2,
  maxDiagnosticsPerSession: 6,
  maxPracticePerSkillPerSession: 4,
  diagnosticPerSkill: 2,
  minQuestionsPerSkill: 12,
  recentExcludeDays: 7,
  defaultPInit: 0.2,
  defaultPTransit: 0.1,
  defaultPSlip: 0.1,
  maxPGuess: 0.34,
};

export const MASTERY_CONFIG_KEY = 'mastery_config';

function isProbability(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v > 0;
}

const PROBABILITY_KEYS = [
  'masteryThreshold', 'stuckPKnown', 'relapsePKnown', 'easyBelow', 'hardAbove',
  'defaultPInit', 'defaultPTransit', 'defaultPSlip', 'maxPGuess',
] as const;

const INT_KEYS = [
  'testSize', 'testPassCount', 'minPracticeBeforeRetest', 'stuckAttempts',
  'reviewWrongsToRelapse', 'sessionSize', 'maxReviewsPerSession',
  'maxDiagnosticsPerSession', 'maxPracticePerSkillPerSession', 'diagnosticPerSkill', 'minQuestionsPerSkill',
  'recentExcludeDays',
] as const;

/**
 * Merge an untrusted override object over the defaults, keeping only valid
 * fields. Returns the merged config and the list of rejected keys.
 */
export function mergeMasteryConfig(
  override: unknown,
  base: MasteryConfig = DEFAULT_MASTERY_CONFIG,
): { config: MasteryConfig; rejected: string[] } {
  const config: MasteryConfig = { ...base, reviewIntervalsDays: [...base.reviewIntervalsDays] };
  const rejected: string[] = [];
  if (!override || typeof override !== 'object') return { config, rejected };
  const o = override as Record<string, unknown>;

  for (const key of PROBABILITY_KEYS) {
    if (key in o) {
      if (isProbability(o[key])) config[key] = o[key];
      else rejected.push(key);
    }
  }
  for (const key of INT_KEYS) {
    if (key in o) {
      if (isPositiveInt(o[key])) config[key] = o[key];
      else rejected.push(key);
    }
  }
  if ('reviewIntervalsDays' in o) {
    const v = o.reviewIntervalsDays;
    if (Array.isArray(v) && v.length > 0 && v.every(isPositiveInt)) config.reviewIntervalsDays = [...v];
    else rejected.push('reviewIntervalsDays');
  }

  // Cross-field sanity: fall back to defaults for inconsistent pairs.
  if (config.testPassCount > config.testSize) {
    config.testPassCount = base.testPassCount;
    config.testSize = base.testSize;
    rejected.push('testPassCount');
  }
  if (config.easyBelow > config.hardAbove) {
    config.easyBelow = base.easyBelow;
    config.hardAbove = base.hardAbove;
    rejected.push('easyBelow');
  }
  return { config, rejected };
}
