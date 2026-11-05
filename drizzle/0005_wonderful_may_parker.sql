CREATE TABLE `vocab_images` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`url` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
