CREATE TABLE `entity_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entity_tags_unique_idx` ON `entity_tags` (`entity_type`,`entity_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `entity_tags_tag_idx` ON `entity_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `entity_tags_entity_idx` ON `entity_tags` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `project_outputs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`work_id` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_outputs_unique_idx` ON `project_outputs` (`project_id`,`work_id`);--> statement-breakpoint
CREATE INDEX `project_outputs_project_idx` ON `project_outputs` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_outputs_work_idx` ON `project_outputs` (`work_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`level` text NOT NULL,
	`role` text NOT NULL,
	`grant_no` text,
	`funding` text,
	`status` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_id` integer NOT NULL,
	`journal` text NOT NULL,
	`round` integer NOT NULL,
	`status` text NOT NULL,
	`submitted_at` text NOT NULL,
	`decided_at` text,
	`review_notes` text,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `submissions_work_idx` ON `submissions` (`work_id`);--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`status`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `works` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`authors` text,
	`author_role` text,
	`word_count` integer,
	`summary` text,
	`notes` text,
	`file_path` text,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `works_type_idx` ON `works` (`type`);--> statement-breakpoint
CREATE INDEX `works_status_idx` ON `works` (`status`);