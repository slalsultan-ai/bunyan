/**
 * Adaptive-mastery service: loads data, runs the pure engine, persists the
 * result and the reasons behind it. One question is chosen at a time, after
 * the previous answer has been scored on the server.
 */

import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { getDb } from '../db';
import {
  masteryAttempts, masteryBktParams, masterySessions, masterySkillState,
  questions, sessionAnswers, sessions, siteContent,
} from '../db/schema';
import { getTierCondition } from '../question-access';
import { DEFAULT_MASTERY_CONFIG, MASTERY_CONFIG_KEY, mergeMasteryConfig, type MasteryConfig } from './config';
import {
  applyAnswer, applyRemediation, chooseNext, createState, isUnlocked, reactivateAfterMastery,
  seedFromHistory, type BktParams, type Decision, type Difficulty, type EngineEvent,
  type NextChoice, type Purpose, type SkillState, type SkillStatus,
} from './engine';
import {
  buildSourceIndex, getTaxonomy, skillKeyForQuestion, type MasteryAgeGroup, type MasterySkill,
} from './taxonomy';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PoolQuestion {
  id: string;
  skillKey: string;
  difficulty: string;
  optionCount: number;
  /** Normalized question text: copies of the same question share it. */
  textKey: string;
}

export interface QuestionPool {
  bySkill: Map<string, PoolQuestion[]>;
  byId: Map<string, PoolQuestion>;
  /** Distinct question texts per skill (duplicates counted once). */
  counts: Record<string, number>;
  /** Raw active rows per skill, including duplicate copies. */
  rawCounts: Record<string, number>;
  eligible: Set<string>;
  /** sub_skill pairs present in the bank but not mapped to any skill. */
  unmapped: Array<{ skillArea: string; subSkill: string; count: number }>;
}

export interface ServedQuestion {
  id: string;
  skillArea: string;
  questionTextAr: string;
  questionImageUrl: string | null;
  options: Array<{ text: string; imageUrl?: string }>;
}

export interface SessionView {
  sessionId: number;
  served: number;
  correct: number;
  sessionSize: number;
  question: ServedQuestion | null;
  completed: boolean;
}

export interface AnswerResult {
  isCorrect: boolean;
  correctOptionIndex: number;
  explanationAr: string;
  masteredSkills: Array<{ key: string; nameAr: string }>;
  session: SessionView;
}

export class MasteryError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'MasteryError';
    this.status = status;
  }
}

// ─── Loading ────────────────────────────────────────────────────────────────

/** Same question text → same key, regardless of spacing or tatweel. */
export function questionTextKey(text: string | null | undefined): string {
  return (text ?? '').replace(/\u0640/g, '').replace(/\s+/g, ' ').trim();
}

export async function loadMasteryConfig(): Promise<MasteryConfig> {
  try {
    const db = getDb();
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, MASTERY_CONFIG_KEY));
    return mergeMasteryConfig(row?.value).config;
  } catch {
    return DEFAULT_MASTERY_CONFIG;
  }
}

export async function loadParamsFor(config: MasteryConfig): Promise<(skillKey: string) => BktParams> {
  const db = getDb();
  const rows = await db.select().from(masteryBktParams);
  const fitted = new Map(rows.map((r) => [r.skillKey, r]));
  return (skillKey: string) => {
    const f = fitted.get(skillKey);
    if (f) return { pInit: f.pInit, pTransit: f.pTransit, pSlip: f.pSlip, pGuess: f.pGuess };
    return {
      pInit: config.defaultPInit,
      pTransit: config.defaultPTransit,
      pSlip: config.defaultPSlip,
      pGuess: null,
    };
  };
}

