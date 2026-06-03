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
  currencySchema,
} from "@/lib/constants";
import {
  DATE_FORMAT_REGEX,
  DATE_FORMAT_MESSAGE,
  DATE_INVALID_MESSAGE,
  isRealCalendarDate,
  isProjectDateOrderValid,
  projectDateOrderRefineParams,
  isSubmissionDateOrderValid,
  submissionDateOrderRefineParams,
} from "@/lib/date-rules";

// 日期规则(格式正则、真实日历日校验、跨字段顺序断言)统一搬到 @/lib/date-rules,
// 由表单与导入恢复共享。此处再导出 isRealCalendarDate 以保持历史导入方(actions/export 等)兼容。
export { isRealCalendarDate };

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

// 同上,但对 trim 后的长度设上限(P3-12 小加固):防止超长文本撑爆单元格 / 存储。
// 空 → null 不受长度约束;非空才校验 .max()。
function nullableTrimmedStringMax(max: number, message: string) {
  return z.preprocess((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    }
    return value;
  }, z.string().max(max, message).nullable());
}

// 标题:必填,trim 后非空,否则报「请输入标题」。
const titleString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1, "请输入标题"),
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
}, z.string().regex(DATE_FORMAT_REGEX, DATE_FORMAT_MESSAGE).refine(isRealCalendarDate, DATE_INVALID_MESSAGE).nullable());

// 署名角色:可空枚举。空串 / null → null;否则按 authorRoleSchema 校验。
const nullableAuthorRole = z.preprocess((value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}, authorRoleSchema.nullable());

// 非负金额(real):空 / null → null;否则 coerce 为数字并校验 >= 0(允许小数,如 12.5 万元)。
const nullableNonNegativeNumber = z.preprocess((value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}, z.coerce.number().min(0, "经费金额不能为负数").nullable());

// 经费币种:空 → 默认「元」;否则按白名单校验。
const fundingCurrencyField = z.preprocess((value) => {
  if (value === null || value === undefined) return "元";
  if (typeof value === "string" && value.trim() === "") return "元";
  return value;
}, currencySchema);

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
  summary: nullableTrimmedStringMax(10000, "摘要不超过 10000 字"),
  notes: nullableTrimmedStringMax(5000, "备注不超过 5000 字"),
  file_path: nullableTrimmedStringMax(500, "文件路径不超过 500 字符"),
  published_at: nullableDateString,
  doi: nullableTrimmedStringMax(255, "DOI 不超过 255 字符"),
  journal: nullableTrimmedStringMax(255, "期刊名不超过 255 字符"),
  tagIds: z.array(z.number()).default([]),
});

export type WorkInput = z.infer<typeof workInputSchema>;

// ---------------------------------------------------------------------------
// 项目输入契约 —— Phase 3:client 表单与 server action 共用。
// level / role / status 为必填枚举;其余文本与起止日期可空。
// ---------------------------------------------------------------------------
export const projectInputSchema = z
  .object({
    title: titleString,
    level: projectLevelSchema,
    role: projectRoleSchema,
    status: projectStatusSchema,
    grant_no: nullableTrimmedString,
    funding: nullableTrimmedString,
    funding_amount: nullableNonNegativeNumber,
    funding_currency: fundingCurrencyField,
    start_date: nullableDateString,
    end_date: nullableDateString,
    notes: nullableTrimmedStringMax(5000, "备注不超过 5000 字"),
    tagIds: z.array(z.number()).default([]),
  })
  // 跨字段:仅当起止日期都填了才校验(规则 + 文案 + 挂载字段统一来自 date-rules,与导入恢复同源)。
  // 错误挂在 end_date 上,表单在结束日期字段下行内显示。
  .refine(isProjectDateOrderValid, projectDateOrderRefineParams);

export type ProjectInput = z.infer<typeof projectInputSchema>;

// ---------------------------------------------------------------------------
// 投稿输入契约 —— Phase 4:某作品的一条投稿轮次。
// work_id 由调用方在 server 端绑定,不在表单契约内。
// journal / round / status / submitted_at 必填;decided_at / review_notes 可空。
// round:正整数(>=1)。
// ---------------------------------------------------------------------------
const journalString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1, "请输入期刊 / 投稿目标"),
);

const positiveRound = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return value;
    if (typeof value === "string" && value.trim() === "") return value;
    return value;
  },
  z.coerce.number().int("轮次必须为整数").min(1, "轮次至少为 1"),
);

const requiredDateString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z
    .string()
    .regex(DATE_FORMAT_REGEX, DATE_FORMAT_MESSAGE)
    .refine(isRealCalendarDate, DATE_INVALID_MESSAGE),
);

export const submissionInputSchema = z
  .object({
    journal: journalString,
    round: positiveRound,
    status: submissionStatusSchema,
    submitted_at: requiredDateString,
    decided_at: nullableDateString,
    review_notes: nullableTrimmedString,
  })
  // 跨字段:决定日期填了才校验,且不得早于投稿日期(规则 + 文案统一来自 date-rules,与导入恢复同源)。
  .refine(isSubmissionDateOrderValid, submissionDateOrderRefineParams);

export type SubmissionInput = z.infer<typeof submissionInputSchema>;
