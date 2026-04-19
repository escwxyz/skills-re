CREATE TABLE `snapshot_files` (
	`content_type` text,
	`file_hash` text NOT NULL,
	`path` text NOT NULL,
	`r2_key` text,
	`size` integer NOT NULL,
	`snapshot_id` text NOT NULL,
	`source_sha` text,
	PRIMARY KEY(`snapshot_id`, `path`),
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `snapshot_files_snapshotId_idx` ON `snapshot_files` (`snapshot_id`);--> statement-breakpoint
CREATE TABLE `snapshots` (
	`archive_r2_key` text,
	`created_at_ms` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`description` text NOT NULL,
	`directory_path` text NOT NULL,
	`entry_path` text NOT NULL,
	`evaluation_id` text,
	`frontmatter_hash` text,
	`hash` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`is_deprecated` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`skill_content_hash` text,
	`skill_id` text NOT NULL,
	`source_commit_date` integer,
	`source_commit_message` text,
	`source_commit_sha` text,
	`source_commit_url` text,
	`sync_time` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`version` text NOT NULL,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `snapshots_createdAtMs_id_idx` ON `snapshots` (`created_at_ms`,`id`);--> statement-breakpoint
CREATE INDEX `snapshots_evaluationId_idx` ON `snapshots` (`evaluation_id`);--> statement-breakpoint
CREATE INDEX `snapshots_frontmatter_skillContentHash_idx` ON `snapshots` (`frontmatter_hash`,`skill_content_hash`);--> statement-breakpoint
CREATE INDEX `snapshots_skill_deprecated_syncTime_idx` ON `snapshots` (`skill_id`,`is_deprecated`,`sync_time`);--> statement-breakpoint
CREATE INDEX `snapshots_skill_syncTime_id_idx` ON `snapshots` (`skill_id`,`sync_time`,`id`);--> statement-breakpoint
CREATE INDEX `snapshots_skill_version_syncTime_idx` ON `snapshots` (`skill_id`,`version`,`sync_time`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`description` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	CONSTRAINT "categories_count_non_negative" CHECK("__new_categories"."count" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_categories`("id", "created_at", "updated_at", "count", "description", "name", "slug", "keywords", "status") SELECT "id", "created_at", "updated_at", "count", "description", "name", "slug", "keywords", "status" FROM `categories`;--> statement-breakpoint
DROP TABLE `categories`;--> statement-breakpoint
ALTER TABLE `__new_categories` RENAME TO `categories`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `categories_count_slug_idx` ON `categories` (`count`,`slug`);--> statement-breakpoint
ALTER TABLE `repos` ADD `default_branch` text NOT NULL;--> statement-breakpoint
ALTER TABLE `skills` ADD `latest_evaluation_id` text;--> statement-breakpoint
ALTER TABLE `skills` ADD `latest_snapshot_id` text;--> statement-breakpoint
ALTER TABLE `skills` ADD `latest_commit_sha` text;--> statement-breakpoint
ALTER TABLE `skills` ADD `latest_commit_url` text;--> statement-breakpoint
ALTER TABLE `skills` ADD `latest_commit_date` integer;--> statement-breakpoint
ALTER TABLE `skills` ADD `latest_commit_message` text;--> statement-breakpoint
CREATE INDEX `skills_latest_evaluation_id_idx` ON `skills` (`latest_evaluation_id`);--> statement-breakpoint
CREATE INDEX `skills_latest_snapshot_id_idx` ON `skills` (`latest_snapshot_id`);--> statement-breakpoint
CREATE INDEX `skills_latest_commit_date_idx` ON `skills` (`latest_commit_date`);--> statement-breakpoint
CREATE TABLE `__new_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`promoted_at` integer,
	`slug` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	CONSTRAINT "count_non_negative" CHECK("__new_tags"."count" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_tags`("id", "created_at", "updated_at", "count", "promoted_at", "slug", "status") SELECT "id", "created_at", "updated_at", "count", "promoted_at", "slug", "status" FROM `tags`;--> statement-breakpoint
DROP TABLE `tags`;--> statement-breakpoint
ALTER TABLE `__new_tags` RENAME TO `tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE INDEX `tags_count_slug_idx` ON `tags` (`count`,`slug`);--> statement-breakpoint
CREATE INDEX `tags_status_count_slug_idx` ON `tags` (`status`,`count`,`slug`);