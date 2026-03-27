CREATE TABLE `guest_progress` (
	`guest_id` text PRIMARY KEY NOT NULL,
	`total_points` integer DEFAULT 0,
	`current_level` integer DEFAULT 1,
	`current_streak` integer DEFAULT 0,
	`longest_streak` integer DEFAULT 0,
	`badges` text,
	`total_sessions` integer DEFAULT 0,
	`total_correct` integer DEFAULT 0,
	`total_answered` integer DEFAULT 0,
	`last_practice_date` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_area` text NOT NULL,
	`sub_skill` text NOT NULL,
	`age_group` text NOT NULL,
	`difficulty` text NOT NULL,
	`question_type` text NOT NULL,
	`question_text_ar` text NOT NULL,
	`question_image_url` text,
	`options` text NOT NULL,
	`correct_option_index` integer NOT NULL,
	`explanation_ar` text NOT NULL,
	`tags` text,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `session_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`question_id` text NOT NULL,
	`selected_option` integer,
	`is_correct` integer,
	`time_spent_ms` integer,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`guest_id` text,
	`age_group` text NOT NULL,
	`skill_area` text NOT NULL,
	`difficulty` text,
	`started_at` text DEFAULT CURRENT_TIMESTAMP,
	`completed_at` text,
	`score` integer,
	`total_questions` integer DEFAULT 10,
	`points_earned` integer DEFAULT 0,
	`time_taken_ms` integer
);
