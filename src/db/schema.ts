// 数据库 Schema —— Phase 1 按设计规格第四节填充全部 6 张表
// (works / projects / submissions / tags / entity_tags / project_outputs)。
//
// 约定说明:
// - 主键统一用 integer 自增。
// - created_at / updated_at 用 text 存 ISO8601 字符串,由 JS 在写入时生成
//   (不用 sql CURRENT_TIMESTAMP,因为那不是真正的 ISO8601)。
// - 纯日期字段(start_date / end_date / submitted_at / decided_at / published_at)
//   用 text 存 "YYYY-MM-DD"。
// - 枚举列用 drizzle 的 text({ enum }) 声明:**仅在 TS 类型层收窄为字面量联合**(0-3),
//   生成的 SQL 仍是 text、零迁移;DB 行类型由此端到端带上联合类型,消除各处 `as` 强转。
//   枚举源唯一仍在 src/lib/constants.ts(zod 校验同源)。
// - 索引/唯一索引在第三个回调参数里以数组形式声明,索引名唯一且语义明确。
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// 用相对路径(非 @/ 别名):本文件会被 drizzle-kit / tsx 等工具直接加载,
// 这些工具未必解析 tsconfig 的 @/ 路径别名,相对路径最稳。
import {
  AUTHOR_ROLES,
  CURRENCIES,
  ENTITY_TYPES,
  PROJECT_LEVELS,
  PROJECT_ROLES,
  PROJECT_STATUSES,
  SUBMISSION_STATUSES,
  WORK_STATUSES,
  WORK_TYPES,
} from "../lib/constants";

// 当前时间的 ISO8601 字符串:构造一个 Date 实例并调用 toISOString()。
const isoNow = () => new Date().toISOString();

// 从枚举常量数组构造 CHECK 约束的 IN 列表 SQL 片段。
// 值取自 constants.ts 的 as const 数组(与各列 text({enum}) 同源,保持单一真源),
// 内部均无单引号,可安全内联为字面量。用 sql.raw 内联(而非 ${value} 参数绑定),
// 因为 CHECK 要落进生成的迁移 DDL —— 参数绑定会变成 ? 占位符,DDL 里非法。
const inList = (values: readonly string[]) =>
  sql.raw(values.map((v) => `'${v}'`).join(", "));

// 作品表:论文 / 评论 / 草稿 / 其他成果的核心实体。
export const works = sqliteTable(
  "works",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // 作品类型,英文 key:paper | commentary | draft | other
    type: text("type", { enum: WORK_TYPES }).notNull(),
    title: text("title").notNull(),
    // 进度状态(中文值):构思|写作中|已完成|投稿中|已发表|已搁置
    status: text("status", { enum: WORK_STATUSES }).notNull(),
    // 作者列表(自由文本,可空)
    authors: text("authors"),
    // 本人署名角色(中文值):第一作者|通讯作者|独著|参与
    author_role: text("author_role", { enum: AUTHOR_ROLES }),
    // 字数
    word_count: integer("word_count"),
    // 摘要
    summary: text("summary"),
    // 备注
    notes: text("notes"),
    // 关联文件路径
    file_path: text("file_path"),
    // 发表日期(YYYY-MM-DD),用于看板「年度发表数」统计,可空
    published_at: text("published_at"),
    // DOI(数字对象唯一标识,可空);唯一索引去重,未填存 null(多个 null 互不冲突)
    doi: text("doi"),
    // 发表期刊(可空);引用导出优先用此,缺失时由「录用/已决」投稿的 journal 兜底
    journal: text("journal"),
    created_at: text("created_at")
      .notNull()
      .$defaultFn(() => isoNow()),
    updated_at: text("updated_at")
      .notNull()
      .$defaultFn(() => isoNow())
      .$onUpdateFn(() => isoNow()),
  },
  (t) => [
    index("works_type_idx").on(t.type),
    index("works_status_idx").on(t.status),
    // DOI 唯一(SQLite 唯一索引中多个 NULL 互不冲突,即「忽略未填 DOI」)。
    uniqueIndex("works_doi_unique_idx").on(t.doi),
    // DB 层兜底:枚举白名单 + 非负字数。任何绕过 zod 的写路径(直连 / 未来新 action)也无法落脏值。
    check("works_type_check", sql`${t.type} IN (${inList(WORK_TYPES)})`),
    check("works_status_check", sql`${t.status} IN (${inList(WORK_STATUSES)})`),
    check(
      "works_author_role_check",
      sql`${t.author_role} IS NULL OR ${t.author_role} IN (${inList(AUTHOR_ROLES)})`,
    ),
    check(
      "works_word_count_check",
      sql`${t.word_count} IS NULL OR ${t.word_count} >= 0`,
    ),
  ],
);

