// 截止提醒日历事件测试 —— v0.4
//
// getDeadlineEvents:在审投稿 → submitted_at + OVERDUE_DAYS;结题中/临近结题项目 → end_date。
// 固定系统时间以使 getClosingProjects 的「临近结题」判定确定。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeProject, makeSubmission, makeWork } from "../helpers/factories";
import { createTestContext, type TestDb } from "../helpers/test-db";

const holder = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/db", () => ({
  get db() {
    return holder.db;
  },
}));

import { getDeadlineEvents } from "@/db/queries/calendar";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
  vi.setSystemTime(new Date("2025-01-15T00:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  ctx.sqlite.close();
});

describe("getDeadlineEvents", () => {
  it("投稿超期(submitted+90)与结题项目(end_date)各成全天事件,按日期升序", async () => {
    const w = makeWork(ctx.db, { title: "稿件甲", status: "投稿中" });
    // 在审未决:submitted 2024-01-01 + 90 天 = 2024-03-31。
    makeSubmission(ctx.db, w.id, {
      journal: "某刊",
      submitted_at: "2024-01-01",
      status: "在审",
    });
    // 结题中项目(无论日期都计入待办),end_date 2025-06-01。
    makeProject(ctx.db, {
      title: "课题乙",
      status: "结题中",
      end_date: "2025-06-01",
    });

    const events = await getDeadlineEvents();
    expect(events.map((e) => e.date)).toEqual(["2024-03-31", "2025-06-01"]);

    const [sub, proj] = events;
    expect(sub!.uid).toMatch(/^submission-\d+@academic-manager$/);
    expect(sub!.summary).toContain("稿件甲");
    expect(sub!.summary).toContain("某刊");
    expect(proj!.uid).toMatch(/^project-\d+@academic-manager$/);
    expect(proj!.summary).toBe("项目结题:课题乙");
  });

  it("空库返回 []", async () => {
    expect(await getDeadlineEvents()).toEqual([]);
  });
});
