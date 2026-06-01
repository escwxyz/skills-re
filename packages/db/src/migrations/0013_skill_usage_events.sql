CREATE TABLE `skill_usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`agent_name` text,
	`project_context` text,
	`skill_id` text,
	`skill_path` text,
	`skill_slug` text NOT NULL,
	`task_description` text,
	`user_id` text NOT NULL,
	`used_at` integer NOT NULL,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
CREATE INDEX `skill_usage_events_user_id_used_at_idx` ON `skill_usage_events` (`user_id`,`used_at`);
CREATE INDEX `skill_usage_events_skill_id_idx` ON `skill_usage_events` (`skill_id`);
CREATE INDEX `skill_usage_events_skill_slug_idx` ON `skill_usage_events` (`skill_slug`);
