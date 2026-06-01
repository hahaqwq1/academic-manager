// 格式化工具 —— Phase 2
//
// 统一日期 / 日期时间的中文展示;空值占位符统一为「—」。

// 占位符:空值 / 无效值统一展示。
const EMPTY = "—";

// 构造本地零点 Date 并回填核对:new Date(y, m-1, d) 会把非法日(2024-02-30)静默滚到下月
// (滚成 3 月 1 日且 getTime() 非 NaN),故构造后逐项核对年/月/日,不符返回 null。
// 这是「纯日期合法性」的唯一真源:parseDate / parseDateOnly 共用,validations 的
// isRealCalendarDate 亦委托 parseDateOnly,避免三处各写一份判定逻辑而漂移。
function makeLocalDate(year: number, month: number, day: number): Date | null {
  const dt = new Date(year, month - 1, day);
  return dt.getFullYear() === year &&
    dt.getMonth() === month - 1 &&
    dt.getDate() === day
    ? dt
    : null;
}

// 把 ISO8601 或 YYYY-MM-DD 字符串解析为 Date;非法(含不存在的日历日)返回 null。
function parseDate(value: string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  // 纯日期(YYYY-MM-DD)按本地时区零点解析,避免被当成 UTC 而偏移一天;并回填核对真实日历日。
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    return makeLocalDate(
      Number(dateOnly[1]),
      Number(dateOnly[2]),
      Number(dateOnly[3])
    );
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

// 年月日:如「2026年5月29日」。空 / 无效 → 「—」。
export function formatDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return EMPTY;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

// 年月日 + 时分:如「2026年5月29日 14:30」。空 / 无效 → 「—」。
export function formatDateTime(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return EMPTY;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

// ---------------------------------------------------------------------------
// 日期数学工具(供查询层计算「已历天数」「距截止天数」等;P3-11 从各 query 模块抽出复用)。
// 与上方 parseDate 区别:这里只接受纯日期(YYYY-MM-DD),解析为本地零点,便于按「天」做差。
// ---------------------------------------------------------------------------

// 一天的毫秒数。
export const DAY_MS = 24 * 60 * 60 * 1000;

// 把 YYYY-MM-DD 解析为本地零点 Date;格式不符 / 非真实日历日(如 2024-02-30)→ null。
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  return makeLocalDate(Number(m[1]), Number(m[2]), Number(m[3]));
}

// 今天的本地零点。
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
