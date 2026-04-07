import type { MessageContext } from './bunaa-messages';

export type MascotFrequency = 'low' | 'medium' | 'high';

export interface BunaaState {
  lastMessageText: string | null;
  messagesShownCount: number;
  currentStreak: number;
  questionsAnswered: number;
  correctAnswers: number;
  sessionStartTime: number;
  lastAnswerTime: number | null;
  lastMessageTime: number | null;
  hasSeenFirstVisit: boolean;
  hasSeenImproving: boolean;
}

export function createInitialState(): BunaaState {
  return {
    lastMessageText: null,
    messagesShownCount: 0,
    currentStreak: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    sessionStartTime: Date.now(),
    lastAnswerTime: null,
    lastMessageTime: null,
    hasSeenFirstVisit: false,
    hasSeenImproving: false,
  };
}

const MAX_MESSAGES_PER_SESSION = 15;
const COOLDOWN_MS = 15_000;

/** Important events that bypass the cooldown */
const IMPORTANT_EVENTS: MessageContext[] = [
  'badge_earned',
  'level_up',
  'perfect_session',
  'streak_10',
  'first_visit',
  'daily_challenge_done',
];

/** Low-frequency mode: only these events shown */
const LOW_FREQ_EVENTS: MessageContext[] = [
  'session_start',
  'session_end',
  'streak_5',
  'streak_10',
  'badge_earned',
  'level_up',
  'perfect_session',
  'first_visit',
  'daily_challenge_done',
];

/**
 * Decide whether to show Bunaa for a given event.
 */
export function shouldShowBunaa(
  state: BunaaState,
  event: MessageContext,
  frequency: MascotFrequency = 'medium'
): boolean {
  // Hard cap: no more than 15 messages per session
  if (state.messagesShownCount >= MAX_MESSAGES_PER_SESSION) return false;

  // Low frequency: only important events
  if (frequency === 'low' && !LOW_FREQ_EVENTS.includes(event)) return false;

  // Cooldown: skip if last message was < 15s ago, unless it's an important event
  if (
    state.lastMessageTime &&
    Date.now() - state.lastMessageTime < COOLDOWN_MS &&
    !IMPORTANT_EVENTS.includes(event)
  ) {
    return false;
  }

  switch (event) {
    // Always show
    case 'first_visit':
    case 'session_start':
    case 'session_end':
    case 'wrong_answer':
    case 'streak_3':
    case 'streak_5':
    case 'streak_10':
    case 'streak_broken':
    case 'badge_earned':
    case 'star_earned':
    case 'level_up':
    case 'perfect_session':
    case 'daily_challenge_start':
    case 'daily_challenge_done':
    case 'hard_question_correct':
    case 'comeback':
    case 'idle_30s':
      return true;

    // Correct answer: 40% for medium, 100% for high
    case 'correct_answer':
      if (frequency === 'high') return true;
      return Math.random() < 0.4;

    // Session half: only at midpoint
    case 'session_half':
      return state.questionsAnswered > 0 && state.questionsAnswered % 5 === 0;

    // Improving: once per session
    case 'improving_skill':
      return !state.hasSeenImproving && state.messagesShownCount < 10;

    default:
      return false;
  }
}

/**
 * Update Bunaa state after a message is shown or an answer is given.
 */
export function updateBunaaState(
  state: BunaaState,
  event: MessageContext,
  data?: { isCorrect?: boolean; messageText?: string }
): BunaaState {
  const next = { ...state };

  // Track answer events
  if (event === 'correct_answer' || event === 'wrong_answer' || event === 'hard_question_correct') {
    next.questionsAnswered++;
    next.lastAnswerTime = Date.now();

    if (data?.isCorrect !== false && event !== 'wrong_answer') {
      next.correctAnswers++;
      next.currentStreak++;
    } else {
      next.currentStreak = 0;
    }
  }

  if (event === 'streak_broken') {
    next.currentStreak = 0;
  }

  // Track message display
  if (data?.messageText) {
    next.lastMessageText = data.messageText;
    next.messagesShownCount++;
    next.lastMessageTime = Date.now();
  }

  if (event === 'first_visit') {
    next.hasSeenFirstVisit = true;
  }

  if (event === 'improving_skill') {
    next.hasSeenImproving = true;
  }

  return next;
}

/**
 * Determine the event to trigger after an answer.
 */
export function getAnswerEvent(
  isCorrect: boolean,
  currentStreak: number,
  difficulty?: string
): MessageContext {
  if (!isCorrect) {
    return currentStreak >= 3 ? 'streak_broken' : 'wrong_answer';
  }

  const newStreak = currentStreak + 1;
  if (newStreak === 10) return 'streak_10';
  if (newStreak === 5) return 'streak_5';
  if (newStreak === 3) return 'streak_3';
  if (difficulty === 'hard') return 'hard_question_correct';
  return 'correct_answer';
}
