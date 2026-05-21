ALTER TABLE `skills` ADD `canonical_slug` text;--> statement-breakpoint
CREATE UNIQUE INDEX `skills_repo_id_canonical_slug_unique` ON `skills` (`repo_id`, `canonical_slug`) WHERE `canonical_slug` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `skills` DROP COLUMN `stargazer_count`;
