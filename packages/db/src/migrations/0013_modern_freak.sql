CREATE TABLE `sandbox_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`adapter_id` text NOT NULL,
	`capabilities_json` text NOT NULL,
	`default_limits_json` text NOT NULL,
	`description` text,
	`display_name` text NOT NULL,
	`provider` text NOT NULL,
	`runtime_family` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`sync_time` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sandbox_agents_status_sort_order_idx` ON `sandbox_agents` (`status`,`sort_order`);--> statement-breakpoint
CREATE INDEX `sandbox_agents_provider_runtime_idx` ON `sandbox_agents` (`provider`,`runtime_family`);--> statement-breakpoint
CREATE UNIQUE INDEX `sandbox_agents_adapter_id_unique` ON `sandbox_agents` (`adapter_id`);--> statement-breakpoint
CREATE TABLE `skill_eval_case_results` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`assertion_summary_json` text DEFAULT '{}' NOT NULL,
	`baseline_artifacts_json` text,
	`baseline_duration_ms` integer,
	`baseline_exit_code` integer,
	`baseline_output_preview` text,
	`baseline_score` integer,
	`baseline_status` text,
	`baseline_token_count` integer,
	`case_id` text NOT NULL,
	`error_code` text,
	`error_message` text,
	`run_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`summary` text,
	`sync_time` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`with_skill_artifacts_json` text,
	`with_skill_duration_ms` integer,
	`with_skill_exit_code` integer,
	`with_skill_output_preview` text,
	`with_skill_score` integer,
	`with_skill_status` text DEFAULT 'pending' NOT NULL,
	`with_skill_token_count` integer,
	FOREIGN KEY (`case_id`) REFERENCES `skill_eval_cases`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `skill_eval_runs`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `skill_eval_case_results_run_status_idx` ON `skill_eval_case_results` (`run_id`,`status`);--> statement-breakpoint
CREATE INDEX `skill_eval_case_results_case_idx` ON `skill_eval_case_results` (`case_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `skill_eval_case_results_run_case_unique` ON `skill_eval_case_results` (`run_id`,`case_id`);--> statement-breakpoint
CREATE TABLE `skill_eval_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`assertions_json` text DEFAULT '[]' NOT NULL,
	`case_id` text NOT NULL,
	`expected_output` text,
	`fingerprint` text NOT NULL,
	`fixture_paths_json` text DEFAULT '[]' NOT NULL,
	`prompt` text NOT NULL,
	`prompt_preview` text NOT NULL,
	`skill_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`suite_id` text NOT NULL,
	`sync_time` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`title` text,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`suite_id`) REFERENCES `skill_eval_suites`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `skill_eval_cases_suite_sort_order_idx` ON `skill_eval_cases` (`suite_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `skill_eval_cases_skill_snapshot_idx` ON `skill_eval_cases` (`skill_id`,`snapshot_id`);--> statement-breakpoint
CREATE INDEX `skill_eval_cases_fingerprint_idx` ON `skill_eval_cases` (`fingerprint`);--> statement-breakpoint
CREATE UNIQUE INDEX `skill_eval_cases_suite_case_id_unique` ON `skill_eval_cases` (`suite_id`,`case_id`);--> statement-breakpoint
CREATE TABLE `skill_eval_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`agent_id` text NOT NULL,
	`artifact_prefix` text NOT NULL,
	`blocked_cases` integer DEFAULT 0 NOT NULL,
	`completed_at` integer,
	`cost_micros` integer,
	`created_by` text,
	`error_code` text,
	`error_message` text,
	`failed_cases` integer DEFAULT 0 NOT NULL,
	`idempotency_key` text,
	`limits_json` text NOT NULL,
	`network_json` text NOT NULL,
	`passed_cases` integer DEFAULT 0 NOT NULL,
	`policy_version` text NOT NULL,
	`queued_at` integer,
	`skill_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`started_at` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`suite_id` text NOT NULL,
	`sync_time` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`token_count` integer,
	`total_cases` integer DEFAULT 0 NOT NULL,
	`total_duration_ms` integer,
	FOREIGN KEY (`agent_id`) REFERENCES `sandbox_agents`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`suite_id`) REFERENCES `skill_eval_suites`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `skill_eval_runs_skill_sync_time_idx` ON `skill_eval_runs` (`skill_id`,`sync_time`);--> statement-breakpoint
CREATE INDEX `skill_eval_runs_snapshot_sync_time_idx` ON `skill_eval_runs` (`snapshot_id`,`sync_time`);--> statement-breakpoint
CREATE INDEX `skill_eval_runs_status_sync_time_idx` ON `skill_eval_runs` (`status`,`sync_time`);--> statement-breakpoint
CREATE INDEX `skill_eval_runs_created_by_sync_time_idx` ON `skill_eval_runs` (`created_by`,`sync_time`);--> statement-breakpoint
CREATE UNIQUE INDEX `skill_eval_runs_idempotency_key_unique` ON `skill_eval_runs` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `skill_eval_suites` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`case_count` integer DEFAULT 0 NOT NULL,
	`eval_path` text NOT NULL,
	`fingerprint` text NOT NULL,
	`skill_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`status` text NOT NULL,
	`sync_time` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`validation_errors_json` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `skill_eval_suites_skill_snapshot_idx` ON `skill_eval_suites` (`skill_id`,`snapshot_id`);--> statement-breakpoint
CREATE INDEX `skill_eval_suites_status_sync_time_idx` ON `skill_eval_suites` (`status`,`sync_time`);--> statement-breakpoint
CREATE UNIQUE INDEX `skill_eval_suites_snapshot_eval_path_fingerprint_unique` ON `skill_eval_suites` (`snapshot_id`,`eval_path`,`fingerprint`);