import { describe, it, expect } from 'vitest';
import {
  bktPosterior, bktUpdate, difficultyFor, createState, applyAnswer, applyRemediation,
  reactivateAfterMastery, chooseNext, seedFromHistory, fitBkt, isUnlocked, guessFor,
  type BktParams, type SkillState,
} from '@/lib/mastery/engine';
import { DEFAULT_MASTERY_CONFIG as CFG, mergeMasteryConfig } from '@/lib/mastery/config';
import {
  SKILLS_6_9, buildSourceIndex, effectivePrerequisites, skillKeyForQuestion, type MasterySkill,
} from '@/lib/mastery/taxonomy';

const NOW = new Date('2026-10-19T10:00:00.000Z');
const P: BktParams = { pInit: 0.2, pTransit: 0.1, pSlip: 0.1, pGuess: 0.25 };

function st(key: string, over: Partial<SkillState> = {}): SkillState {
  return { ...createState(key, P, CFG), ...over };
}

function answer(state: SkillState, isCorrect: boolean, purpose: 'practice' | 'diagnostic' | 'test' | 'review' = 'practice', unlocked = true) {
  return applyAnswer({ state, purpose, isCorrect, params: P, optionCount: 4, unlocked, config: CFG, now: NOW });
}

// Small graph: A → B → C, D independent, X excluded (between A and E)
const G: MasterySkill[] = [
  { key: 'A', nameAr: 'أ', area: 'quantitative', order: 1, prerequisites: [], sources: [] },
  { key: 'B', nameAr: 'ب', area: 'quantitative', order: 2, prerequisites: ['A'], sources: [] },
  { key: 'C', nameAr: 'ج', area: 'quantitative', order: 3, prerequisites: ['B'], sources: [] },
  { key: 'D', nameAr: 'د', area: 'verbal', order: 4, prerequisites: [], sources: [] },
  { key: 'X', nameAr: 'س', area: 'verbal', order: 5, prerequisites: ['A'], sources: [] },
  { key: 'E', nameAr: 'هـ', area: 'verbal', order: 6, prerequisites: ['X'], sources: [] },
];
const ELIGIBLE = new Set(['A', 'B', 'C', 'D', 'E']);

function stateMap(...states: SkillState[]) {
  return new Map(states.map((s) => [s.skillKey, s]));
}

// ─── BKT math ───────────────────────────────────────────────────────────────

describe('BKT equations', () => {
  it('posterior after a correct answer matches the closed form', () => {
    // 0.2·0.9 / (0.2·0.9 + 0.8·0.25) = 0.18 / 0.38
    expect(bktPosterior(0.2, true, 0.1, 0.25)).toBeCloseTo(0.18 / 0.38, 10);
  });

  it('posterior after a wrong answer matches the closed form', () => {
    // 0.2·0.1 / (0.2·0.1 + 0.8·0.75) = 0.02 / 0.62
    expect(bktPosterior(0.2, false, 0.1, 0.25)).toBeCloseTo(0.02 / 0.62, 10);
  });

  it('applies the learning transition after the posterior', () => {
    const { posterior, next } = bktUpdate(0.2, true, 0.1, 0.25, 0.1);
    expect(next).toBeCloseTo(posterior + (1 - posterior) * 0.1, 10);
  });

  it('correct answers raise and wrong answers lower the estimate', () => {
    expect(bktUpdate(0.5, true, 0.1, 0.25, 0).next).toBeGreaterThan(0.5);
    expect(bktUpdate(0.5, false, 0.1, 0.25, 0).next).toBeLessThan(0.5);
  });

  it('stays within [0,1] at the extremes', () => {
    for (const p of [0, 1]) {
      for (const c of [true, false]) {
        const { next } = bktUpdate(p, c, 0.1, 0.25, 0.1);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThanOrEqual(1);
      }
    }
  });

  it('guess defaults to 1/options, capped', () => {
    const noGuess = { ...P, pGuess: null };
    expect(guessFor(noGuess, 4, CFG)).toBe(0.25);
    expect(guessFor(noGuess, 2, CFG)).toBe(CFG.maxPGuess);
    expect(guessFor(P, 2, CFG)).toBe(0.25);
  });

  it('maps P(L) to difficulty bands', () => {
    expect(difficultyFor(0.39, CFG)).toBe('easy');
    expect(difficultyFor(0.4, CFG)).toBe('medium');
    expect(difficultyFor(0.7, CFG)).toBe('medium');
    expect(difficultyFor(0.71, CFG)).toBe('hard');
  });
});

