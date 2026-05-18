PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_skill_usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`agent_name` text,
	`project_context` text,
	`skill_id` text,
	`skill_path` text,
	`skill_slug` text NOT NULL,
	`task_description` text,
	`user_id` text NOT NULL,
	`used_at` integer NOT NULL,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_skill_usage_events` SELECT `id`, `created_at`, `updated_at`, `agent_name`, `project_context`, `skill_id`, `skill_path`, `skill_slug`, `task_description`, `user_id`, `used_at` FROM `skill_usage_events`;
--> statement-breakpoint
DROP TABLE `skill_usage_events`;
--> statement-breakpoint
ALTER TABLE `__new_skill_usage_events` RENAME TO `skill_usage_events`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
CREATE INDEX `skill_usage_events_user_id_used_at_idx` ON `skill_usage_events` (`user_id`,`used_at`);
--> statement-breakpoint
CREATE INDEX `skill_usage_events_skill_id_idx` ON `skill_usage_events` (`skill_id`);
--> statement-breakpoint
CREATE INDEX `skill_usage_events_skill_slug_idx` ON `skill_usage_events` (`skill_slug`);
