// .ics 序列化测试 —— v0.4
import { describe, expect, it } from "vitest";

import { buildIcs, type IcsEvent } from "@/lib/ics";

describe("buildIcs", () => {
  it("空事件:合法 VCALENDAR 骨架 + CRLF 行尾 + 日历名", () => {
    const ics = buildIcs([], { calName: "测试日历" });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("X-WR-CALNAME:测试日历");
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("全天事件:DTSTART;VALUE=DATE(去横线)+ UID + SUMMARY + DESCRIPTION", () => {
    const events: IcsEvent[] = [
      {
        uid: "u1@x",
        date: "2024-06-01",
        summary: "项目结题:某项目",
        description: "状态:结题中。",
      },
    ];
    const ics = buildIcs(events);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:u1@x");
    expect(ics).toContain("DTSTART;VALUE=DATE:20240601");
    expect(ics).toContain("DTSTAMP:20240601T000000Z");
    expect(ics).toContain("SUMMARY:项目结题:某项目");
    expect(ics).toContain("DESCRIPTION:状态:结题中。");
  });

  it("转义 RFC5545 特殊字符(分号 / 逗号 / 反斜杠 / 换行)", () => {
    const ics = buildIcs([
      { uid: "u2", date: "2024-01-02", summary: "a;b,c\\d\ne" },
    ]);
    expect(ics).toContain("SUMMARY:a\\;b\\,c\\\\d\\ne");
  });
});
