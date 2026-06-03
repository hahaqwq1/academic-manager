PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`level` text NOT NULL,
	`role` text NOT NULL,
	`grant_no` text,
	`funding` text,
	`funding_amount` real,
	`funding_currency` text DEFAULT '元',
	`status` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "projects_level_check" CHECK("__new_projects"."level" IN ('国家级', '省部级', '校级', '其他')),
	CONSTRAINT "projects_role_check" CHECK("__new_projects"."role" IN ('主持', '参与')),
	CONSTRAINT "projects_status_check" CHECK("__new_projects"."status" IN ('拟申报', '申报中', '已立项', '结题中', '已结题', '未中')),
	CONSTRAINT "projects_date_order_check" CHECK("__new_projects"."start_date" IS NULL OR "__new_projects"."end_date" IS NULL OR "__new_projects"."end_date" >= "__new_projects"."start_date"),
	CONSTRAINT "projects_funding_amount_check" CHECK("__new_projects"."funding_amount" IS NULL OR "__new_projects"."funding_amount" >= 0),
	CONSTRAINT "projects_funding_currency_check" CHECK("__new_projects"."funding_currency" IS NULL OR "__new_projects"."funding_currency" IN ('元', '万元', '美元', '欧元'))
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "title", "level", "role", "grant_no", "funding", "status", "start_date", "end_date", "notes", "created_at", "updated_at") SELECT "id", "title", "level", "role", "grant_no", "funding", "status", "start_date", "end_date", "notes", "created_at", "updated_at" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
ALTER TABLE `works` ADD `doi` text;--> statement-breakpoint
ALTER TABLE `works` ADD `journal` text;--> statement-breakpoint
CREATE UNIQUE INDEX `works_doi_unique_idx` ON `works` (`doi`);