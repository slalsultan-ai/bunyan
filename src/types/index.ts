export type AgeGroup = '4-5' | '6-9' | '10-12';
export type SkillArea = 'quantitative' | 'verbal' | 'logical_patterns' | 'mixed';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type QuestionType = 'text' | 'image' | 'audio' | 'mixed';

export interface QuestionOption {
  text: string;
  imageUrl?: string;
}

// Question as returned by /api/questions (no answer fields)
export type PublicQuestion = Omit<Question, 'correctOptionIndex' | 'explanationAr'>;

export interface Question {
  id: string;
  skillArea: SkillArea;
  subSkill: string;
  ageGroup: AgeGroup;
  difficulty: Difficulty;
  questionType: QuestionType;
  questionTextAr: string;
  questionImageUrl?: string | null;
  options: QuestionOption[];
  correctOptionIndex: number;
  explanationAr: string;
  tags?: string[];
  isActive?: boolean;
  createdAt?: string;
}

export interface SessionAnswer {
  questionId: string;
  selectedOption: number | null;
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface SessionSummary {
  id: string;
  ageGroup: AgeGroup;
  skillArea: SkillArea;
  score: number;
  totalQuestions: number;
  pointsEarned: number;
  timeTakenMs: number;
  completedAt: string;
}

export interface GuestState {
  guestId: string;
  totalPoints: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
  totalSessions: number;
  totalCorrect: number;
  totalAnswered: number;
  lastPracticeDate: string | null;
  sessionHistory: SessionSummary[];
}

export interface Badge {
  id: string;
  name: string;
  criteria: string;
  icon: string;
}

export interface Level {
  level: number;
  name: string;
  pointsRequired: number;
}

export interface SkillBreakdown {
  quantitative: { correct: number; total: number };
  verbal: { correct: number; total: number };
  logical_patterns: { correct: number; total: number };
}