// 项目表:课题 / 基金等科研项目。
export const projects = sqliteTable(
  "projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    // 级别(中文值):国家级|省部级|校级|其他
    level: text("level", { enum: PROJECT_LEVELS }).notNull(),
    // 角色(中文值):主持|参与
    role: text("role", { enum: PROJECT_ROLES }).notNull(),
    // 项目编号
    grant_no: text("grant_no"),
    // 经费(旧:自由文本,保留作遗留展示)
    funding: text("funding"),
    // 经费(新:结构化金额 + 币种,供仪表盘汇总;旧 funding 文本不计入)
    funding_amount: real("funding_amount"),
    funding_currency: text("funding_currency", { enum: CURRENCIES }).default(
      "元",
    ),
    // 状态(中文值):拟申报|申报中|已立项|结题中|已结题|未中
    status: text("status", { enum: PROJECT_STATUSES }).notNull(),
    // 起止日期(YYYY-MM-DD),可空
    start_date: text("start_date"),
    end_date: text("end_date"),
    notes: text("notes"),
    created_at: text("created_at")
      .notNull()
      .$defaultFn(() => isoNow()),
    updated_at: text("updated_at")
      .notNull()
      .$defaultFn(() => isoNow())
      .$onUpdateFn(() => isoNow()),
  },
  (t) => [
    index("projects_status_idx").on(t.status),
    // DB 层兜底:级别 / 角色 / 状态枚举白名单。
    check(
      "projects_level_check",
      sql`${t.level} IN (${inList(PROJECT_LEVELS)})`,
    ),
    check("projects_role_check", sql`${t.role} IN (${inList(PROJECT_ROLES)})`),
    check(
      "projects_status_check",
      sql`${t.status} IN (${inList(PROJECT_STATUSES)})`,
    ),
    // 跨字段日期兜底:与表单 / 导入同义;日期存为 YYYY-MM-DD,字典序即时间序,可直接比较。
    check(
      "projects_date_order_check",
      sql`${t.start_date} IS NULL OR ${t.end_date} IS NULL OR ${t.end_date} >= ${t.start_date}`,
    ),
    // 结构化经费:金额非负 + 币种白名单。
    check(
      "projects_funding_amount_check",
      sql`${t.funding_amount} IS NULL OR ${t.funding_amount} >= 0`,
    ),
    check(
      "projects_funding_currency_check",
      sql`${t.funding_currency} IS NULL OR ${t.funding_currency} IN (${inList(CURRENCIES)})`,
    ),
  ],
);

// 投稿表:某作品的投稿轨迹,支持多轮次。
// 注意:原 spec 第 4.3 节未给 submissions 时间戳,故本表不加 created_at / updated_at。
export const submissions = sqliteTable(
  "submissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // 所属作品,级联删除
    work_id: integer("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    // 期刊 / 投稿目标
    journal: text("journal").notNull(),
    // 投稿轮次
    round: integer("round").notNull(),
    // 状态(中文值):在审|退修|录用|被拒|已撤稿
    status: text("status", { enum: SUBMISSION_STATUSES }).notNull(),
    // 投稿日期(YYYY-MM-DD)
    submitted_at: text("submitted_at").notNull(),
    // 决定日期(YYYY-MM-DD),可空(尚在审则为空)
    decided_at: text("decided_at"),
    // 审稿意见备注
    review_notes: text("review_notes"),
  },
  (t) => [
    index("submissions_work_idx").on(t.work_id),
    index("submissions_status_idx").on(t.status),
    // 同一作品的轮次号唯一,避免重复录入「第 N 轮」。
    uniqueIndex("submissions_work_round_idx").on(t.work_id, t.round),
    // DB 层兜底:状态枚举白名单 + 轮次 >= 1 + 决定日期不早于投稿日期。
    check(
      "submissions_status_check",
      sql`${t.status} IN (${inList(SUBMISSION_STATUSES)})`,
    ),
    check("submissions_round_check", sql`${t.round} >= 1`),
    check(
      "submissions_date_order_check",
      sql`${t.decided_at} IS NULL OR ${t.decided_at} >= ${t.submitted_at}`,
    ),
  ],
);

// 标签表:名称唯一。
export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

// 实体标签关联表:通用多对多,可同时给 works 与 projects 打标签。
// entity_id 是多态字段(指向 works 或 projects),因此不加外键。
export const entity_tags = sqliteTable(
  "entity_tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // 实体类型,英文 key:work | project
    entity_type: text("entity_type", { enum: ENTITY_TYPES }).notNull(),
    // 多态实体 id(指向 works.id 或 projects.id)
    entity_id: integer("entity_id").notNull(),
    // 标签 id,级联删除
    tag_id: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("entity_tags_unique_idx").on(
      t.entity_type,
      t.entity_id,
      t.tag_id,
    ),
    index("entity_tags_tag_idx").on(t.tag_id),
    index("entity_tags_entity_idx").on(t.entity_type, t.entity_id),
    // DB 层兜底:多态实体类型白名单(work | project)。
    check(
      "entity_tags_entity_type_check",
      sql`${t.entity_type} IN (${inList(ENTITY_TYPES)})`,
    ),
  ],
);

// 项目成果关联表:项目 ↔ 作品多对多。
export const project_outputs = sqliteTable(
  "project_outputs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // 所属项目,级联删除
    project_id: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // 关联作品,级联删除
    work_id: integer("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("project_outputs_unique_idx").on(t.project_id, t.work_id),
    index("project_outputs_project_idx").on(t.project_id),
    index("project_outputs_work_idx").on(t.work_id),
  ],
);

// 各表推断类型导出(Select / Insert)。
export type Work = typeof works.$inferSelect;
export type NewWork = typeof works.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type EntityTag = typeof entity_tags.$inferSelect;
export type NewEntityTag = typeof entity_tags.$inferInsert;

export type ProjectOutput = typeof project_outputs.$inferSelect;
export type NewProjectOutput = typeof project_outputs.$inferInsert;
