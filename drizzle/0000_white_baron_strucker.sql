CREATE TABLE `records` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`data` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `versions` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`revision` integer NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`, `revision`)
);
