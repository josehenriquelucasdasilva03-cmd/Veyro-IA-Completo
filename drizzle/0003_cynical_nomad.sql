CREATE TABLE `claim_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`claim_id` text NOT NULL,
	`source_id` text NOT NULL,
	`evidence` text NOT NULL,
	FOREIGN KEY (`claim_id`) REFERENCES `research_claims`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `research_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `knowledge_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`conversation_id` text,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_jobs_user_conversation` ON `knowledge_jobs` (`user_id`,`conversation_id`);--> statement-breakpoint
CREATE TABLE `research_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`research_id` text NOT NULL,
	`text` text NOT NULL,
	`status` text NOT NULL,
	`explanation` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`research_id`) REFERENCES `research_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_claims_research` ON `research_claims` (`research_id`);--> statement-breakpoint
CREATE TABLE `research_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`conversation_id` text,
	`query` text NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`answer` text DEFAULT '' NOT NULL,
	`report` text DEFAULT '{}' NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_research_user_created` ON `research_sessions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `research_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`research_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`domain` text NOT NULL,
	`published` text,
	`retrieved_at` integer NOT NULL,
	`score` integer NOT NULL,
	`content_hash` text NOT NULL,
	`excerpt` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`research_id`) REFERENCES `research_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sources_research` ON `research_sources` (`research_id`);--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `research_id` text;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `embedding` text;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `embedding_model` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `archived` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `deleted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `manual_title` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `summary` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `summary_through` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `summary_memory_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `memories` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `memories` ADD `scope` text DEFAULT 'project' NOT NULL;--> statement-breakpoint
ALTER TABLE `memories` ADD `conversation_id` text;--> statement-breakpoint
ALTER TABLE `memories` ADD `category` text DEFAULT 'preference' NOT NULL;--> statement-breakpoint
ALTER TABLE `memories` ADD `embedding` text;--> statement-breakpoint
ALTER TABLE `memories` ADD `embedding_model` text;--> statement-breakpoint
ALTER TABLE `memories` ADD `revision` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE memories SET scope = CASE WHEN project_id IS NULL THEN 'user' ELSE 'project' END, updated_at=created_at;

--> statement-breakpoint
UPDATE conversations SET manual_title=1 WHERE title!='Nova conversa';
