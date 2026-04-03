PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_feature_flags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feature_key` text NOT NULL,
	`min_plan` text DEFAULT 'free' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`description` text
);
--> statement-breakpoint
INSERT INTO `__new_feature_flags`("id", "feature_key", "min_plan", "enabled", "description") SELECT "id", "feature_key", "min_plan", "enabled", "description" FROM `feature_flags`;--> statement-breakpoint
DROP TABLE `feature_flags`;--> statement-breakpoint
ALTER TABLE `__new_feature_flags` RENAME TO `feature_flags`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_feature_key` ON `feature_flags` (`feature_key`);--> statement-breakpoint
CREATE TABLE `__new_refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_refresh_tokens`("id", "user_id", "token", "expires_at", "created_at", "revoked") SELECT "id", "user_id", "token", "expires_at", "created_at", "revoked" FROM `refresh_tokens`;--> statement-breakpoint
DROP TABLE `refresh_tokens`;--> statement-breakpoint
ALTER TABLE `__new_refresh_tokens` RENAME TO `refresh_tokens`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_refresh_token` ON `refresh_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`avatar_url` text,
	`plan` text DEFAULT 'free' NOT NULL,
	`plan_started_at` text,
	`plan_expires_at` text,
	`google_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "name", "avatar_url", "plan", "plan_started_at", "plan_expires_at", "google_id", "created_at", "updated_at") SELECT "id", "email", "name", "avatar_url", "plan", "plan_started_at", "plan_expires_at", "google_id", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_id_unique` ON `users` (`google_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_user_id` ON `transactions` (`user_id`);