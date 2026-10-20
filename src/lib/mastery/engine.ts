/**
 * Adaptive-mastery engine — pure functions only (no DB, no clock).
 *
 * Model: Bayesian Knowledge Tracing per child × skill.
 *   correct: P(L|✓) = P(L)(1−S) / [P(L)(1−S) + (1−P(L))G]
 *   wrong:   P(L|✗) = P(L)S     / [P(L)S     + (1−P(L))(1−G)]
 *   learn:   P(L)ₙₑₓₜ = P(L|obs) + (1 − P(L|obs))·T
 *
 * Mastery cycle (Bloom): learning → (P(L) ≥ threshold) → parallel test
 *   → pass: mastered + spaced reviews │ fail: back to learning.
 * Every rule that fires is returned as a Decision so the admin page can
 * explain exactly why the engine did what it did.
 */

import type { MasteryConfig } from './config';
import { effectivePrerequisites, type MasterySkill } from './taxonomy';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BktParams {
  pInit: number;
  pTransit: number;
  pSlip: number;
  /** null → use 1 / number of options for each question. */
  pGuess: number | null;
}

export type SkillStatus = 'learning' | 'testing' | 'mastered' | 'deferred';
export type Purpose = 'practice' | 'diagnostic' | 'test' | 'review';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface SkillState {
  skillKey: string;
  pKnown: number;
  status: SkillStatus;
  observations: number;
  attemptsInStatus: number;
  practiceSinceTest: number;
  testQuestionIds: string[];
  testResults: boolean[];
  reviewStage: number;
  nextReviewAt: string | null;
  reviewWrongs: number;
  deferredReason: string | null;
  remediationFor: string | null;
  /** Set the first time the skill is mastered; never cleared (drives unlocking). */
  masteredAt: string | null;
  updatedAt: string | null;
}

export interface Decision {
  rule: string;
  message: string;
  skillKey?: string;
  values?: Record<string, number | string | boolean | null>;
}

export type EngineEvent = 'test_started' | 'mastered' | 'test_failed' | 'relapsed' | 'stuck' | 'review_passed';

export interface NextChoice {
  skillKey: string;
  purpose: Purpose;
  difficulty: Difficulty;
  reason: Decision;
  /** Present when choosing this skill also changes its state (reactivation). */
  stateChange?: SkillState;
}

