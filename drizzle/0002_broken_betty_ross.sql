PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_entity_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "entity_tags_entity_type_check" CHECK("__new_entity_tags"."entity_type" IN ('work', 'project'))
);
--> statement-breakpoint
INSERT INTO `__new_entity_tags`("id", "entity_type", "entity_id", "tag_id") SELECT "id", "entity_type", "entity_id", "tag_id" FROM `entity_tags`;--> statement-breakpoint
DROP TABLE `entity_tags`;--> statement-breakpoint
ALTER TABLE `__new_entity_tags` RENAME TO `entity_tags`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `entity_tags_unique_idx` ON `entity_tags` (`entity_type`,`entity_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `entity_tags_tag_idx` ON `entity_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `entity_tags_entity_idx` ON `entity_tags` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `__new_projects` (
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
	`updated_at` text NOT NULL,
	CONSTRAINT "projects_level_check" CHECK("__new_projects"."level" IN ('国家级', '省部级', '校级', '其他')),
	CONSTRAINT "projects_role_check" CHECK("__new_projects"."role" IN ('主持', '参与')),
	CONSTRAINT "projects_status_check" CHECK("__new_projects"."status" IN ('拟申报', '申报中', '已立项', '结题中', '已结题', '未中')),
	CONSTRAINT "projects_date_order_check" CHECK("__new_projects"."start_date" IS NULL OR "__new_projects"."end_date" IS NULL OR "__new_projects"."end_date" >= "__new_projects"."start_date")
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "title", "level", "role", "grant_no", "funding", "status", "start_date", "end_date", "notes", "created_at", "updated_at") SELECT "id", "title", "level", "role", "grant_no", "funding", "status", "start_date", "end_date", "notes", "created_at", "updated_at" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE TABLE `__new_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_id` integer NOT NULL,
	`journal` text NOT NULL,
	`round` integer NOT NULL,
	`status` text NOT NULL,
	`submitted_at` text NOT NULL,
	`decided_at` text,
	`review_notes` text,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "submissions_status_check" CHECK("__new_submissions"."status" IN ('在审', '退修', '录用', '被拒', '已撤稿')),
	CONSTRAINT "submissions_round_check" CHECK("__new_submissions"."round" >= 1),
	CONSTRAINT "submissions_date_order_check" CHECK("__new_submissions"."decided_at" IS NULL OR "__new_submissions"."decided_at" >= "__new_submissions"."submitted_at")
);
--> statement-breakpoint
INSERT INTO `__new_submissions`("id", "work_id", "journal", "round", "status", "submitted_at", "decided_at", "review_notes") SELECT "id", "work_id", "journal", "round", "status", "submitted_at", "decided_at", "review_notes" FROM `submissions`;--> statement-breakpoint
DROP TABLE `submissions`;--> statement-breakpoint
ALTER TABLE `__new_submissions` RENAME TO `submissions`;--> statement-breakpoint
CREATE INDEX `submissions_work_idx` ON `submissions` (`work_id`);--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_work_round_idx` ON `submissions` (`work_id`,`round`);--> statement-breakpoint
CREATE TABLE `__new_works` (
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
	`updated_at` text NOT NULL,
	CONSTRAINT "works_type_check" CHECK("__new_works"."type" IN ('paper', 'commentary', 'draft', 'other')),
	CONSTRAINT "works_status_check" CHECK("__new_works"."status" IN ('构思', '写作中', '已完成', '投稿中', '已发表', '已搁置')),
	CONSTRAINT "works_author_role_check" CHECK("__new_works"."author_role" IS NULL OR "__new_works"."author_role" IN ('第一作者', '通讯作者', '独著', '参与')),
	CONSTRAINT "works_word_count_check" CHECK("__new_works"."word_count" IS NULL OR "__new_works"."word_count" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_works`("id", "type", "title", "status", "authors", "author_role", "word_count", "summary", "notes", "file_path", "published_at", "created_at", "updated_at") SELECT "id", "type", "title", "status", "authors", "author_role", "word_count", "summary", "notes", "file_path", "published_at", "created_at", "updated_at" FROM `works`;--> statement-breakpoint
DROP TABLE `works`;--> statement-breakpoint
ALTER TABLE `__new_works` RENAME TO `works`;--> statement-breakpoint
CREATE INDEX `works_type_idx` ON `works` (`type`);--> statement-breakpoint
CREATE INDEX `works_status_idx` ON `works` (`status`);