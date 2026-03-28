CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text(20) NOT NULL,
	`amount` real NOT NULL,
	`category` text(50) NOT NULL,
	`note` text(256),
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