// ─── Learning → test → mastered ─────────────────────────────────────────────

describe('applyAnswer: mastery cycle', () => {
  it('starts a parallel test once P(L) crosses the threshold', () => {
    let s = st('A');
    let started = false;
    for (let i = 0; i < 10 && !started; i++) {
      const r = answer(s, true);
      s = r.state;
      started = r.events.includes('test_started');
    }
    expect(started).toBe(true);
    expect(s.status).toBe('testing');
    expect(s.pKnown).toBeGreaterThanOrEqual(CFG.masteryThreshold);
  });

  it('does not start a test on a locked skill', () => {
    const r = answer(st('B', { pKnown: 0.95 }), true, 'diagnostic', false);
    expect(r.state.status).toBe('learning');
    expect(r.decisions.map((d) => d.rule)).toContain('locked_observation');
  });

  it('passes the test at 4/5 and schedules the first review', () => {
    let s = st('A', { status: 'testing' });
    const results = [true, false, true, true, true];
    let last;
    for (const c of results) {
      last = answer(s, c, 'test');
      s = last.state;
      if (s.status !== 'testing') break;
    }
    expect(s.status).toBe('mastered');
    expect(last!.events).toContain('mastered');
    expect(s.masteredAt).toBe(NOW.toISOString());
    expect(s.nextReviewAt).toBe(new Date(NOW.getTime() + 3 * 86_400_000).toISOString());
  });

  it('passes early at 4/4', () => {
    let s = st('A', { status: 'testing' });
    for (let i = 0; i < 4; i++) s = answer(s, true, 'test').state;
    expect(s.status).toBe('mastered');
  });

  it('fails early once more than 1 answer is wrong', () => {
    let s = st('A', { status: 'testing' });
    s = answer(s, false, 'test').state;
    expect(s.status).toBe('testing');
    const r = answer(s, false, 'test');
    expect(r.state.status).toBe('learning');
    expect(r.events).toContain('test_failed');
    expect(r.state.practiceSinceTest).toBe(0);
    expect(r.state.testResults).toEqual([]);
  });

  it('requires minimum practice before a retest', () => {
    let s = st('A', { pKnown: 0.95, practiceSinceTest: 0 });
    s = answer(s, true).state;
    s = answer(s, true).state;
    expect(s.status).toBe('learning');
    s = answer(s, true).state;
    expect(s.status).toBe('testing');
  });

  it('test answers still update BKT', () => {
    const r = answer(st('A', { status: 'testing', pKnown: 0.85 }), false, 'test');
    expect(r.state.pKnown).toBeLessThan(0.85);
    expect(r.decisions[0].rule).toBe('bkt_update');
  });
});

describe('applyAnswer: stuck rule', () => {
  it('fires after enough attempts with low P(L)', () => {
    const r = answer(st('A', { attemptsInStatus: CFG.stuckAttempts - 1, pKnown: 0.1 }), false);
    expect(r.events).toContain('stuck');
  });

  it('does not fire before the attempt threshold', () => {
    const r = answer(st('A', { attemptsInStatus: 5, pKnown: 0.1 }), false);
    expect(r.events).not.toContain('stuck');
  });

  it('does not fire when P(L) is at or above the stuck floor', () => {
    const r = answer(st('A', { attemptsInStatus: 30, pKnown: 0.7 }), true);
    expect(r.events).not.toContain('stuck');
  });
});

