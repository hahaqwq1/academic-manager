// 投稿 Server Action 集成测试 —— P2-7
//
// 不 redirect,直接返回 { ok }。重点:
// - (work_id,round) 唯一约束拦重复轮次(P0-2 迁移 0001),action 捕获返回友好错误。
// - update/delete 的归属校验 and(eq(id), eq(work_id)):workId 不匹配时静默 0 行(P0-2)。
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeSubmission, makeWork } from "../helpers/factories";
import { createTestContext, type TestDb } from "../helpers/test-db";

const holder = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/db", () => ({
  get db() {
    return holder.db;
  },
}));
const revalidateMock = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));

import { submissions } from "@/db/schema";
import {
  createSubmission,
  deleteSubmission,
  updateSubmission,
} from "@/lib/actions/submissions";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
  revalidateMock.mockClear();
});
afterEach(() => ctx.sqlite.close());

const valid = {
  journal: "民族研究",
  round: 1,
  status: "在审",
  submitted_at: "2025-01-01",
};

describe("createSubmission", () => {
  it("成功写入一条轮次", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    const res = await createSubmission(w.id, valid);
    expect(res.ok).toBe(true);
    expect(
      ctx.db
        .select()
        .from(submissions)
        .where(eq(submissions.work_id, w.id))
        .all(),
    ).toHaveLength(1);
  });

  it("同作品重复轮次被唯一约束拒(返回含 UNIQUE 的错误)", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    expect((await createSubmission(w.id, { ...valid, round: 1 })).ok).toBe(
      true,
    );
    const dup = await createSubmission(w.id, {
      ...valid,
      round: 1,
      journal: "另一刊",
    });
    expect(dup.ok).toBe(false);
    expect(dup.message).toMatch(/UNIQUE/i);
    // 第 2 轮可正常录入。
    expect((await createSubmission(w.id, { ...valid, round: 2 })).ok).toBe(
      true,
    );
  });

  it("校验失败返回错误对象", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    const res = await createSubmission(w.id, {
      ...valid,
      submitted_at: "2025-02-30",
    });
    expect(res.ok).toBe(false);
    expect(res.errors?.submitted_at).toBeTruthy();
  });
});

describe("updateSubmission 归属校验", () => {
  it("workId 匹配:正常更新", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    const s = makeSubmission(ctx.db, w.id, { round: 1, journal: "原刊" });
    const res = await updateSubmission(w.id, s.id, {
      ...valid,
      journal: "改后刊",
    });
    expect(res.ok).toBe(true);
    const row = ctx.db
      .select()
      .from(submissions)
      .where(eq(submissions.id, s.id))
      .all()[0]!;
    expect(row.journal).toBe("改后刊");
  });

  it("workId 不匹配:返回 ok 但 0 行变更(归属保护)", async () => {
    const w1 = makeWork(ctx.db, { title: "W1" });
    const w2 = makeWork(ctx.db, { title: "W2" });
    const s = makeSubmission(ctx.db, w1.id, { round: 1, journal: "原刊" });
    const res = await updateSubmission(w2.id, s.id, {
      ...valid,
      journal: "越权改",
    });
    expect(res.ok).toBe(true); // 动作不报错
    const row = ctx.db
      .select()
      .from(submissions)
      .where(eq(submissions.id, s.id))
      .all()[0]!;
    expect(row.journal).toBe("原刊"); // 但未被改动
  });
});

describe("deleteSubmission 归属校验", () => {
  it("workId 不匹配:行仍在", async () => {
    const w1 = makeWork(ctx.db, { title: "W1" });
    const w2 = makeWork(ctx.db, { title: "W2" });
    const s = makeSubmission(ctx.db, w1.id, { round: 1 });
    const res = await deleteSubmission(w2.id, s.id);
    expect(res.ok).toBe(true);
    expect(
      ctx.db.select().from(submissions).where(eq(submissions.id, s.id)).all(),
    ).toHaveLength(1);
  });

  it("workId 匹配:正常删除", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    const s = makeSubmission(ctx.db, w.id, { round: 1 });
    expect((await deleteSubmission(w.id, s.id)).ok).toBe(true);
    expect(
      ctx.db.select().from(submissions).where(eq(submissions.id, s.id)).all(),
    ).toHaveLength(0);
  });
});

// P2-9 方案A:录用且作品尚未「已发表」时,action 返回 suggestPublish=true 供 client 弹联动提示。
describe("suggestPublish 录用联动提示(P2-9)", () => {
  it("createSubmission 录用 + 作品未发表 → true", async () => {
    const w = makeWork(ctx.db, { title: "W", status: "投稿中" });
    const res = await createSubmission(w.id, { ...valid, status: "录用" });
    expect(res.ok).toBe(true);
    expect(res.suggestPublish).toBe(true);
  });

  it("作品已是「已发表」→ 不提示", async () => {
    const w = makeWork(ctx.db, { title: "W", status: "已发表" });
    const res = await createSubmission(w.id, { ...valid, status: "录用" });
    expect(res.ok).toBe(true);
    expect(res.suggestPublish).toBeFalsy();
  });

  it("非录用状态 → 不提示", async () => {
    const w = makeWork(ctx.db, { title: "W", status: "投稿中" });
    const res = await createSubmission(w.id, { ...valid, status: "在审" });
    expect(res.suggestPublish).toBeFalsy();
  });

  it("updateSubmission 改为录用 → 提示", async () => {
    const w = makeWork(ctx.db, { title: "W", status: "投稿中" });
    const s = makeSubmission(ctx.db, w.id, { round: 1, status: "在审" });
    const res = await updateSubmission(w.id, s.id, {
      ...valid,
      status: "录用",
    });
    expect(res.ok).toBe(true);
    expect(res.suggestPublish).toBe(true);
  });

  it("updateSubmission 归属不匹配(0 行变更)→ 不提示", async () => {
    const w1 = makeWork(ctx.db, { title: "W1", status: "投稿中" });
    const w2 = makeWork(ctx.db, { title: "W2", status: "投稿中" });
    const s = makeSubmission(ctx.db, w1.id, { round: 1, status: "在审" });
    const res = await updateSubmission(w2.id, s.id, {
      ...valid,
      status: "录用",
    });
    expect(res.ok).toBe(true);
    expect(res.suggestPublish).toBeFalsy();
  });
});
