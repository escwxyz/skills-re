CREATE TABLE `saved_skills` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`skill_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_skills_user_id_skill_id_unique` ON `saved_skills` (`user_id`,`skill_id`);--> statement-breakpoint
CREATE INDEX `saved_skills_user_id_idx` ON `saved_skills` (`user_id`);--> statement-breakpoint
CREATE INDEX `saved_skills_skill_id_idx` ON `saved_skills` (`skill_id`);--> statement-breakpoint
CREATE INDEX `saved_skills_created_at_idx` ON `saved_skills` (`created_at`);