describe('applyAnswer: spaced review', () => {
  const mastered = () => st('A', {
    status: 'mastered', masteredAt: '2026-10-01T00:00:00.000Z', pKnown: 0.95,
    nextReviewAt: '2026-10-18T00:00:00.000Z', reviewStage: 0,
  });

  it('advances the review stage on a correct review (3 → 7 days)', () => {
    const r = answer(mastered(), true, 'review');
    expect(r.state.reviewStage).toBe(1);
    expect(r.state.nextReviewAt).toBe(new Date(NOW.getTime() + 7 * 86_400_000).toISOString());
  });

  it('stops scheduling after the last interval', () => {
    const r = answer({ ...mastered(), reviewStage: 2 }, true, 'review');
    expect(r.state.nextReviewAt).toBeNull();
  });

  it('relapses to learning with P(L)=0.6 after two wrong reviews', () => {
    let s = answer(mastered(), false, 'review').state;
    expect(s.status).toBe('mastered');
    const r = answer(s, false, 'review');
    s = r.state;
    expect(s.status).toBe('learning');
    expect(s.pKnown).toBe(CFG.relapsePKnown);
    expect(s.masteredAt).not.toBeNull(); // still counts for unlocking
    expect(r.events).toContain('relapsed');
  });
});

// ─── Graph rules ────────────────────────────────────────────────────────────

describe('unlocking', () => {
  it('opens a skill only when its prerequisites were mastered', () => {
    const states = stateMap(st('A'), st('B'), st('C'));
    expect(isUnlocked('A', states, G, ELIGIBLE)).toBe(true);
    expect(isUnlocked('B', states, G, ELIGIBLE)).toBe(false);
    states.set('A', st('A', { masteredAt: 'x', status: 'mastered' }));
    expect(isUnlocked('B', states, G, ELIGIBLE)).toBe(true);
  });

  it('walks through excluded prerequisites', () => {
    expect(effectivePrerequisites('E', G, ELIGIBLE)).toEqual(['A']);
  });
});

describe('remediation', () => {
  it('reopens the weakest prerequisite and defers the stuck skill', () => {
    const states = stateMap(
      st('A', { status: 'mastered', masteredAt: 'x', pKnown: 0.82 }),
      st('B', { status: 'learning', pKnown: 0.2 }),
    );
    const { changed, decisions } = applyRemediation(states, 'B', G, ELIGIBLE, NOW);
    const b = changed.find((s) => s.skillKey === 'B')!;
    const a = changed.find((s) => s.skillKey === 'A')!;
    expect(b.status).toBe('deferred');
    expect(b.deferredReason).toBe('needs_prereq:A');
    expect(a.status).toBe('learning');
    expect(a.remediationFor).toBe('B');
    expect(a.masteredAt).toBe('x');
    expect(decisions[0].rule).toBe('remediate_prerequisite');
  });

  it('defers without prerequisite (soft gate)', () => {
    const states = stateMap(st('D', { pKnown: 0.1 }));
    const { changed, decisions } = applyRemediation(states, 'D', G, ELIGIBLE, NOW);
    expect(changed[0].deferredReason).toBe('stuck_no_prereq');
    expect(decisions[0].rule).toBe('defer_soft_gate');
  });

  it('reactivates skills waiting on a newly mastered prerequisite', () => {
    const states = stateMap(
      st('A', { status: 'mastered', masteredAt: 'x' }),
      st('B', { status: 'deferred', deferredReason: 'needs_prereq:A' }),
      st('C', { status: 'deferred', deferredReason: 'needs_prereq:B' }),
      st('D', { status: 'deferred', deferredReason: 'stuck_no_prereq' }),
    );
    const { changed } = reactivateAfterMastery(states, 'A', NOW);
    expect(changed.map((s) => s.skillKey).sort()).toEqual(['B', 'D']);
    expect(changed.every((s) => s.status === 'learning')).toBe(true);
  });
});

// ─── Next-question policy ───────────────────────────────────────────────────

