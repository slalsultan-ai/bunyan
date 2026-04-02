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
  parentId: text('parent_id'),
  childId: text('child_id'),
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

// ═══ Parent auth tables ═══

export const parents = sqliteTable('parents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  city: text('city'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: text('last_login_at'),
  weeklyEmailEnabled: integer('weekly_email_enabled', { mode: 'boolean' }).default(true),
  achievementEmailEnabled: integer('achievement_email_enabled', { mode: 'boolean' }).default(true),
  monthlyReportEnabled: integer('monthly_report_enabled', { mode: 'boolean' }).default(true),
  currentWeekNumber: integer('current_week_number').default(1),
  unsubscribeToken: text('unsubscribe_token').notNull().$defaultFn(() => crypto.randomUUID()),
});

export const children = sqliteTable('children', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  parentId: text('parent_id').notNull().references(() => parents.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  age: integer('age').notNull(),
  ageGroup: text('age_group').notNull(), // '4-5' | '6-9' | '10-12'
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const otpCodes = sqliteTable('otp_codes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  attempts: integer('attempts').default(0),
  used: integer('used', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const parentSessions = sqliteTable('parent_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  parentId: text('parent_id').notNull().references(() => parents.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ═══ Weekly email tables ═══

export const weeklyEmailContent = sqliteTable('weekly_email_content', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  weekNumber: integer('week_number').notNull(),
  ageGroup: text('age_group').notNull(), // '4-5' | '6-9' | '10-12'
  content: text('content', { mode: 'json' }).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const emailLog = sqliteTable('email_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  parentId: text('parent_id').notNull().references(() => parents.id),
  weekNumber: integer('week_number').notNull(),
  sentAt: text('sent_at').default(sql`CURRENT_TIMESTAMP`),
  status: text('status').notNull(), // 'sent' | 'failed'
  resendId: text('resend_id'),
  emailType: text('email_type').default('weekly'), // 'weekly' | 'achievement'
});

// ═══ Weekly challenges ═══

export const weeklyChallenges = sqliteTable('weekly_challenges', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  weekStart: text('week_start').notNull(), // ISO date of Monday
  goalType: text('goal_type').notNull(), // 'sessions' | 'correct_answers'
  goalTarget: integer('goal_target').notNull(),
  titleAr: text('title_ar').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const challengeProgress = sqliteTable('challenge_progress', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  challengeId: text('challenge_id').notNull().references(() => weeklyChallenges.id),
  childId: text('child_id').notNull().references(() => children.id, { onDelete: 'cascade' }),
  currentValue: integer('current_value').default(0),
  completedAt: text('completed_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ═══ Admin tables ═══

export const adminSessions = sqliteTable('admin_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  adminEmail: text('admin_email').notNull(),
  tokenHash: text('token_hash').notNull(),
  deviceInfo: text('device_info'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  expiresAt: text('expires_at').notNull(),
  lastUsedAt: text('last_used_at'),
});

export const adminOtp = sqliteTable('admin_otp', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  codeHash: text('code_hash').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  expiresAt: text('expires_at').notNull(),
  used: integer('used', { mode: 'boolean' }).default(false),
});

export const adminAuditLog = sqliteTable('admin_audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  adminEmail: text('admin_email').notNull(),
  action: text('action').notNull(),
  details: text('details'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ═══ Review queue ═══

export const reviewQueue = sqliteTable('review_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guestId: text('guest_id'),
  childId: text('child_id'),
  questionId: text('question_id').notNull(),
  timesWrong: integer('times_wrong').default(1),
  timesReviewed: integer('times_reviewed').default(0),
  lastWrongAt: text('last_wrong_at').notNull(),
  nextReviewAt: text('next_review_at').notNull(),
  mastered: integer('mastered').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ═══ Feature flags ═══

export const featureFlags = sqliteTable('feature_flags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  flagKey: text('flag_key').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  enabled: integer('enabled').default(0),
  allowedEmails: text('allowed_emails').default(''),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// ═══ Rate limiting ═══

export const rateLimits = sqliteTable('rate_limits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull(),
  attempts: integer('attempts').default(1),
  windowStart: text('window_start').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ═══ Multi-parent linking ═══

export const childParents = sqliteTable('child_parents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  childId: text('child_id').notNull().references(() => children.id, { onDelete: 'cascade' }),
  parentId: text('parent_id').notNull().references(() => parents.id, { onDelete: 'cascade' }),
  role: text('role').default('follower'),
  inviteToken: text('invite_token'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
