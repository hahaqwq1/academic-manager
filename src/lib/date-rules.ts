// 日期校验规则的单一真源 —— 表单(validations.ts)与导入恢复(actions/export.ts)共享
//
// 抽出二者此前各写一份、仅靠注释保持同步的部分,把「单一真源」从约定升级为结构性:
//   - 日历日格式正则与文案;
//   - isRealCalendarDate(委托 format.parseDateOnly 的真实日历日回填核对);
//   - 项目 / 投稿的跨字段日期顺序断言 + 文案 + 错误挂载字段(path)。
// 注意:表单侧的「空串 / 仅空白 → null 预处理」与「必填 vs 可空」差异仍由各自文件保留——
// 导入的是已落库的干净字符串,无需归一化;此处只共享真正会漂移的「规则与文案」。
import { parseDateOnly } from "@/lib/format";

// "YYYY-MM-DD" 格式正则与文案(行内 regex 校验复用)。
export const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const DATE_FORMAT_MESSAGE = "日期格式应为 YYYY-MM-DD";
export const DATE_INVALID_MESSAGE = "日期无效,请检查月份与日期";

// 校验 "YYYY-MM-DD" 是真实日历日:排除 2024-02-30 / 2024-13-01 等。
// 判定逻辑唯一真源是 format.ts 的 parseDateOnly(构造后回填核对年/月/日),此处仅委托。
export function isRealCalendarDate(value: string): boolean {
  return parseDateOnly(value) !== null;
}

// 跨字段:项目结束日期不得早于开始日期。两端都填才校验;
// 日期已是合法 YYYY-MM-DD,字典序即时间序,可直接字符串比较。
export const PROJECT_DATE_ORDER_MESSAGE = "结束日期不能早于开始日期";
export function isProjectDateOrderValid(v: {
  start_date?: string | null;
  end_date?: string | null;
}): boolean {
  return !(v.start_date && v.end_date) || v.end_date >= v.start_date;
}
// 直接传入 zod 的 .refine(谓词, 参数) —— 谓词与 { path, message } 一并共享,杜绝两处漂移。
export const projectDateOrderRefineParams = {
  path: ["end_date"],
  message: PROJECT_DATE_ORDER_MESSAGE,
};

// 跨字段:投稿决定日期不得早于投稿日期。决定日期填了才校验。
export const SUBMISSION_DATE_ORDER_MESSAGE = "决定日期不能早于投稿日期";
export function isSubmissionDateOrderValid(v: {
  submitted_at: string;
  decided_at?: string | null;
}): boolean {
  return !v.decided_at || v.decided_at >= v.submitted_at;
}
export const submissionDateOrderRefineParams = {
  path: ["decided_at"],
  message: SUBMISSION_DATE_ORDER_MESSAGE,
};
