CREATE TABLE `skill_search_documents` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `skill_id` text NOT NULL,
  `snapshot_id` text NOT NULL,
  `content_hash` text NOT NULL,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `slug` text NOT NULL,
  `author_handle` text NOT NULL,
  `repository` text NOT NULL,
  `body` text NOT NULL,
  `body_size_bytes` integer NOT NULL,
  `max_indexed_body_bytes` integer NOT NULL,
  `indexing_status` text DEFAULT 'indexed' NOT NULL,
  `tags` text DEFAULT '' NOT NULL,
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
  FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE cascade ON DELETE cascade,
  FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE cascade ON DELETE cascade,
  CONSTRAINT `skill_search_documents_body_size_non_negative` CHECK(`body_size_bytes` >= 0),
  CONSTRAINT `skill_search_documents_max_indexed_body_bytes_positive` CHECK(`max_indexed_body_bytes` > 0),
  CONSTRAINT `skill_search_documents_indexing_status_valid` CHECK(`indexing_status` in ('indexed', 'truncated'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skill_search_documents_skill_id_unique` ON `skill_search_documents` (`skill_id`);
--> statement-breakpoint
CREATE INDEX `skill_search_documents_snapshot_id_idx` ON `skill_search_documents` (`snapshot_id`);
--> statement-breakpoint
CREATE INDEX `skill_search_documents_updated_at_id_idx` ON `skill_search_documents` (`updated_at`, `id`);
--> statement-breakpoint
CREATE VIRTUAL TABLE `skills_fts` USING fts5(
  `title`,
  `description`,
  `slug`,
  `author_handle`,
  `repository`,
  `body`,
  `tags`,
  content='skill_search_documents',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2',
  prefix='2 3 4'
);
--> statement-breakpoint
CREATE TRIGGER `skill_search_documents_ai` AFTER INSERT ON `skill_search_documents` BEGIN
  INSERT INTO `skills_fts`(`rowid`, `title`, `description`, `slug`, `author_handle`, `repository`, `body`, `tags`)
  VALUES (new.`id`, new.`title`, new.`description`, new.`slug`, new.`author_handle`, new.`repository`, new.`body`, new.`tags`);
END;
--> statement-breakpoint
CREATE TRIGGER `skill_search_documents_ad` AFTER DELETE ON `skill_search_documents` BEGIN
  INSERT INTO `skills_fts`(`skills_fts`, `rowid`, `title`, `description`, `slug`, `author_handle`, `repository`, `body`, `tags`)
  VALUES ('delete', old.`id`, old.`title`, old.`description`, old.`slug`, old.`author_handle`, old.`repository`, old.`body`, old.`tags`);
END;
--> statement-breakpoint
CREATE TRIGGER `skill_search_documents_au` AFTER UPDATE ON `skill_search_documents` BEGIN
  INSERT INTO `skills_fts`(`skills_fts`, `rowid`, `title`, `description`, `slug`, `author_handle`, `repository`, `body`, `tags`)
  VALUES ('delete', old.`id`, old.`title`, old.`description`, old.`slug`, old.`author_handle`, old.`repository`, old.`body`, old.`tags`);
  INSERT INTO `skills_fts`(`rowid`, `title`, `description`, `slug`, `author_handle`, `repository`, `body`, `tags`)
  VALUES (new.`id`, new.`title`, new.`description`, new.`slug`, new.`author_handle`, new.`repository`, new.`body`, new.`tags`);
END;
