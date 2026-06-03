// 投稿查询测试 —— P2-7
//
// listSubmissionsForWork:某作品全部轮次,按 round 升序。
// listPendingSubmissions:仅「在审 AND decided_at IS NULL」,联表作品,计算 daysElapsed /
//   isOverdue(>90 严格),排序「超期优先,其次 daysElapsed 倒序」。用 fake timers 钉死今天。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeSubmission, makeWork } from "../helpers/factories";
import { createTestContext, type TestDb } from "../helpers/test-db";

const holder = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/db", () => ({
  get db() {
    return holder.db;
  },
}));

import {
  listPendingSubmissions,
  listSubmissionsForWork,
} from "@/db/queries/submissions";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
  vi.useFakeTimers();
  // TZ=UTC(vitest.config),今天本地零点 = 2024-05-15。
  vi.setSystemTime(new Date("2024-05-15T12:00:00.000Z"));
});
afterEach(() => {
  vi.useRealTimers();
  ctx.sqlite.close();
});

describe("listSubmissionsForWork", () => {
  it("按 round 升序返回某作品全部轮次", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    makeSubmission(ctx.db, w.id, { round: 2, journal: "B" });
    makeSubmission(ctx.db, w.id, { round: 1, journal: "A" });
    makeSubmission(ctx.db, w.id, { round: 3, journal: "C" });
    // 另一作品的投稿不应混入。
    const other = makeWork(ctx.db, { title: "Other" });
    makeSubmission(ctx.db, other.id, { round: 1, journal: "Z" });
    const list = await listSubmissionsForWork(w.id);
    expect(list.map((s) => s.round)).toEqual([1, 2, 3]);
    expect(list.map((s) => s.journal)).toEqual(["A", "B", "C"]);
  });
});

describe("listPendingSubmissions", () => {
  it("仅纳入「在审且未决」,排除已决/非在审", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    makeSubmission(ctx.db, w.id, {
      round: 1,
      status: "在审",
      submitted_at: "2024-04-15",
      decided_at: null,
    });
    makeSubmission(ctx.db, w.id, {
      round: 2,
      status: "在审",
      submitted_at: "2024-04-15",
      decided_at: "2024-05-01",
    }); // 已决,排除
    makeSubmission(ctx.db, w.id, {
      round: 3,
      status: "录用",
      submitted_at: "2024-04-15",
      decided_at: null,
    }); // 非在审,排除
    const list = await listPendingSubmissions();
    expect(list).toHaveLength(1);
    expect(list[0]!.round).toBe(1);
    expect(list[0]!.work_title).toBe("W"); // 联表带出作品标题
  });

  it("daysElapsed 与 isOverdue(>90 严格);排序:超期优先,其次天数倒序", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    // 今天 2024-05-15。
    makeSubmission(ctx.db, w.id, {
      round: 1,
      submitted_at: "2024-01-01",
      journal: "超期135",
    }); // 135 天,超期
    makeSubmission(ctx.db, w.id, {
      round: 2,
      submitted_at: "2024-04-15",
      journal: "正常30",
    }); // 30 天
    makeSubmission(ctx.db, w.id, {
      round: 3,
      submitted_at: "2024-05-14",
      journal: "正常1",
    }); // 1 天
    const list = await listPendingSubmissions();
    expect(list.map((s) => s.journal)).toEqual(["超期135", "正常30", "正常1"]);
    expect(list[0]).toMatchObject({ daysElapsed: 135, isOverdue: true });
    expect(list[1]).toMatchObject({ daysElapsed: 30, isOverdue: false });
    expect(list[2]).toMatchObject({ daysElapsed: 1, isOverdue: false });
  });

  it("超期边界:恰好 90 天不超期,91 天超期", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    makeSubmission(ctx.db, w.id, {
      round: 1,
      submitted_at: "2024-02-15",
      journal: "d90",
    }); // 90 天
    makeSubmission(ctx.db, w.id, {
      round: 2,
      submitted_at: "2024-02-14",
      journal: "d91",
    }); // 91 天
    const byJournal = Object.fromEntries(
      (await listPendingSubmissions()).map((s) => [s.journal, s]),
    );
    expect(byJournal["d90"]).toMatchObject({
      daysElapsed: 90,
      isOverdue: false,
    });
    expect(byJournal["d91"]).toMatchObject({
      daysElapsed: 91,
      isOverdue: true,
    });
  });

  it("未来投稿日 daysElapsed 截断为 0;非法日期记 0", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    makeSubmission(ctx.db, w.id, {
      round: 1,
      submitted_at: "2024-12-31",
      journal: "future",
    });
    makeSubmission(ctx.db, w.id, {
      round: 2,
      submitted_at: "garbage",
      journal: "bad",
    });
    const byJournal = Object.fromEntries(
      (await listPendingSubmissions()).map((s) => [s.journal, s]),
    );
    expect(byJournal["future"]!.daysElapsed).toBe(0);
    expect(byJournal["bad"]!.daysElapsed).toBe(0);
  });

  it("空 → 空数组", async () => {
    expect(await listPendingSubmissions()).toEqual([]);
  });
});
