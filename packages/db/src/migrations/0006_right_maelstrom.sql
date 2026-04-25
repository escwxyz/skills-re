CREATE TABLE `collections_skills` (
	`collection_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_skills_unique` ON `collections_skills` (`collection_id`,`skill_id`);--> statement-breakpoint
CREATE INDEX `collections_skills_collection_id_idx` ON `collections_skills` (`collection_id`);--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`description` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`title` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_slug_unique` ON `collections` (`slug`);--> statement-breakpoint
CREATE INDEX `collections_status_idx` ON `collections` (`status`);--> statement-breakpoint
CREATE INDEX `collections_status_created_at_idx` ON `collections` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `collections_user_id_idx` ON `collections` (`user_id`);