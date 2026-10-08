CREATE TABLE `media_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`status` text NOT NULL,
	`request` text NOT NULL,
	`outputs` text DEFAULT '[]' NOT NULL,
	`attempt` integer DEFAULT 0 NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_media_jobs_project_created` ON `media_jobs` (`project_id`,`created_at`);