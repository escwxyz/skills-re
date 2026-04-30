ALTER TABLE `categories` RENAME TO `category_counts`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_category_counts` (
	`count` integer DEFAULT 0 NOT NULL,
	`slug` text PRIMARY KEY NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT "category_counts_count_non_negative" CHECK("__new_category_counts"."count" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_category_counts`("count", "slug", "updated_at") SELECT "count", "slug", "updated_at" FROM `category_counts`;--> statement-breakpoint
DROP TABLE `category_counts`;--> statement-breakpoint
ALTER TABLE `__new_category_counts` RENAME TO `category_counts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
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
	FOREIGN KEY (`repo_id`) REFERENCES `repos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "skills_downloads_all_time_non_negative" CHECK("__new_skills"."downloads_all_time" >= 0),
	CONSTRAINT "skills_created_at_ms_non_negative" CHECK("__new_skills"."created_at" is null or "__new_skills"."created_at" >= 0),
	CONSTRAINT "skills_sync_time_non_negative" CHECK("__new_skills"."sync_time" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_skills`("id", "created_at", "updated_at", "description", "downloads_all_time", "downloads_trending", "is_verified", "latest_version", "primary_category", "repo_id", "user_id", "latest_evaluation_id", "latest_snapshot_id", "latest_commit_sha", "latest_commit_url", "latest_commit_date", "latest_commit_message", "slug", "stargazer_count", "sync_time", "title", "views_all_time", "visibility") SELECT "id", "created_at", "updated_at", "description", "downloads_all_time", "downloads_trending", "is_verified", "latest_version", "primary_category", "repo_id", "user_id", "latest_evaluation_id", "latest_snapshot_id", "latest_commit_sha", "latest_commit_url", "latest_commit_date", "latest_commit_message", "slug", "stargazer_count", "sync_time", "title", "views_all_time", "visibility" FROM `skills`;--> statement-breakpoint
DROP TABLE `skills`;--> statement-breakpoint
ALTER TABLE `__new_skills` RENAME TO `skills`;--> statement-breakpoint
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