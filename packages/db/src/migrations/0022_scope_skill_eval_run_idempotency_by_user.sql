DROP INDEX `skill_eval_runs_idempotency_key_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `skill_eval_runs_idempotency_key_unique` ON `skill_eval_runs` (`idempotency_key`,`created_by`);--> statement-breakpoint
