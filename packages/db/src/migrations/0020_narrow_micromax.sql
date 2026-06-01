ALTER TABLE `collections` ADD `kind` text DEFAULT 'custom' NOT NULL;--> statement-breakpoint
ALTER TABLE `collections` ADD `visibility` text DEFAULT 'private' NOT NULL;--> statement-breakpoint
UPDATE `collections` SET `visibility` = 'public' WHERE `kind` = 'custom';--> statement-breakpoint
DROP INDEX `collections_slug_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `collections_user_slug_unique` ON `collections` (`user_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `collections_user_default_unique` ON `collections` (`user_id`) WHERE "collections"."kind" = 'default';--> statement-breakpoint
CREATE INDEX `collections_visibility_status_idx` ON `collections` (`visibility`,`status`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_collections_skills` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`collection_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_collections_skills`("id", "created_at", "updated_at", "collection_id", "skill_id", "position")
SELECT 'collection_skill_' || lower(hex(randomblob(16))), cast(unixepoch('subsecond') * 1000 as integer), cast(unixepoch('subsecond') * 1000 as integer), "collection_id", "skill_id", "position"
FROM `collections_skills`;--> statement-breakpoint
DROP TABLE `collections_skills`;--> statement-breakpoint
ALTER TABLE `__new_collections_skills` RENAME TO `collections_skills`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `collections_skills_unique` ON `collections_skills` (`collection_id`,`skill_id`);--> statement-breakpoint
CREATE INDEX `collections_skills_collection_id_idx` ON `collections_skills` (`collection_id`);--> statement-breakpoint
INSERT INTO `collections` (
	`id`,
	`created_at`,
	`updated_at`,
	`description`,
	`slug`,
	`status`,
	`title`,
	`user_id`,
	`kind`,
	`visibility`
)
SELECT
	'default_collection_' || lower(hex(randomblob(16))),
	min(`saved_skills`.`created_at`),
	cast(unixepoch('subsecond') * 1000 as integer),
	'Skills saved to your personal collection.',
	'default-' || lower(hex(randomblob(16))),
	'active',
	'Saved Skills',
	`saved_skills`.`user_id`,
	'default',
	'private'
FROM `saved_skills`
WHERE NOT EXISTS (
	SELECT 1
	FROM `collections`
	WHERE `collections`.`user_id` = `saved_skills`.`user_id`
		AND `collections`.`kind` = 'default'
)
GROUP BY `saved_skills`.`user_id`;--> statement-breakpoint
INSERT OR IGNORE INTO `collections_skills` (
	`id`,
	`created_at`,
	`updated_at`,
	`collection_id`,
	`skill_id`,
	`position`
)
SELECT
	`saved_skills`.`id`,
	`saved_skills`.`created_at`,
	`saved_skills`.`updated_at`,
	`collections`.`id`,
	`saved_skills`.`skill_id`,
	row_number() OVER (
		PARTITION BY `saved_skills`.`user_id`
		ORDER BY `saved_skills`.`created_at`, `saved_skills`.`id`
	) - 1
FROM `saved_skills`
INNER JOIN `collections`
	ON `collections`.`user_id` = `saved_skills`.`user_id`
	AND `collections`.`kind` = 'default';
