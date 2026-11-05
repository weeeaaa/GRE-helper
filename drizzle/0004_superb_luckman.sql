CREATE TABLE `vocab_plan` (
	`user_id` text PRIMARY KEY NOT NULL,
	`start` text NOT NULL,
	`ids` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vocab_views` (
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`card_id` text NOT NULL,
	`viewed_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `event_id`)
);
