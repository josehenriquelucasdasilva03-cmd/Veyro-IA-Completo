CREATE TABLE `security_quotas` (
	`user_id` text NOT NULL,
	`period_key` text NOT NULL,
	`bucket` text NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `period_key`, `bucket`)
);