export async function loadQuestionPool(
  ageGroup: MasteryAgeGroup,
  config: MasteryConfig,
  parentEmail?: string | null,
): Promise<QuestionPool> {
  const db = getDb();
  const skills = getTaxonomy(ageGroup);
  const index = buildSourceIndex(skills);
  const tierClause = await getTierCondition(parentEmail);
  const tierSql = tierClause ? sql.raw(tierClause) : sql``;

  const rows = await db
    .select({
      id: questions.id,
      skillArea: questions.skillArea,
      subSkill: questions.subSkill,
      difficulty: questions.difficulty,
      options: questions.options,
      questionTextAr: questions.questionTextAr,
    })
    .from(questions)
    .where(sql`age_group = ${ageGroup} AND is_active = 1${tierSql}`);

  const bySkill = new Map<string, PoolQuestion[]>();
  const byId = new Map<string, PoolQuestion>();
  const unmappedCounts = new Map<string, { skillArea: string; subSkill: string; count: number }>();

  for (const r of rows) {
    const skillKey = skillKeyForQuestion(index, r.skillArea, r.subSkill);
    if (!skillKey) {
      const k = `${r.skillArea}::${r.subSkill}`;
      const entry = unmappedCounts.get(k) ?? { skillArea: r.skillArea, subSkill: r.subSkill, count: 0 };
      entry.count += 1;
      unmappedCounts.set(k, entry);
      continue;
    }
    const q: PoolQuestion = {
      id: r.id,
      skillKey,
      difficulty: r.difficulty,
      optionCount: Array.isArray(r.options) ? r.options.length : 4,
      textKey: questionTextKey(r.questionTextAr),
    };
    byId.set(q.id, q);
    const list = bySkill.get(skillKey) ?? [];
    list.push(q);
    bySkill.set(skillKey, list);
  }

  const counts: Record<string, number> = {};
  const rawCounts: Record<string, number> = {};
  const eligible = new Set<string>();
  for (const sk of skills) {
    const list = bySkill.get(sk.key) ?? [];
    const n = new Set(list.map((q) => q.textKey)).size;
    counts[sk.key] = n;
    rawCounts[sk.key] = list.length;
    if (n >= config.minQuestionsPerSkill) eligible.add(sk.key);
  }

  return {
    bySkill,
    byId,
    counts,
    rawCounts,
    eligible,
    unmapped: [...unmappedCounts.values()].sort((a, b) => b.count - a.count),
  };
}

function rowToState(r: typeof masterySkillState.$inferSelect): SkillState {
  return {
    skillKey: r.skillKey,
    pKnown: r.pKnown,
    status: r.status as SkillStatus,
    observations: r.observations,
    attemptsInStatus: r.attemptsInStatus,
    practiceSinceTest: r.practiceSinceTest,
    testQuestionIds: r.testQuestionIds ?? [],
    testResults: r.testResults ?? [],
    reviewStage: r.reviewStage,
    nextReviewAt: r.nextReviewAt,
    reviewWrongs: r.reviewWrongs,
    deferredReason: r.deferredReason,
    remediationFor: r.remediationFor,
    masteredAt: r.masteredAt,
    updatedAt: r.updatedAt,
  };
}

function stateToRow(childId: string, s: SkillState) {
  return {
    childId,
    skillKey: s.skillKey,
    pKnown: s.pKnown,
    status: s.status,
    observations: s.observations,
    attemptsInStatus: s.attemptsInStatus,
    practiceSinceTest: s.practiceSinceTest,
    testQuestionIds: s.testQuestionIds,
    testResults: s.testResults,
    reviewStage: s.reviewStage,
    nextReviewAt: s.nextReviewAt,
    reviewWrongs: s.reviewWrongs,
    deferredReason: s.deferredReason,
    remediationFor: s.remediationFor,
    masteredAt: s.masteredAt,
    updatedAt: s.updatedAt ?? new Date().toISOString(),
  };
}

async function saveStates(childId: string, states: SkillState[]): Promise<void> {
  const db = getDb();
  for (const s of states) {
    const row = stateToRow(childId, s);
    const { childId: _c, skillKey: _k, ...update } = row;
    await db
      .insert(masterySkillState)
      .values(row)
      .onConflictDoUpdate({
        target: [masterySkillState.childId, masterySkillState.skillKey],
        set: update,
      });
  }
}

export async function loadStates(childId: string): Promise<Map<string, SkillState>> {
  const db = getDb();
  const rows = await db.select().from(masterySkillState).where(eq(masterySkillState.childId, childId));
  return new Map(rows.map((r) => [r.skillKey, rowToState(r)]));
}

