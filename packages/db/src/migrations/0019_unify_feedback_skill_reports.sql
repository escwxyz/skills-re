ALTER TABLE `feedback` ADD `skill_id` text REFERENCES skills(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `feedback` ADD `skill_slug` text;--> statement-breakpoint
ALTER TABLE `feedback` ADD `skill_title` text;--> statement-breakpoint
CREATE INDEX `feedback_skill_id_idx` ON `feedback` (`skill_id`);--> statement-breakpoint
CREATE INDEX `feedback_skill_slug_idx` ON `feedback` (`skill_slug`);