describe('chooseNext', () => {
  const base = { skills: G, eligible: ELIGIBLE, reviewsServed: 0, diagnosticsServed: 99, config: CFG, now: NOW };

  it('prioritises an open parallel test', () => {
    const states = stateMap(
      st('A', { status: 'mastered', masteredAt: 'x', nextReviewAt: '2026-01-01T00:00:00.000Z' }),
      st('D', { status: 'testing', observations: 5 }),
    );
    expect(chooseNext({ ...base, states })!.purpose).toBe('test');
  });

  it('serves due reviews next, capped per session', () => {
    const states = stateMap(
      st('A', { status: 'mastered', masteredAt: 'x', nextReviewAt: '2026-10-18T00:00:00.000Z' }),
      st('D', { observations: 5 }),
    );
    expect(chooseNext({ ...base, states })!.purpose).toBe('review');
    const capped = chooseNext({ ...base, states, reviewsServed: CFG.maxReviewsPerSession });
    expect(capped!.purpose).toBe('practice');
    expect(capped!.skillKey).toBe('D');
  });

  it('runs a short diagnostic on skills without evidence', () => {
    const states = stateMap(st('A', { observations: 10 }), st('D', { observations: 0 }));
    const c = chooseNext({ ...base, states, diagnosticsServed: 0 })!;
    expect(c.purpose).toBe('diagnostic');
    expect(c.skillKey).toBe('D');
  });

  it('practices the first open skill in teaching order with P(L)-based difficulty', () => {
    const states = stateMap(
      st('A', { observations: 5, pKnown: 0.3 }),
      st('D', { observations: 5, pKnown: 0.9 }),
    );
    const c = chooseNext({ ...base, states })!;
    expect(c.skillKey).toBe('A');
    expect(c.difficulty).toBe('easy');
  });

  it('prefers a reopened prerequisite (remediation)', () => {
    const states = stateMap(
      st('A', { observations: 5, status: 'learning', masteredAt: 'x', remediationFor: 'B' }),
      st('B', { status: 'deferred', deferredReason: 'needs_prereq:A' }),
      st('D', { observations: 5 }),
    );
    const states2 = new Map(states);
    // D comes later in order anyway; make D earlier to prove the preference
    const g2 = G.map((s) => (s.key === 'D' ? { ...s, order: 0 } : s));
    const c = chooseNext({ ...base, skills: g2, states: states2 })!;
    expect(c.skillKey).toBe('A');
    expect(c.reason.rule).toBe('select_remediation');
  });

  it('revives the oldest deferred skill when nothing else is open', () => {
    const states = stateMap(
      st('A', { status: 'deferred', deferredReason: 'stuck_no_prereq', updatedAt: '2026-10-10', observations: 5 }),
      st('D', { status: 'deferred', deferredReason: 'stuck_no_prereq', updatedAt: '2026-10-01', observations: 5 }),
    );
    const c = chooseNext({ ...base, eligible: new Set(['A', 'D']), states })!;
    expect(c.skillKey).toBe('D');
    expect(c.stateChange?.status).toBe('learning');
  });

  it('falls back to maintenance when everything is mastered', () => {
    const states = stateMap(
      st('A', { status: 'mastered', masteredAt: 'x', pKnown: 0.9, observations: 5 }),
      st('D', { status: 'mastered', masteredAt: 'x', pKnown: 0.85, observations: 5 }),
    );
    const c = chooseNext({ ...base, eligible: new Set(['A', 'D']), states })!;
    expect(c.skillKey).toBe('D');
    expect(c.reason.rule).toBe('select_maintenance');
  });

  it('skips exhausted skills', () => {
    const states = stateMap(st('A', { observations: 5 }), st('D', { observations: 5 }));
    const c = chooseNext({ ...base, states, exhausted: new Set(['A']) })!;
    expect(c.skillKey).toBe('D');
  });
});

// ─── Seeding & calibration ──────────────────────────────────────────────────

describe('seedFromHistory', () => {
  it('replays history through BKT without marking anything mastered', () => {
    const history = Array.from({ length: 12 }, () => ({ skillKey: 'A', isCorrect: true, optionCount: 4 }));
    const states = seedFromHistory(['A', 'D'], history, () => P, CFG);
    expect(states.get('A')!.pKnown).toBeGreaterThan(0.95);
    expect(states.get('A')!.observations).toBe(12);
    expect(states.get('A')!.status).toBe('learning');
    expect(states.get('D')!.observations).toBe(0);
    expect(states.get('D')!.pKnown).toBe(P.pInit);
  });
});

