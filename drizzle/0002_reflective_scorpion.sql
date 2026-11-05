CREATE TABLE `highlights` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`data` text NOT NULL,
	`revision` integer NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