/**
 * Make sure every eligible skill has a state row. On first contact the
 * child's past practice answers are replayed through BKT as a starting point.
 */
async function ensureStates(
  childId: string,
  pool: QuestionPool,
  paramsFor: (k: string) => BktParams,
  config: MasteryConfig,
): Promise<Map<string, SkillState>> {
  const existing = await loadStates(childId);
  const missing = [...pool.eligible].filter((k) => !existing.has(k));
  if (missing.length === 0) return existing;

  let fresh: Map<string, SkillState>;
  if (existing.size === 0) {
    const db = getDb();
    const history = await db
      .select({ questionId: sessionAnswers.questionId, isCorrect: sessionAnswers.isCorrect })
      .from(sessionAnswers)
      .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
      .where(and(eq(sessions.childId, childId), sql`${sessionAnswers.isCorrect} IS NOT NULL`))
      .orderBy(sessions.startedAt, sessionAnswers.id);
    const replay = history
      .map((h) => {
        const q = pool.byId.get(h.questionId);
        return q ? { skillKey: q.skillKey, isCorrect: Boolean(h.isCorrect), optionCount: q.optionCount } : null;
      })
      .filter((x): x is { skillKey: string; isCorrect: boolean; optionCount: number } => x !== null);
    fresh = seedFromHistory(missing, replay, paramsFor, config);
  } else {
    fresh = new Map(missing.map((k) => [k, createState(k, paramsFor(k), config)]));
  }

  const now = new Date().toISOString();
  for (const s of fresh.values()) s.updatedAt = now;
  await saveStates(childId, [...fresh.values()]);
  for (const [k, s] of fresh) existing.set(k, s);
  return existing;
}

// ─── Question picking ───────────────────────────────────────────────────────

/** Text keys of every question the child has answered (all of it, and recently). */
async function loadSeen(childId: string, config: MasteryConfig): Promise<{ ever: Set<string>; recent: Set<string> }> {
  const db = getDb();
  const since = new Date(Date.now() - config.recentExcludeDays * 86_400_000).toISOString();
  const sinceSql = since.replace('T', ' ').slice(0, 19);

  const [mastery, practice] = await Promise.all([
    db.select({ text: questions.questionTextAr, createdAt: masteryAttempts.createdAt })
      .from(masteryAttempts)
      .innerJoin(questions, eq(masteryAttempts.questionId, questions.id))
      .where(eq(masteryAttempts.childId, childId)),
    db.select({ text: questions.questionTextAr, startedAt: sessions.startedAt })
      .from(sessionAnswers)
      .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
      .innerJoin(questions, eq(sessionAnswers.questionId, questions.id))
      .where(eq(sessions.childId, childId)),
  ]);

  const ever = new Set<string>();
  const recent = new Set<string>();
  for (const m of mastery) {
    const key = questionTextKey(m.text);
    ever.add(key);
    if ((m.createdAt ?? '') >= sinceSql) recent.add(key);
  }
  for (const p of practice) {
    const key = questionTextKey(p.text);
    ever.add(key);
    if ((p.startedAt ?? '') >= sinceSql) recent.add(key);
  }
  return { ever, recent };
}

const DIFFICULTY_FALLBACK: Record<Difficulty, Difficulty[]> = {
  easy: ['easy', 'medium', 'hard'],
  medium: ['medium', 'easy', 'hard'],
  hard: ['hard', 'medium', 'easy'],
};