describe('fitBkt', () => {
  it('returns null without data', () => {
    expect(fitBkt([])).toBeNull();
  });

  it('fits a higher prior for children who mostly answer correctly', () => {
    const strong = Array.from({ length: 20 }, () => [true, true, true, true, false, true]);
    const weak = Array.from({ length: 20 }, () => [false, false, true, false, false, false]);
    const fs = fitBkt(strong)!;
    const fw = fitBkt(weak)!;
    expect(fs.params.pInit).toBeGreaterThan(fw.params.pInit);
    expect(fs.sampleSize).toBe(120);
  });
});

// ─── Config & taxonomy ──────────────────────────────────────────────────────

describe('mergeMasteryConfig', () => {
  it('accepts valid overrides and rejects invalid ones', () => {
    const { config, rejected } = mergeMasteryConfig({ masteryThreshold: 0.85, testSize: -1, foo: 1 });
    expect(config.masteryThreshold).toBe(0.85);
    expect(config.testSize).toBe(CFG.testSize);
    expect(rejected).toEqual(['testSize']);
  });

  it('rejects a pass count larger than the test', () => {
    const { config, rejected } = mergeMasteryConfig({ testSize: 3, testPassCount: 4 });
    expect(config.testPassCount).toBeLessThanOrEqual(config.testSize);
    expect(rejected).toContain('testPassCount');
  });
});

describe('6-9 taxonomy', () => {
  it('maps every source pair to exactly one skill', () => {
    expect(() => buildSourceIndex(SKILLS_6_9)).not.toThrow();
  });

  it('merges English and Arabic duplicates', () => {
    const idx = buildSourceIndex(SKILLS_6_9);
    expect(skillKeyForQuestion(idx, 'quantitative', 'geometry')).toBe('q_geometry');
    expect(skillKeyForQuestion(idx, 'quantitative', 'الهندسة')).toBe('q_geometry');
    expect(skillKeyForQuestion(idx, 'verbal', 'unknown')).toBeNull();
  });

  it('maps the English sub-skill names found in production', () => {
    const idx = buildSourceIndex(SKILLS_6_9);
    const expected: Array<[string, string, string]> = [
      ['quantitative', 'basic_operations', 'q_add_sub'],
      ['quantitative', 'multiplication', 'q_mul_div'],
      ['quantitative', 'division', 'q_mul_div'],
      ['verbal', 'analogies', 'v_analogy'],
      ['logical_patterns', 'pattern_completion', 'l_visual_patterns'],
      ['verbal', 'antonyms', 'v_vocabulary'],
      ['verbal', 'synonyms', 'v_vocabulary'],
      ['logical_patterns', 'number_sequences', 'l_number_sequences'],
      ['quantitative', 'number_sequences', 'l_number_sequences'],
      ['logical_patterns', 'rules', 'l_number_sequences'],
      ['logical_patterns', 'deductive_reasoning', 'l_reasoning'],
      ['logical_patterns', 'if_then', 'l_reasoning'],
      ['logical_patterns', 'comparison', 'l_reasoning'],
      ['logical_patterns', 'spatial', 'l_reasoning'],
      ['quantitative', 'number_comparison', 'q_comparison'],
      ['verbal', 'categories', 'v_odd_one_out'],
      ['verbal', 'comprehension', 'v_reading'],
    ];
    for (const [area, sub, key] of expected) expect(skillKeyForQuestion(idx, area, sub)).toBe(key);
    for (const sub of ['grammar', 'plurals', 'proverbs', 'general_knowledge']) {
      expect(skillKeyForQuestion(idx, 'verbal', sub)).toBeNull();
    }
  });

  it('only references known prerequisites and has no cycles', () => {
    const keys = new Set(SKILLS_6_9.map((s) => s.key));
    const byKey = new Map(SKILLS_6_9.map((s) => [s.key, s]));
    for (const s of SKILLS_6_9) {
      for (const p of s.prerequisites) expect(keys.has(p)).toBe(true);
    }
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (k: string) => {
      expect(visiting.has(k)).toBe(false);
      if (done.has(k)) return;
      visiting.add(k);
      byKey.get(k)!.prerequisites.forEach(visit);
      visiting.delete(k);
      done.add(k);
    };
    SKILLS_6_9.forEach((s) => visit(s.key));
  });
});
