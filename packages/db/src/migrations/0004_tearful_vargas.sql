CREATE TABLE `changelogs` (
	`changes_json` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`description` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`is_published` integer NOT NULL,
	`is_stable` integer NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`version_major` integer NOT NULL,
	`version_minor` integer NOT NULL,
	`version_patch` integer NOT NULL,
	CONSTRAINT "changelogs_version_major_non_negative" CHECK("changelogs"."version_major" >= 0),
	CONSTRAINT "changelogs_version_minor_non_negative" CHECK("changelogs"."version_minor" >= 0),
	CONSTRAINT "changelogs_version_patch_non_negative" CHECK("changelogs"."version_patch" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `changelogs_version_triplet_unique` ON `changelogs` (`version_major`,`version_minor`,`version_patch`);--> statement-breakpoint
CREATE INDEX `changelogs_publish_version_idx` ON `changelogs` (`is_published`,`version_major`,`version_minor`,`version_patch`,`is_stable`);--> statement-breakpoint
CREATE INDEX `changelogs_version_idx` ON `changelogs` (`version_major`,`version_minor`,`version_patch`,`is_stable`);--> statement-breakpoint
CREATE TABLE `daily_metrics` (
	`day` text PRIMARY KEY NOT NULL,
	`new_skills` integer DEFAULT 0 NOT NULL,
	`new_snapshots` integer DEFAULT 0 NOT NULL,
	`updated_at_ms` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT "daily_metrics_new_skills_non_negative" CHECK("daily_metrics"."new_skills" >= 0),
	CONSTRAINT "daily_metrics_new_snapshots_non_negative" CHECK("daily_metrics"."new_snapshots" >= 0),
	CONSTRAINT "daily_metrics_updated_at_ms_non_negative" CHECK("daily_metrics"."updated_at_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`content` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`response` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`title` text NOT NULL,
	`type` text DEFAULT 'general' NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text
);
--> statement-breakpoint
CREATE INDEX `feedback_status_idx` ON `feedback` (`status`);--> statement-breakpoint
CREATE INDEX `feedback_type_idx` ON `feedback` (`type`);--> statement-breakpoint
CREATE INDEX `feedback_user_id_idx` ON `feedback` (`user_id`);--> statement-breakpoint
CREATE TABLE `newsletter` (
	`city` text,
	`country` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`device` text,
	`email` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`ip` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_email_unique` ON `newsletter` (`email`);--> statement-breakpoint
CREATE INDEX `newsletter_created_at_idx` ON `newsletter` (`created_at`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`content` text NOT NULL,
	`rating` integer NOT NULL,
	`skill_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "reviews_rating_range" CHECK("reviews"."rating" >= 1 AND "reviews"."rating" <= 5)
);
--> statement-breakpoint
CREATE INDEX `reviews_skill_id_created_at_idx` ON `reviews` (`skill_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `reviews_user_id_created_at_idx` ON `reviews` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_skill_id_user_id_unique` ON `reviews` (`skill_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `static_audits` (
	`audit_json` text NOT NULL,
	`entry_path` text,
	`files_scanned` integer DEFAULT 0 NOT NULL,
	`findings_json` text NOT NULL,
	`generated_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`is_blocked` integer NOT NULL,
	`model_version` text,
	`overall_score` integer NOT NULL,
	`pipeline` text NOT NULL,
	`pipeline_run_id` text NOT NULL,
	`reason` text,
	`repo_name` text NOT NULL,
	`repo_owner` text NOT NULL,
	`report_r2_key` text,
	`risk_factors_json` text NOT NULL,
	`risk_level` text NOT NULL,
	`rules_version` text NOT NULL,
	`safe_to_publish` integer NOT NULL,
	`skill_root_path` text,
	`snapshot_id` text,
	`source_hash` text NOT NULL,
	`source_ref` text,
	`source_type` text NOT NULL,
	`status` text NOT NULL,
	`summary` text NOT NULL,
	`sync_time` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`total_lines` integer DEFAULT 0 NOT NULL,
	`tree_hash` text,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "static_audits_overall_score_range" CHECK("static_audits"."overall_score" >= 0 AND "static_audits"."overall_score" <= 100),
	CONSTRAINT "static_audits_files_scanned_non_negative" CHECK("static_audits"."files_scanned" >= 0),
	CONSTRAINT "static_audits_total_lines_non_negative" CHECK("static_audits"."total_lines" >= 0),
	CONSTRAINT "static_audits_generated_at_non_negative" CHECK("static_audits"."generated_at" >= 0),
	CONSTRAINT "static_audits_sync_time_non_negative" CHECK("static_audits"."sync_time" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `static_audits_idempotency_key_unique` ON `static_audits` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `static_audits_snapshot_sync_time_idx` ON `static_audits` (`snapshot_id`,`sync_time`);--> statement-breakpoint
CREATE INDEX `static_audits_repo_sync_time_idx` ON `static_audits` (`repo_owner`,`repo_name`,`sync_time`);--> statement-breakpoint
CREATE INDEX `static_audits_source_hash_rules_version_idx` ON `static_audits` (`source_hash`,`rules_version`);--> statement-breakpoint
CREATE INDEX `static_audits_risk_level_sync_time_idx` ON `static_audits` (`risk_level`,`sync_time`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_skills` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`description` text NOT NULL,
	`downloads_all_time` integer DEFAULT 0 NOT NULL,
	`downloads_trending` integer DEFAULT 0 NOT NULL,
	`is_verified` integer DEFAULT false NOT NULL,
	`latest_version` text,
	`primary_category` text,
	`category_id` text,
	`repo_id` text NOT NULL,
	`user_id` text,
	`latest_evaluation_id` text,
	`latest_snapshot_id` text,
	`latest_commit_sha` text,
	`latest_commit_url` text,
	`latest_commit_date` integer,
	`latest_commit_message` text,
	`slug` text NOT NULL,
	`stargazer_count` integer DEFAULT 0 NOT NULL,
	`sync_time` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`title` text NOT NULL,
	`views_all_time` integer DEFAULT 0 NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`repo_id`) REFERENCES `repos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "skills_downloads_all_time_non_negative" CHECK("__new_skills"."downloads_all_time" >= 0),
	CONSTRAINT "skills_created_at_ms_non_negative" CHECK("__new_skills"."created_at" is null or "__new_skills"."created_at" >= 0),
	CONSTRAINT "skills_sync_time_non_negative" CHECK("__new_skills"."sync_time" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_skills`("id", "created_at", "updated_at", "description", "downloads_all_time", "downloads_trending", "is_verified", "latest_version", "primary_category", "category_id", "repo_id", "user_id", "latest_evaluation_id", "latest_snapshot_id", "latest_commit_sha", "latest_commit_url", "latest_commit_date", "latest_commit_message", "slug", "stargazer_count", "sync_time", "title", "views_all_time", "visibility") SELECT "id", "created_at", "updated_at", "description", "downloads_all_time", "downloads_trending", "is_verified", "latest_version", "primary_category", "category_id", "repo_id", "user_id", "latest_evaluation_id", "latest_snapshot_id", "latest_commit_sha", "latest_commit_url", "latest_commit_date", "latest_commit_message", "slug", "stargazer_count", "sync_time", "title", "views_all_time", "visibility" FROM `skills`;--> statement-breakpoint
DROP TABLE `skills`;--> statement-breakpoint
ALTER TABLE `__new_skills` RENAME TO `skills`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `skills_categoryId_idx` ON `skills` (`category_id`);--> statement-breakpoint
CREATE INDEX `skills_createdAt_id_idx` ON `skills` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `skills_repoId_idx` ON `skills` (`repo_id`);--> statement-breakpoint
CREATE INDEX `skills_userId_idx` ON `skills` (`user_id`);--> statement-breakpoint
CREATE INDEX `skills_latest_evaluation_id_idx` ON `skills` (`latest_evaluation_id`);--> statement-breakpoint
CREATE INDEX `skills_latest_snapshot_id_idx` ON `skills` (`latest_snapshot_id`);--> statement-breakpoint
CREATE INDEX `skills_latest_commit_date_idx` ON `skills` (`latest_commit_date`);--> statement-breakpoint
CREATE INDEX `skills_visibility_syncTime_id_idx` ON `skills` (`visibility`,`sync_time`,`id`);--> statement-breakpoint
CREATE INDEX `skills_slug_idx` ON `skills` (`slug`);--> statement-breakpoint
CREATE INDEX `skills_syncTime_idx` ON `skills` (`sync_time`);--> statement-breakpoint
CREATE UNIQUE INDEX `skills_repo_id_slug_unique` ON `skills` (`repo_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `skills_slug_unique` ON `skills` (`slug`);