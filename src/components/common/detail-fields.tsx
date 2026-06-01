// 详情页字段展示组件 —— P3-11(works/[id] 与 projects/[id] 详情页共用)
//
// 两个详情页此前各自重复了一份 EMPTY / display / Field / BlockField,此处统一抽出。
// 纯展示、无客户端交互,可在 server 组件中直接使用。
import type { ReactNode } from "react";

// 空值占位符:字段值为空时的统一展示。
export const EMPTY = "—";

// 把可空文本归一为展示字符串:空 / 仅空白 → 「—」。
export function displayValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return EMPTY;
  const trimmed = value.trim();
  return trimmed === "" ? EMPTY : trimmed;
}

// 单行字段:左侧标签 + 右侧值;值缺省时弱化为占位符颜色。
export function DetailField({
  label,
  value,
  empty,
}: {
  label: string;
  value: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3 py-2 text-sm sm:grid-cols-[7rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={empty ? "text-muted-foreground" : "text-foreground"}>
        {value}
      </dd>
    </div>
  );
}

// 多行文本字段(摘要 / 备注):值占满一行,保留换行。
export function DetailBlockField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const text = displayValue(value);
  const isEmpty = text === EMPTY;
  return (
    <div className="space-y-1.5 py-2 text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p
        className={
          isEmpty
            ? "text-muted-foreground"
            : "whitespace-pre-wrap leading-relaxed text-foreground"
        }
      >
        {text}
      </p>
    </div>
  );
}
