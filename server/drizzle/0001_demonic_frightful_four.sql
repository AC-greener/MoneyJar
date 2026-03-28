CREATE TABLE `request_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`request_path` text NOT NULL,
	`request_method` text NOT NULL,
	`status_code` integer NOT NULL,
	`duration` integer NOT NULL,
	`request_body` text,
	`response_body` text,
	`error_message` text,
	`client_ip` text,
	`user_agent` text,
	`timestamp` integer NOT NULL,
	`ai_parsed` integer,
	`ai_model` text,
	`ai_processing_time` integer
);
--> statement-breakpoint
CREATE INDEX `idx_request_id` ON `request_logs` (`id`);--> statement-breakpoint
CREATE INDEX `idx_timestamp` ON `request_logs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_status_code` ON `request_logs` (`status_code`);--> statement-breakpoint
CREATE INDEX `idx_request_path` ON `request_logs` (`request_path`);