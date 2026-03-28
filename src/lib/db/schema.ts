import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const questions = sqliteTable('questions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  skillArea: text('skill_area').notNull(),
  subSkill: text('sub_skill').notNull(),
  ageGroup: text('age_group').notNull(),
  difficulty: text('difficulty').notNull(),
  questionType: text('question_type').notNull(),
  questionTextAr: text('question_text_ar').notNull(),
  questionImageUrl: text('question_image_url'),
  options: text('options', { mode: 'json' }).notNull().$type<Array<{text: string; imageUrl?: string}>>(),
  correctOptionIndex: integer('correct_option_index').notNull(),
  explanationAr: text('explanation_ar').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  guestId: text('guest_id'),
  ageGroup: text('age_group').notNull(),
  skillArea: text('skill_area').notNull(),
  difficulty: text('difficulty'),
  startedAt: text('started_at').default(sql`CURRENT_TIMESTAMP`),
  completedAt: text('completed_at'),
  score: integer('score'),
  totalQuestions: integer('total_questions').default(10),
  pointsEarned: integer('points_earned').default(0),
  timeTakenMs: integer('time_taken_ms'),
  ipAddress: text('ip_address'),
});

export const sessionAnswers = sqliteTable('session_answers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  questionId: text('question_id').notNull().references(() => questions.id),
  selectedOption: integer('selected_option'),
  isCorrect: integer('is_correct', { mode: 'boolean' }),
  timeSpentMs: integer('time_spent_ms'),
});

export const siteContent = sqliteTable('site_content', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const guestProgress = sqliteTable('guest_progress', {
  guestId: text('guest_id').primaryKey(),
  totalPoints: integer('total_points').default(0),
  currentLevel: integer('current_level').default(1),
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  badges: text('badges', { mode: 'json' }).$type<string[]>(),
  totalSessions: integer('total_sessions').default(0),
  totalCorrect: integer('total_correct').default(0),
  totalAnswered: integer('total_answered').default(0),
  lastPracticeDate: text('last_practice_date'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
