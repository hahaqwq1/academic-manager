// 格式化工具单元测试 —— P2-7
//
// 纯函数。空值占位「—」、纯日期按本地零点解析(不被当 UTC 偏移一天)。
// 注意:formatDateTime 的时分依赖本地时区,CI 多在 UTC,故对带时间的断言只校验
// 「非占位 + 含年份」,避免跨时区脆弱;纯日期(本地零点)在任意时区都落同一天,可精确断言。
import { describe, it, expect } from "vitest";

import { formatDate, formatDateTime } from "@/lib/format";

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