function randomOf<T>(list: T[]): T | undefined {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * All "seen" sets hold question text keys, not ids: duplicate copies of a
 * question share a text, so a copy never counts as a new question — in
 * particular in the parallel test, which must use questions never seen.
 * Exported for tests.
 */
export function pickQuestion(params: {
  candidates: PoolQuestion[];
  purpose: Purpose;
  difficulty: Difficulty;
  sessionSeen: Set<string>;
  everSeen: Set<string>;
  recentSeen: Set<string>;
  testSeen: Set<string>;
}): { question: PoolQuestion; note: string } | null {
  const notThisSession = params.candidates.filter(
    (q) => !params.sessionSeen.has(q.textKey) && !params.testSeen.has(q.textKey),
  );
  if (notThisSession.length === 0) return null;

  if (params.purpose === 'test') {
    const unseen = notThisSession.filter((q) => !params.everSeen.has(q.textKey));
    if (unseen.length > 0) return { question: randomOf(unseen)!, note: 'unseen' };
    const notRecent = notThisSession.filter((q) => !params.recentSeen.has(q.textKey));
    if (notRecent.length > 0) return { question: randomOf(notRecent)!, note: 'fallback_not_recent' };
    return { question: randomOf(notThisSession)!, note: 'fallback_any' };
  }

  const fresh = notThisSession.filter((q) => !params.recentSeen.has(q.textKey));
  const pool = fresh.length > 0 ? fresh : notThisSession;
  for (const d of DIFFICULTY_FALLBACK[params.difficulty]) {
    const match = pool.filter((q) => q.difficulty === d);
    if (match.length > 0) {
      return { question: randomOf(match)!, note: d === params.difficulty ? `difficulty:${d}` : `difficulty_fallback:${d}` };
    }
  }
  return { question: randomOf(pool)!, note: 'any' };
}

async function fetchServedQuestion(id: string): Promise<ServedQuestion | null> {
  const db = getDb();
  const [q] = await db
    .select({
      id: questions.id,
      skillArea: questions.skillArea,
      questionTextAr: questions.questionTextAr,
      questionImageUrl: questions.questionImageUrl,
      options: questions.options,
    })
    .from(questions)
    .where(eq(questions.id, id))
    .limit(1);
  return q ?? null;
}

// ─── Context ────────────────────────────────────────────────────────────────

interface Ctx {
  childId: string;
  skills: MasterySkill[];
  config: MasteryConfig;
  paramsFor: (k: string) => BktParams;
  pool: QuestionPool;
  states: Map<string, SkillState>;
}

async function buildCtx(childId: string, ageGroup: MasteryAgeGroup, parentEmail?: string | null): Promise<Ctx> {
  const config = await loadMasteryConfig();
  const [paramsFor, pool] = await Promise.all([
    loadParamsFor(config),
    loadQuestionPool(ageGroup, config, parentEmail),
  ]);
  const states = await ensureStates(childId, pool, paramsFor, config);
  return { childId, skills: getTaxonomy(ageGroup), config, paramsFor, pool, states };
}

async function sessionTextKeys(sessionId: number): Promise<Set<string>> {
  const db = getDb();
  const rows = await db
    .select({ text: questions.questionTextAr })
    .from(masteryAttempts)
    .innerJoin(questions, eq(masteryAttempts.questionId, questions.id))
    .where(eq(masteryAttempts.sessionId, sessionId));
  return new Set(rows.map((r) => questionTextKey(r.text)));
}

/** Choose the next question; skills with nothing left to serve are skipped. */
async function chooseAndPick(
  ctx: Ctx,
  session: { id: number; reviewsServed: number; diagnosticsServed: number },
): Promise<{ choice: NextChoice; question: PoolQuestion; note: string } | null> {
  const seen = await loadSeen(ctx.childId, ctx.config);
  const sessionSeen = await sessionTextKeys(session.id);
  const exhausted = new Set<string>();
  const now = new Date();

  for (let guard = 0; guard < ctx.skills.length + 1; guard++) {
    const choice = chooseNext({
      states: ctx.states,
      skills: ctx.skills,
      eligible: ctx.pool.eligible,
      reviewsServed: session.reviewsServed,
      diagnosticsServed: session.diagnosticsServed,
      exhausted,
      config: ctx.config,
      now,
    });
    if (!choice) return null;
    const state = ctx.states.get(choice.skillKey);
    const picked = pickQuestion({
      candidates: ctx.pool.bySkill.get(choice.skillKey) ?? [],
      purpose: choice.purpose,
      difficulty: choice.difficulty,
      sessionSeen,
      everSeen: seen.ever,
      recentSeen: seen.recent,
      testSeen: new Set((state?.testQuestionIds ?? [])
        .map((id) => ctx.pool.byId.get(id)?.textKey)
        .filter((k): k is string => Boolean(k))),
    });
    if (picked) {
      if (choice.stateChange) {
        ctx.states.set(choice.skillKey, choice.stateChange);
        await saveStates(ctx.childId, [choice.stateChange]);
      }
      return { choice, question: picked.question, note: picked.note };
    }
    exhausted.add(choice.skillKey);
  }
  return null;
}

async function setCurrent(
  sessionId: number,
  picked: { choice: NextChoice; question: PoolQuestion; note: string } | null,
): Promise<void> {
  const db = getDb();
  await db
    .update(masterySessions)
    .set({
      currentQuestionId: picked?.question.id ?? null,
      currentSkillKey: picked?.choice.skillKey ?? null,
      currentPurpose: picked?.choice.purpose ?? null,
      currentReason: picked
        ? { ...picked.choice.reason, difficulty: picked.choice.difficulty, pick: picked.note }
        : null,
    })
    .where(eq(masterySessions.id, sessionId));
}

async function toView(session: typeof masterySessions.$inferSelect, config: MasteryConfig): Promise<SessionView> {
  const completed = Boolean(session.completedAt);
  return {
    sessionId: session.id,
    served: session.served,
    correct: session.correct,
    sessionSize: config.sessionSize,
    completed,
    question: !completed && session.currentQuestionId
      ? await fetchServedQuestion(session.currentQuestionId)
      : null,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function startOrResumeSession(
  childId: string,
  ageGroup: MasteryAgeGroup,
  parentEmail?: string | null,
): Promise<SessionView> {
  const db = getDb();
  const ctx = await buildCtx(childId, ageGroup, parentEmail);

  const [open] = await db
    .select()
    .from(masterySessions)
    .where(and(eq(masterySessions.childId, childId), isNull(masterySessions.completedAt)))
    .orderBy(desc(masterySessions.id))
    .limit(1);

  if (open?.currentQuestionId) return toView(open, ctx.config);

  let session = open;
  if (!session) {
    [session] = await db.insert(masterySessions).values({ childId }).returning();
  }

  const picked = await chooseAndPick(ctx, session);
  if (!picked) {
    throw new MasteryError('لا توجد أسئلة متاحة حاليًا لهذا المسار', 409);
  }
  await setCurrent(session.id, picked);
  const [fresh] = await db.select().from(masterySessions).where(eq(masterySessions.id, session.id));
  return toView(fresh, ctx.config);
}

export async function submitAnswer(params: {
  childId: string;
  ageGroup: MasteryAgeGroup;
  sessionId: number;
  questionId: string;
  selectedOption: number;
  parentEmail?: string | null;
}): Promise<AnswerResult> {
  const db = getDb();
  const { childId, sessionId, questionId, selectedOption } = params;

  const [session] = await db
    .select()
    .from(masterySessions)
    .where(and(eq(masterySessions.id, sessionId), eq(masterySessions.childId, childId)))
    .limit(1);
  if (!session) throw new MasteryError('الجلسة غير موجودة', 404);
  if (session.completedAt) throw new MasteryError('الجلسة منتهية', 409);
  if (session.currentQuestionId !== questionId || !session.currentSkillKey || !session.currentPurpose) {
    throw new MasteryError('هذا ليس السؤال الحالي', 409);
  }

  // Claim the current question so a double submit cannot be scored twice.
  const claimed = await db
    .update(masterySessions)
    .set({ currentQuestionId: null })
    .where(and(eq(masterySessions.id, sessionId), eq(masterySessions.currentQuestionId, questionId)))
    .returning({ id: masterySessions.id });
  if (claimed.length === 0) throw new MasteryError('تم تسجيل هذه الإجابة مسبقًا', 409);

  const [q] = await db
    .select({ correctOptionIndex: questions.correctOptionIndex, explanationAr: questions.explanationAr, options: questions.options })
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);
  if (!q) throw new MasteryError('السؤال غير موجود', 404);
  const isCorrect = selectedOption === q.correctOptionIndex;

  const ctx = await buildCtx(childId, params.ageGroup, params.parentEmail);
  const skillKey = session.currentSkillKey;
  const purpose = session.currentPurpose as Purpose;
  const now = new Date();
  const params0 = ctx.paramsFor(skillKey);
  const before = ctx.states.get(skillKey) ?? createState(skillKey, params0, ctx.config);
  const withTestItem = purpose === 'test'
    ? { ...before, testQuestionIds: [...before.testQuestionIds, questionId] }
    : before;

  const result = applyAnswer({
    state: withTestItem,
    purpose,
    isCorrect,
    params: params0,
    optionCount: Array.isArray(q.options) ? q.options.length : 4,
    unlocked: isUnlocked(skillKey, ctx.states, ctx.skills, ctx.pool.eligible),
    config: ctx.config,
    now,
  });

  const decisions: Decision[] = [...result.decisions];
  const changed = new Map<string, SkillState>([[skillKey, result.state]]);
  ctx.states.set(skillKey, result.state);

  const handle = (events: EngineEvent[], key: string) => {
    if (events.includes('stuck')) {
      const r = applyRemediation(ctx.states, key, ctx.skills, ctx.pool.eligible, now);
      for (const s of r.changed) { changed.set(s.skillKey, s); ctx.states.set(s.skillKey, s); }
      decisions.push(...r.decisions);
    }
    if (events.includes('mastered')) {
      const r = reactivateAfterMastery(ctx.states, key, now);
      for (const s of r.changed) { changed.set(s.skillKey, s); ctx.states.set(s.skillKey, s); }
      decisions.push(...r.decisions);
    }
  };
  handle(result.events, skillKey);

  await saveStates(childId, [...changed.values()]);
  await db.insert(masteryAttempts).values({
    childId,
    sessionId,
    questionId,
    skillKey,
    purpose,
    isCorrect,
    pBefore: before.pKnown,
    pAfter: result.state.pKnown,
    statusBefore: before.status,
    statusAfter: result.state.status,
    selectionReason: session.currentReason ?? null,
    decisions: decisions as unknown as Array<Record<string, unknown>>,
  });

  const served = session.served + 1;
  const done = served >= ctx.config.sessionSize;
  await db
    .update(masterySessions)
    .set({
      served,
      correct: session.correct + (isCorrect ? 1 : 0),
      reviewsServed: session.reviewsServed + (purpose === 'review' ? 1 : 0),
      diagnosticsServed: session.diagnosticsServed + (purpose === 'diagnostic' ? 1 : 0),
      completedAt: done ? now.toISOString() : null,
    })
    .where(eq(masterySessions.id, sessionId));

  if (!done) {
    const [updated] = await db.select().from(masterySessions).where(eq(masterySessions.id, sessionId));
    const picked = await chooseAndPick(ctx, updated);
    if (picked) {
      await setCurrent(sessionId, picked);
    } else {
      await db.update(masterySessions).set({ completedAt: now.toISOString() }).where(eq(masterySessions.id, sessionId));
    }
  }

  const masteredSkills = result.events.includes('mastered')
    ? [{ key: skillKey, nameAr: ctx.skills.find((s) => s.key === skillKey)?.nameAr ?? skillKey }]
    : [];

  const [finalSession] = await db.select().from(masterySessions).where(eq(masterySessions.id, sessionId));
  return {
    isCorrect,
    correctOptionIndex: q.correctOptionIndex,
    explanationAr: q.explanationAr,
    masteredSkills,
    session: await toView(finalSession, ctx.config),
  };
}

/** Skills mastered during a session (for the end-of-session celebration). */
export async function sessionMasteries(childId: string, sessionId: number, ageGroup: MasteryAgeGroup) {
  const db = getDb();
  const rows = await db
    .select({ skillKey: masteryAttempts.skillKey })
    .from(masteryAttempts)
    .where(and(
      eq(masteryAttempts.childId, childId),
      eq(masteryAttempts.sessionId, sessionId),
      eq(masteryAttempts.statusAfter, 'mastered'),
      sql`${masteryAttempts.statusBefore} = 'testing'`,
    ));
  const names = new Map(getTaxonomy(ageGroup).map((s) => [s.key, s.nameAr]));
  return [...new Set(rows.map((r) => r.skillKey))].map((key) => ({ key, nameAr: names.get(key) ?? key }));
}

// ─── Admin read models ──────────────────────────────────────────────────────

export async function getChildMasteryReport(childId: string, ageGroup: MasteryAgeGroup, attemptLimit = 200) {
  const db = getDb();
  const config = await loadMasteryConfig();
  const pool = await loadQuestionPool(ageGroup, config);
  const skills = getTaxonomy(ageGroup);
  const states = await loadStates(childId);
  const attempts = await db
    .select()
    .from(masteryAttempts)
    .where(eq(masteryAttempts.childId, childId))
    .orderBy(desc(masteryAttempts.id))
    .limit(attemptLimit);
  const sessionsList = await db
    .select()
    .from(masterySessions)
    .where(eq(masterySessions.childId, childId))
    .orderBy(desc(masterySessions.id))
    .limit(20);

  return {
    config,
    skills: skills.map((sk) => ({
      key: sk.key,
      nameAr: sk.nameAr,
      area: sk.area,
      order: sk.order,
      prerequisites: sk.prerequisites,
      questionCount: pool.counts[sk.key] ?? 0,
      eligible: pool.eligible.has(sk.key),
      unlocked: pool.eligible.has(sk.key) ? isUnlocked(sk.key, states, skills, pool.eligible) : false,
      state: states.get(sk.key) ?? null,
    })),
    attempts,
    sessions: sessionsList,
  };
}

export async function getContentGapsReport(ageGroup: MasteryAgeGroup) {
  const config = await loadMasteryConfig();
  const pool = await loadQuestionPool(ageGroup, config);
  const skills = getTaxonomy(ageGroup);
  const byDifficulty = (key: string) => {
    const out: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    const counted = new Set<string>();
    for (const q of pool.bySkill.get(key) ?? []) {
      if (counted.has(q.textKey)) continue;
      counted.add(q.textKey);
      out[q.difficulty] = (out[q.difficulty] ?? 0) + 1;
    }
    return out;
  };
  return {
    minQuestionsPerSkill: config.minQuestionsPerSkill,
    skills: skills
      .map((sk) => ({
        key: sk.key,
        nameAr: sk.nameAr,
        area: sk.area,
        count: pool.counts[sk.key] ?? 0,
        duplicates: (pool.rawCounts[sk.key] ?? 0) - (pool.counts[sk.key] ?? 0),
        missing: Math.max(0, config.minQuestionsPerSkill - (pool.counts[sk.key] ?? 0)),
        eligible: pool.eligible.has(sk.key),
        byDifficulty: byDifficulty(sk.key),
        sources: sk.sources.map(([a, s]) => `${a} / ${s}`),
      }))
      .sort((a, b) => Number(a.eligible) - Number(b.eligible) || a.count - b.count),
    unmapped: pool.unmapped,
  };
}

/** Children (6-9) of a parent email, for the admin child picker. */
export async function findChildrenByParentEmail(email: string) {
  const db = getDb();
  const { parents, children } = await import('../db/schema');
  return db
    .select({ id: children.id, name: children.name, age: children.age, ageGroup: children.ageGroup, email: parents.email })
    .from(children)
    .innerJoin(parents, eq(children.parentId, parents.id))
    .where(eq(parents.email, email.trim().toLowerCase()));
}

/** Recently active mastery children, for the admin landing list. */
export async function listRecentMasteryChildren(limit = 20) {
  const db = getDb();
  const { parents, children } = await import('../db/schema');
  const rows = await db
    .select({
      childId: masterySkillState.childId,
      lastUpdate: sql<string>`MAX(${masterySkillState.updatedAt})`,
      mastered: sql<number>`SUM(CASE WHEN ${masterySkillState.status} = 'mastered' THEN 1 ELSE 0 END)`,
    })
    .from(masterySkillState)
    .groupBy(masterySkillState.childId)
    .orderBy(desc(sql`MAX(${masterySkillState.updatedAt})`))
    .limit(limit);
  if (rows.length === 0) return [];
  const info = await db
    .select({ id: children.id, name: children.name, ageGroup: children.ageGroup, email: parents.email })
    .from(children)
    .innerJoin(parents, eq(children.parentId, parents.id))
    .where(inArray(children.id, rows.map((r) => r.childId)));
  const byId = new Map(info.map((i) => [i.id, i]));
  return rows.map((r) => ({ ...r, child: byId.get(r.childId) ?? null }));
}

