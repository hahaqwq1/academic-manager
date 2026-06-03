// 应用层枚举与常量 —— Phase 1
//
// 数据库以 text 存储枚举(见 src/db/schema.ts),此处用 zod 在应用层做校验。
// 每个枚举统一导出:
//   - 只读值数组(as const)
//   - TS 字面量联合类型(typeof arr[number])
//   - zod 枚举(z.enum(arr))
// works.type 与 entity_tags.entity_type 另导出 Record<value, label> 的中文 label map;
// 其余枚举值本身即中文,无需 map。
import { z } from "zod";

// ---------------------------------------------------------------------------
// works.type —— 英文 key + 中文 label map
// ---------------------------------------------------------------------------
export const WORK_TYPES = ["paper", "commentary", "draft", "other"] as const;
export type WorkType = (typeof WORK_TYPES)[number];
export const workTypeSchema = z.enum(WORK_TYPES);
export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  paper: "论文",
  commentary: "评论",
  draft: "草稿",
  other: "其他",
};

// ---------------------------------------------------------------------------
// works.status —— 中文值即 label
// ---------------------------------------------------------------------------
export const WORK_STATUSES = [
  "构思",
  "写作中",
  "已完成",
  "投稿中",
  "已发表",
  "已搁置",
] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];
export const workStatusSchema = z.enum(WORK_STATUSES);

// ---------------------------------------------------------------------------
// works.author_role —— 中文值即 label
// ---------------------------------------------------------------------------
export const AUTHOR_ROLES = ["第一作者", "通讯作者", "独著", "参与"] as const;
export type AuthorRole = (typeof AUTHOR_ROLES)[number];
export const authorRoleSchema = z.enum(AUTHOR_ROLES);

// ---------------------------------------------------------------------------
// projects.level —— 中文值即 label
// ---------------------------------------------------------------------------
export const PROJECT_LEVELS = ["国家级", "省部级", "校级", "其他"] as const;
export type ProjectLevel = (typeof PROJECT_LEVELS)[number];
export const projectLevelSchema = z.enum(PROJECT_LEVELS);

// ---------------------------------------------------------------------------
// projects.role —— 中文值即 label
// ---------------------------------------------------------------------------
export const PROJECT_ROLES = ["主持", "参与"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];
export const projectRoleSchema = z.enum(PROJECT_ROLES);

// ---------------------------------------------------------------------------
// projects.status —— 中文值即 label
// ---------------------------------------------------------------------------
export const PROJECT_STATUSES = [
  "拟申报",
  "申报中",
  "已立项",
  "结题中",
  "已结题",
  "未中",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const projectStatusSchema = z.enum(PROJECT_STATUSES);

// ---------------------------------------------------------------------------
// submissions.status —— 中文值即 label
// ---------------------------------------------------------------------------
export const SUBMISSION_STATUSES = [
  "在审",
  "退修",
  "录用",
  "被拒",
  "已撤稿",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];
export const submissionStatusSchema = z.enum(SUBMISSION_STATUSES);

// ---------------------------------------------------------------------------
// entity_tags.entity_type —— 英文 key + 中文 label map
// ---------------------------------------------------------------------------
export const ENTITY_TYPES = ["work", "project"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];
export const entityTypeSchema = z.enum(ENTITY_TYPES);
export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  work: "作品",
  project: "项目",
};

// ---------------------------------------------------------------------------
// projects.funding_currency —— 经费币种(中文值即 label)。表默认存「元」;
// 汇总时按币种分组(不做汇率换算),故「万元」与「元」分列统计。
// ---------------------------------------------------------------------------
export const CURRENCIES = ["元", "万元", "美元", "欧元"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const currencySchema = z.enum(CURRENCIES);

// ---------------------------------------------------------------------------
// 投稿超期天数阈值:投稿在审超过该天数视为「超期」。
// ---------------------------------------------------------------------------
export const OVERDUE_DAYS = 90;
