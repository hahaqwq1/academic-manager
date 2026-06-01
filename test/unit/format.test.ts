// 格式化工具单元测试 —— P2-7
//
// 纯函数。空值占位「—」、纯日期按本地零点解析(不被当 UTC 偏移一天)。
// 注意:formatDateTime 的时分依赖本地时区,CI 多在 UTC,故对带时间的断言只校验
// 「非占位 + 含年份」,避免跨时区脆弱;纯日期(本地零点)在任意时区都落同一天,可精确断言。
import { describe, it, expect } from "vitest";

import { formatDate, formatDateTime, parseDateOnly } from "@/lib/format";

describe("formatDate", () => {
  it("null / undefined / 空串 / 纯空白 → 「—」", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
    expect(formatDate("   ")).toBe("—");
  });

  it("YYYY-MM-DD 格式化为中文年月日(不偏移一天)", () => {
    const s = formatDate("2025-03-15");
    expect(s).toContain("2025");
    expect(s).toContain("3");
    expect(s).toContain("15");
    // 不应因 UTC 解析偏移到 14 日。
    expect(s).not.toContain("14");
  });

  it("非法字符串 → 「—」", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("不存在的日历日(2024-02-30)→ 「—」,不静默滚动显示为 3 月 1 日", () => {
    const s = formatDate("2024-02-30");
    expect(s).toBe("—");
    expect(s).not.toContain("3月");
  });
});

describe("formatDateTime", () => {
  it("null / 空 → 「—」", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("")).toBe("—");
  });

  it("ISO8601 时间戳 → 含年份的非占位字符串", () => {
    const s = formatDateTime("2026-05-29T14:30:00.000Z");
    expect(s).not.toBe("—");
    expect(s).toContain("2026");
  });

  it("非法字符串 → 「—」", () => {
    expect(formatDateTime("garbage")).toBe("—");
  });
});

describe("parseDateOnly(真实日历日回填校验)", () => {
  it("合法 YYYY-MM-DD → 本地零点 Date", () => {
    const d = parseDateOnly("2025-03-15");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2025);
    expect(d!.getMonth()).toBe(2); // 0-based:3 月
    expect(d!.getDate()).toBe(15);
    expect(d!.getHours()).toBe(0);
  });

  it("不存在的日历日 2024-02-30 → null(不静默滚动到 3 月 1 日)", () => {
    expect(parseDateOnly("2024-02-30")).toBeNull();
  });

  it("非法月份 / 月 00 / 日 00 → null", () => {
    expect(parseDateOnly("2024-13-01")).toBeNull();
    expect(parseDateOnly("2024-00-10")).toBeNull();
    expect(parseDateOnly("2024-05-00")).toBeNull();
  });

  it("闰年 2024-02-29 合法,平年 2025-02-29 → null", () => {
    expect(parseDateOnly("2024-02-29")).not.toBeNull();
    expect(parseDateOnly("2025-02-29")).toBeNull();
  });

  it("格式不符 / 空 / null / undefined → null", () => {
    expect(parseDateOnly("2024/01/01")).toBeNull();
    expect(parseDateOnly("2024-1-1")).toBeNull();
    expect(parseDateOnly("garbage")).toBeNull();
    expect(parseDateOnly("")).toBeNull();
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly(undefined)).toBeNull();
  });
});
