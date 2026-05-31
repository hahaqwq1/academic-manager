// 格式化工具 —— Phase 2
//
// 统一日期 / 日期时间的中文展示;空值占位符统一为「—」。

// 占位符:空值 / 无效值统一展示。
const EMPTY = "—";

// 把 ISO8601 或 YYYY-MM-DD 字符串解析为 Date;非法返回 null。
function parseDate(value: string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  // 纯日期(YYYY-MM-DD)按本地时区零点解析,避免被当成 UTC 而偏移一天。
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3])
      )
    : new Date(trimmed);
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