const DAY_MS = 86_400_000;

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function addDays(now: Date, days: number): string {
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

// ─── BKT ────────────────────────────────────────────────────────────────────

export function guessFor(params: BktParams, optionCount: number, config: MasteryConfig): number {
  if (params.pGuess !== null) return params.pGuess;
  const g = optionCount > 0 ? 1 / optionCount : 0.25;
  return Math.min(g, config.maxPGuess);
}

export function bktPosterior(pKnown: number, isCorrect: boolean, slip: number, guess: number): number {
  const p = clamp01(pKnown);
  const num = isCorrect ? p * (1 - slip) : p * slip;
  const den = isCorrect
    ? p * (1 - slip) + (1 - p) * guess
    : p * slip + (1 - p) * (1 - guess);
  if (den <= 0) return p;
  return num / den;
}

export function bktUpdate(
  pKnown: number,
  isCorrect: boolean,
  slip: number,
  guess: number,
  transit: number,
): { posterior: number; next: number } {
  const posterior = bktPosterior(pKnown, isCorrect, slip, guess);
  const next = posterior + (1 - posterior) * transit;
  return { posterior, next: clamp01(next) };
}

/** Probability the next answer is correct under the current estimate. */
export function predictCorrect(pKnown: number, slip: number, guess: number): number {
  return pKnown * (1 - slip) + (1 - pKnown) * guess;
}

export function difficultyFor(pKnown: number, config: MasteryConfig): Difficulty {
  if (pKnown < config.easyBelow) return 'easy';
  if (pKnown > config.hardAbove) return 'hard';
  return 'medium';
}

// ─── State helpers ──────────────────────────────────────────────────────────

export function createState(skillKey: string, params: BktParams, config: MasteryConfig): SkillState {
  return {
    skillKey,
    pKnown: params.pInit,
    status: 'learning',
    observations: 0,
    attemptsInStatus: 0,
    // A skill that was never tested may be tested as soon as P(L) qualifies.
    practiceSinceTest: config.minPracticeBeforeRetest,
    testQuestionIds: [],
    testResults: [],
    reviewStage: 0,
    nextReviewAt: null,
    reviewWrongs: 0,
    deferredReason: null,
    remediationFor: null,
    masteredAt: null,
    updatedAt: null,
  };
}

export function isUnlocked(
  skillKey: string,
  states: Map<string, SkillState>,
  skills: MasterySkill[],
  eligible: Set<string>,
): boolean {
  return effectivePrerequisites(skillKey, skills, eligible)
    .every((key) => Boolean(states.get(key)?.masteredAt));
}

// ─── Answer → state transition ──────────────────────────────────────────────

export interface ApplyAnswerInput {
  state: SkillState;
  purpose: Purpose;
  isCorrect: boolean;
  params: BktParams;
  optionCount: number;
  unlocked: boolean;
  config: MasteryConfig;
  now: Date;
}

export interface ApplyAnswerResult {
  state: SkillState;
  decisions: Decision[];
  events: EngineEvent[];
}

export function applyAnswer(input: ApplyAnswerInput): ApplyAnswerResult {
  const { purpose, isCorrect, params, config, now, unlocked } = input;
  const before = input.state;
  const s: SkillState = {
    ...before,
    testQuestionIds: [...before.testQuestionIds],
    testResults: [...before.testResults],
    updatedAt: now.toISOString(),
  };
  const decisions: Decision[] = [];
  const events: EngineEvent[] = [];
  const key = s.skillKey;

  // 1. BKT update — always.
  const guess = guessFor(params, input.optionCount, config);
  const { posterior, next } = bktUpdate(s.pKnown, isCorrect, params.pSlip, guess, params.pTransit);
  decisions.push({
    rule: 'bkt_update',
    skillKey: key,
    message: isCorrect
      ? 'إجابة صحيحة: P(L|✓) = P(L)(1−S) / [P(L)(1−S) + (1−P(L))G] ثم P(L) + (1−P(L))T'
      : 'إجابة خاطئة: P(L|✗) = P(L)S / [P(L)S + (1−P(L))(1−G)] ثم P(L) + (1−P(L))T',
    values: {
      p_before: round4(s.pKnown),
      posterior: round4(posterior),
      p_after: round4(next),
      S: params.pSlip,
      G: round4(guess),
      T: params.pTransit,
    },
  });
  s.pKnown = next;
  s.observations += 1;
  s.attemptsInStatus += 1;

  // 2. Parallel test answer.
  if (purpose === 'test' && s.status === 'testing') {
    s.testResults.push(isCorrect);
    const correct = s.testResults.filter(Boolean).length;
    const wrong = s.testResults.length - correct;
    const maxWrong = config.testSize - config.testPassCount;

    if (correct >= config.testPassCount) {
      s.status = 'mastered';
      s.masteredAt = s.masteredAt ?? now.toISOString();
      s.reviewStage = 0;
      s.reviewWrongs = 0;
      s.nextReviewAt = addDays(now, config.reviewIntervalsDays[0]);
      s.attemptsInStatus = 0;
      s.remediationFor = null;
      s.deferredReason = null;
      events.push('mastered');
      decisions.push({
        rule: 'test_passed',
        skillKey: key,
        message: `if صحيح ≥ ${config.testPassCount}/${config.testSize} في الاختبار الموازي → «أتقن» ومراجعة بعد ${config.reviewIntervalsDays[0]} أيام`,
        values: { correct, answered: s.testResults.length, next_review_at: s.nextReviewAt },
      });
      s.testQuestionIds = [];
      s.testResults = [];
    } else if (wrong > maxWrong) {
      s.status = 'learning';
      s.practiceSinceTest = 0;
      s.attemptsInStatus = 0;
      events.push('test_failed');
      decisions.push({
        rule: 'test_failed',
        skillKey: key,
        message: `if خطأ > ${maxWrong} في الاختبار الموازي → يعود «جاريًا» ويحتاج ${config.minPracticeBeforeRetest} تمارين قبل إعادة الاختبار`,
        values: { correct, wrong, answered: s.testResults.length },
      });
      s.testQuestionIds = [];
      s.testResults = [];
    } else {
      decisions.push({
        rule: 'test_continue',
        skillKey: key,
        message: 'الاختبار الموازي مستمر',
        values: { correct, wrong, answered: s.testResults.length, test_size: config.testSize },
      });
    }
    return { state: s, decisions, events };
  }

  // 3. Spaced review of a mastered skill.
  if (purpose === 'review' && s.status === 'mastered') {
    if (isCorrect) {
      s.reviewStage += 1;
      const interval = config.reviewIntervalsDays[s.reviewStage];
      s.nextReviewAt = interval !== undefined ? addDays(now, interval) : null;
      events.push('review_passed');
      decisions.push({
        rule: 'review_passed',
        skillKey: key,
        message: interval !== undefined
          ? `مراجعة صحيحة → المراجعة التالية بعد ${interval} يومًا`
          : 'مراجعة صحيحة → اكتملت جدولة المراجعات',
        values: { review_stage: s.reviewStage, next_review_at: s.nextReviewAt },
      });
    } else {
      s.reviewWrongs += 1;
      if (s.reviewWrongs >= config.reviewWrongsToRelapse) {
        s.status = 'learning';
        s.pKnown = config.relapsePKnown;
        s.practiceSinceTest = 0;
        s.attemptsInStatus = 0;
        s.reviewStage = 0;
        s.nextReviewAt = null;
        s.reviewWrongs = 0;
        events.push('relapsed');
        decisions.push({
          rule: 'review_relapse',
          skillKey: key,
          message: `if خطأ ${config.reviewWrongsToRelapse} مرات في مراجعة مهارة مُتقنة → تعود «جارية» و P(L) = ${config.relapsePKnown}`,
          values: { p_after: config.relapsePKnown },
        });
      } else {
        s.nextReviewAt = addDays(now, 1);
        decisions.push({
          rule: 'review_wrong',
          skillKey: key,
          message: 'مراجعة خاطئة → إعادة المراجعة غدًا',
          values: { review_wrongs: s.reviewWrongs, next_review_at: s.nextReviewAt },
        });
      }
    }
    return { state: s, decisions, events };
  }

  // 4. Practice / diagnostic on a learning skill.
  if (s.status === 'learning' || s.status === 'deferred') {
    s.practiceSinceTest += 1;

    if (!unlocked) {
      decisions.push({
        rule: 'locked_observation',
        skillKey: key,
        message: 'المهارة مقفلة (متطلباتها لم تُتقن بعد): يُحدَّث التقدير فقط',
      });
      return { state: s, decisions, events };
    }

    if (s.status === 'learning'
      && s.pKnown >= config.masteryThreshold
      && s.practiceSinceTest >= config.minPracticeBeforeRetest) {
      s.status = 'testing';
      s.testQuestionIds = [];
      s.testResults = [];
      s.attemptsInStatus = 0;
      events.push('test_started');
      decisions.push({
        rule: 'start_parallel_test',
        skillKey: key,
        message: `if P(L) ≥ ${config.masteryThreshold} → اختبار موازٍ من ${config.testSize} أسئلة لم يرها الطفل`,
        values: { p_known: round4(s.pKnown) },
      });
      return { state: s, decisions, events };
    }

    if (s.status === 'learning'
      && s.attemptsInStatus >= config.stuckAttempts
      && s.pKnown < config.stuckPKnown) {
      events.push('stuck');
      decisions.push({
        rule: 'stuck',
        skillKey: key,
        message: `if إجابات المهارة ≥ ${config.stuckAttempts} و P(L) < ${config.stuckPKnown} → علاج`,
        values: { attempts: s.attemptsInStatus, p_known: round4(s.pKnown) },
      });
    }
  }

  return { state: s, decisions, events };
}

// ─── Graph-level rules ──────────────────────────────────────────────────────

/**
 * Remediation for a stuck skill: reopen its weakest effective prerequisite;
 * with no prerequisite, defer the skill so another one can open (soft gate).
 */
export function applyRemediation(
  states: Map<string, SkillState>,
  stuckKey: string,
  skills: MasterySkill[],
  eligible: Set<string>,
  now: Date,
): { changed: SkillState[]; decisions: Decision[] } {
  const stuck = states.get(stuckKey);
  if (!stuck) return { changed: [], decisions: [] };

  const prereqs = effectivePrerequisites(stuckKey, skills, eligible)
    .map((key) => states.get(key))
    .filter((st): st is SkillState => Boolean(st))
    .sort((a, b) => a.pKnown - b.pKnown);
  const weakest = prereqs[0];
  const iso = now.toISOString();

  if (weakest) {
    const reopened: SkillState = {
      ...weakest,
      status: 'learning',
      practiceSinceTest: 0,
      attemptsInStatus: 0,
      testQuestionIds: [],
      testResults: [],
      remediationFor: stuckKey,
      updatedAt: iso,
    };
    const deferred: SkillState = {
      ...stuck,
      status: 'deferred',
      deferredReason: `needs_prereq:${weakest.skillKey}`,
      attemptsInStatus: 0,
      updatedAt: iso,
    };
    return {
      changed: [deferred, reopened],
      decisions: [{
        rule: 'remediate_prerequisite',
        skillKey: stuckKey,
        message: 'علاج: الرجوع إلى المتطلب السابق الأضعف، وتأجيل المهارة حتى يُتقَن من جديد',
        values: { prerequisite: weakest.skillKey, prerequisite_p: round4(weakest.pKnown) },
      }],
    };
  }

  const deferred: SkillState = {
    ...stuck,
    status: 'deferred',
    deferredReason: 'stuck_no_prereq',
    attemptsInStatus: 0,
    updatedAt: iso,
  };
  return {
    changed: [deferred],
    decisions: [{
      rule: 'defer_soft_gate',
      skillKey: stuckKey,
      message: 'if لا يوجد متطلب سابق → تأجيل المهارة وفتح مهارة موازية (البوابة المرنة)',
    }],
  };
}

/** After a mastery, bring back skills that were waiting on it (or on any progress). */
export function reactivateAfterMastery(
  states: Map<string, SkillState>,
  masteredKey: string,
  now: Date,
): { changed: SkillState[]; decisions: Decision[] } {
  const changed: SkillState[] = [];
  const decisions: Decision[] = [];
  for (const st of states.values()) {
    if (st.status !== 'deferred' || st.skillKey === masteredKey) continue;
    const waitsOnThis = st.deferredReason === `needs_prereq:${masteredKey}`;
    const softDeferred = st.deferredReason === 'stuck_no_prereq';
    if (!waitsOnThis && !softDeferred) continue;
    changed.push({
      ...st,
      status: 'learning',
      deferredReason: null,
      attemptsInStatus: 0,
      updatedAt: now.toISOString(),
    });
    decisions.push({
      rule: 'reactivate_deferred',
      skillKey: st.skillKey,
      message: waitsOnThis
        ? 'أُتقن المتطلب السابق → تعود المهارة المؤجلة «جارية»'
        : 'أُتقنت مهارة أخرى → تعود المهارة المؤجلة «جارية» لمحاولة جديدة',
      values: { trigger: masteredKey },
    });
  }
  return { changed, decisions };
}

// ─── Next-question policy ───────────────────────────────────────────────────

export interface ChooseNextInput {
  states: Map<string, SkillState>;
  skills: MasterySkill[];
  eligible: Set<string>;
  reviewsServed: number;
  diagnosticsServed: number;
  /** Skills with no remaining servable question this session. */
  exhausted?: Set<string>;
  /** Practice questions already served per skill in this session (rotation cap). */
  practicedThisSession?: Map<string, number>;
  config: MasteryConfig;
  now: Date;
}

export function chooseNext(input: ChooseNextInput): NextChoice | null {
  const { states, skills, eligible, config, now } = input;
  const exhausted = input.exhausted ?? new Set<string>();
  const ordered = skills
    .filter((sk) => eligible.has(sk.key) && !exhausted.has(sk.key))
    .sort((a, b) => a.order - b.order);
  const stateOf = (key: string) => states.get(key);
  const unlocked = (key: string) => isUnlocked(key, states, skills, eligible);

  // 1. Finish an open parallel test.
  for (const sk of ordered) {
    const st = stateOf(sk.key);
    if (st?.status === 'testing' && unlocked(sk.key)) {
      return {
        skillKey: sk.key,
        purpose: 'test',
        difficulty: 'medium',
        reason: {
          rule: 'select_test',
          skillKey: sk.key,
          message: 'اختبار موازٍ مفتوح لهذه المهارة',
          values: { answered: st.testResults.length, test_size: config.testSize },
        },
      };
    }
  }

  // 2. Due spaced reviews (most overdue first).
  if (input.reviewsServed < config.maxReviewsPerSession) {
    const due = ordered
      .map((sk) => stateOf(sk.key))
      .filter((st): st is SkillState => st?.status === 'mastered'
        && st.nextReviewAt !== null
        && new Date(st.nextReviewAt).getTime() <= now.getTime())
      .sort((a, b) => a.nextReviewAt!.localeCompare(b.nextReviewAt!));
    if (due[0]) {
      return {
        skillKey: due[0].skillKey,
        purpose: 'review',
        difficulty: 'medium',
        reason: {
          rule: 'select_review',
          skillKey: due[0].skillKey,
          message: 'مراجعة متباعدة مستحقة لمهارة مُتقنة',
          values: { due_at: due[0].nextReviewAt, review_stage: due[0].reviewStage },
        },
      };
    }
  }

  // 3. Short diagnostic for skills with no evidence yet.
  if (input.diagnosticsServed < config.maxDiagnosticsPerSession) {
    for (const sk of ordered) {
      const st = stateOf(sk.key);
      if (st && st.status !== 'mastered' && st.observations < config.diagnosticPerSkill) {
        return {
          skillKey: sk.key,
          purpose: 'diagnostic',
          difficulty: 'medium',
          reason: {
            rule: 'select_diagnostic',
            skillKey: sk.key,
            message: `تشخيص قصير: لا توجد بيانات كافية عن هذه المهارة (أقل من ${config.diagnosticPerSkill} إجابات)`,
            values: { observations: st.observations },
          },
        };
      }
    }
  }

  // 4. Practice the active skill: reopened prerequisites first, then teaching order.
  const learning = ordered
    .map((sk) => ({ sk, st: stateOf(sk.key) }))
    .filter((x): x is { sk: MasterySkill; st: SkillState } => x.st?.status === 'learning' && unlocked(x.sk.key));
  // Rotate: a skill that hit the per-session practice cap yields to the next open one.
  const practiced = input.practicedThisSession ?? new Map<string, number>();
  const underCap = learning.filter((x) => (practiced.get(x.sk.key) ?? 0) < config.maxPracticePerSkillPerSession);
  const candidates = underCap.length > 0 ? underCap : learning;
  const remediation = candidates.find((x) => x.st.remediationFor);
  const active = remediation ?? candidates[0];
  if (active) {
    const difficulty = difficultyFor(active.st.pKnown, config);
    return {
      skillKey: active.sk.key,
      purpose: 'practice',
      difficulty,
      reason: {
        rule: remediation ? 'select_remediation' : 'select_active_skill',
        skillKey: active.sk.key,
        message: remediation
          ? 'علاج: تمرين على متطلب سابق أُعيد فتحه'
          : 'أول مهارة مفتوحة غير مُتقنة حسب تسلسل التدريس',
        values: {
          p_known: round4(active.st.pKnown),
          difficulty,
          rule_difficulty: `P(L) < ${config.easyBelow} → سهل | ${config.easyBelow}–${config.hardAbove} → متوسط | > ${config.hardAbove} → صعب`,
        },
      },
    };
  }

  // 5. Everything open is deferred → bring back the one deferred longest.
  const deferred = ordered
    .map((sk) => stateOf(sk.key))
    .filter((st): st is SkillState => st?.status === 'deferred' && unlocked(st.skillKey))
    .sort((a, b) => (a.updatedAt ?? '').localeCompare(b.updatedAt ?? ''));
  if (deferred[0]) {
    const st = deferred[0];
    const revived: SkillState = {
      ...st,
      status: 'learning',
      deferredReason: null,
      attemptsInStatus: 0,
      updatedAt: now.toISOString(),
    };
    const difficulty = difficultyFor(st.pKnown, config);
    return {
      skillKey: st.skillKey,
      purpose: 'practice',
      difficulty,
      stateChange: revived,
      reason: {
        rule: 'select_deferred_fallback',
        skillKey: st.skillKey,
        message: 'كل المهارات المفتوحة مؤجلة → إعادة أقدم مهارة مؤجلة',
        values: { p_known: round4(st.pKnown), difficulty },
      },
    };
  }

  // 6. All mastered → keep practising the weakest mastered skill.
  const mastered = ordered
    .map((sk) => stateOf(sk.key))
    .filter((st): st is SkillState => st?.status === 'mastered')
    .sort((a, b) => a.pKnown - b.pKnown);
  if (mastered[0]) {
    return {
      skillKey: mastered[0].skillKey,
      purpose: 'practice',
      difficulty: 'hard',
      reason: {
        rule: 'select_maintenance',
        skillKey: mastered[0].skillKey,
        message: 'كل المهارات المتاحة مُتقنة → تمرين صيانة على الأضعف',
        values: { p_known: round4(mastered[0].pKnown) },
      },
    };
  }

  return null;
}

// ─── Seeding from history ───────────────────────────────────────────────────

export interface HistoryAnswer {
  skillKey: string;
  isCorrect: boolean;
  optionCount: number;
}

/**
 * Replay past answers (oldest first) through BKT to estimate where the child
 * stands. Nothing is marked mastered: the parallel test still has to confirm.
 */
export function seedFromHistory(
  skillKeys: string[],
  history: HistoryAnswer[],
  paramsFor: (skillKey: string) => BktParams,
  config: MasteryConfig,
): Map<string, SkillState> {
  const states = new Map<string, SkillState>();
  for (const key of skillKeys) states.set(key, createState(key, paramsFor(key), config));
  for (const a of history) {
    const st = states.get(a.skillKey);
    if (!st) continue;
    const params = paramsFor(a.skillKey);
    const guess = guessFor(params, a.optionCount, config);
    st.pKnown = bktUpdate(st.pKnown, a.isCorrect, params.pSlip, guess, params.pTransit).next;
    st.observations += 1;
  }
  return states;
}

// ─── Calibration (grid-search maximum likelihood) ───────────────────────────

export interface FitResult {
  params: BktParams;
  logLikelihood: number;
  sampleSize: number;
}

export function bktLogLikelihood(sequences: boolean[][], p: Required<{ [K in keyof BktParams]: number }>): number {
  let ll = 0;
  for (const seq of sequences) {
    let pL = p.pInit;
    for (const correct of seq) {
      const pc = clamp01(predictCorrect(pL, p.pSlip, p.pGuess));
      const prob = correct ? pc : 1 - pc;
      ll += Math.log(Math.max(prob, 1e-9));
      pL = bktUpdate(pL, correct, p.pSlip, p.pGuess, p.pTransit).next;
    }
  }
  return ll;
}

/**
 * Coarse grid search. Guess and slip are capped (G ≤ 0.35, S ≤ 0.3) to keep
 * the model identifiable — the standard BKT degeneracy guard.
 */
export function fitBkt(sequences: boolean[][]): FitResult | null {
  const sampleSize = sequences.reduce((n, s) => n + s.length, 0);
  if (sampleSize === 0) return null;
  const grid = (from: number, to: number, step: number) => {
    const out: number[] = [];
    for (let v = from; v <= to + 1e-9; v += step) out.push(round4(v));
    return out;
  };
  let best: FitResult | null = null;
  for (const pInit of grid(0.05, 0.8, 0.05)) {
    for (const pTransit of grid(0.02, 0.4, 0.02)) {
      for (const pSlip of grid(0.02, 0.3, 0.04)) {
        for (const pGuess of grid(0.1, 0.35, 0.05)) {
          const ll = bktLogLikelihood(sequences, { pInit, pTransit, pSlip, pGuess });
          if (!best || ll > best.logLikelihood) {
            best = { params: { pInit, pTransit, pSlip, pGuess }, logLikelihood: ll, sampleSize };
          }
        }
      }
    }
  }
  return best;
}
