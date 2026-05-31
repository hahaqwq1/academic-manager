// 表单校验 Schema —— Phase 2(作品)/ Phase 3(项目)/ Phase 4(投稿)
//
// 用 zod 4 + src/lib/constants.ts 的枚举 schema 定义各实体输入的统一契约。
// server action 用 *.safeParse 校验客户端传入的纯对象,
// client 表单按返回的 errors 在各字段下显示行内中文错误。
//
// 约定:
// - 可空文本字段:空串 / 仅空白 → null(预处理),否则保留 trim 后的值。
// - word_count:空 / 未填 → null;否则 coerce 为非负整数。
// - 日期字段:可空,形如 YYYY-MM-DD;空 → null。
// - tagIds:number 数组,默认 []。
import { z } from "zod";

import {
  workTypeSchema,
  workStatusSchema,
  authorRoleSchema,
  projectLevelSchema,
  projectRoleSchema,
  projectStatusSchema,
  submissionStatusSchema,
} from "@/lib/constants";

// 校验 "YYYY-MM-DD" 是真实日历日:排除 2024-02-30 / 2024-13-01 等(正则只管格式,
// 不管日历有效性;new Date(y,m-1,d) 会把非法日静默滚动,故回填后逐项核对)。
// 导出/恢复(P2-8 importDatabase)也复用此校验拦截非法日期。
export function isRealCalendarDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d
  );
}

// 把「空串 / 仅空白 / null / undefined」统一归一化为 null,其余 trim 后保留。
// 用于可空自由文本字段(authors / summary / notes / file_path 等)。
const nullableTrimmedString = z.preprocess((value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value;
}, z.string().nullable());

// 标题:必填,trim 后非空,否则报「请输入标题」。
const titleString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1, "请输入标题")
);

// 字数:可空非负整数。空串 / null / undefined → null;其余 coerce 为整数并校验 >= 0。
const nullableNonNegativeInt = z.preprocess((value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}, z.coerce.number().int("字数必须为整数").min(0, "字数不能为负数").nullable());

// 日期:可空,形如 YYYY-MM-DD。空 → null;否则校验格式。
const nullableDateString = z.preprocess((value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD").refine(isRealCalendarDate, "日期无效,请检查月份与日期").nullable());

// 署名角色:可空枚举。空串 / null → null;否则按 authorRoleSchema 校验。
const nullableAuthorRole = z.preprocess((value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}, authorRoleSchema.nullable());

// ---------------------------------------------------------------------------
// 作品输入契约 —— Phase 2:client 表单与 server action 共用。
// ---------------------------------------------------------------------------
export const workInputSchema = z.object({
  type: workTypeSchema,
  title: titleString,
  status: workStatusSchema,
  authors: nullableTrimmedString,
  author_role: nullableAuthorRole,
  word_count: nullableNonNegativeInt,
  summary: nullableTrimmedString,
  notes: nullableTrimmedString,
  file_path: nullableTrimmedString,
  published_at: nullableDateString,
  tagIds: z.array(z.number()).default([]),
});

export type WorkInput = z.infer<typeof workInputSchema>;

// ---------------------------------------------------------------------------
// 项目输入契约 —— Phase 3:client 表单与 server action 共用。
// level / role / status 为必填枚举;其余文本与起止日期可空。
// ---------------------------------------------------------------------------
export const projectInputSchema = z.object({
  title: titleString,
  level: projectLevelSchema,
  role: projectRoleSchema,
  status: projectStatusSchema,
  grant_no: nullableTrimmedString,
  funding: nullableTrimmedString,
  start_date: nullableDateString,
  end_date: nullableDateString,
  notes: nullableTrimmedString,
  tagIds: z.array(z.number()).default([]),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;

// ---------------------------------------------------------------------------
// 投稿输入契约 —— Phase 4:某作品的一条投稿轮次。
// work_id 由调用方在 server 端绑定,不在表单契约内。
// journal / round / status / submitted_at 必填;decided_at / review_notes 可空。
// round:正整数(>=1)。
// ---------------------------------------------------------------------------
const journalString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1, "请输入期刊 / 投稿目标")
);

const positiveRound = z.preprocess((value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === "string" && value.trim() === "") return value;
  return value;
}, z.coerce.number().int("轮次必须为整数").min(1, "轮次至少为 1"));

const requiredDateString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD")
    .refine(isRealCalendarDate, "日期无效,请检查月份与日期")
);

export const submissionInputSchema = z.object({
  journal: journalString,
  round: positiveRound,
  status: submissionStatusSchema,
  submitted_at: requiredDateString,
  decided_at: nullableDateString,
  review_notes: nullableTrimmedString,
});

export type SubmissionInput = z.infer<typeof submissionInputSchema>;
