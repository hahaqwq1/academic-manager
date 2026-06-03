// 端到端往返集成测试 —— P2-7
//
// 用真实 action + 真实 query 串起一条业务闭环:
//   建标签 → 建作品(挂标签)→ 按标签筛选命中 → 改作品(换标签)→ 删作品(级联删投稿)。
// 全程真实 SQL,验证 action 写入与 query 读取在同一库上自洽。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { eq } from "drizzle-orm";

import { createTestContext, type TestDb } from "../helpers/test-db";

const holder = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/db", () => ({
  get db() {
    return holder.db;
  },
}));
const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
);
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createTag } from "@/lib/actions/tags";
import { createWork, updateWork, deleteWork } from "@/lib/actions/works";
import { createSubmission } from "@/lib/actions/submissions";
import { listWorks } from "@/db/queries/works";
import { submissions } from "@/db/schema";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
  redirectMock.mockClear();
});
afterEach(() => ctx.sqlite.close());

// 从 redirect 哨兵里抠出新建实体的 id。
function redirectedId(err: unknown): number {
  const m = /NEXT_REDIRECT:\/works\/(\d+)/.exec((err as Error).message);
  if (!m) throw new Error(`未捕获到 works redirect:${(err as Error).message}`);
  return Number(m[1]);
}

describe("作品全生命周期闭环", () => {
  it("建标签 → 建作品挂标签 → 按标签筛选 → 改作品换标签 → 删作品级联删投稿", async () => {
    // 1) 两个标签。
    expect((await createTag("AI")).ok).toBe(true);
    expect((await createTag("治理")).ok).toBe(true);
    // 新建库自增,标签 id = 1,2。
    const AI = 1;
    const ZHILI = 2;

    // 2) 建作品并挂上 AI 标签。
    let workId = -1;
    try {
      await createWork({
        type: "paper",
        title: "论 AI 治理",
        status: "已完成",
        tagIds: [AI],
      });
    } catch (err) {
      workId = redirectedId(err);
    }
    expect(workId).toBeGreaterThan(0);

    // 3) 按 AI 标签筛选应命中;按治理标签不命中。
    expect((await listWorks({ tagId: AI })).items.map((w) => w.id)).toEqual([
      workId,
    ]);
    expect((await listWorks({ tagId: ZHILI })).total).toBe(0);

    // 给作品加一条投稿,稍后验证级联删除。
    expect(
      (
        await createSubmission(workId, {
          journal: "刊",
          round: 1,
          status: "在审",
          submitted_at: "2025-01-01",
        })
      ).ok,
    ).toBe(true);

    // 4) 改作品:标签从 AI 换成 治理。
    try {
      await updateWork(workId, {
        type: "paper",
        title: "论 AI 治理(修订)",
        status: "投稿中",
        tagIds: [ZHILI],
      });
    } catch {
      /* redirect 哨兵,忽略 */
    }
    expect((await listWorks({ tagId: AI })).total).toBe(0); // 不再挂 AI
    expect((await listWorks({ tagId: ZHILI })).items.map((w) => w.id)).toEqual([
      workId,
    ]);

    // 5) 删作品:投稿经外键级联一并删除。
    expect((await deleteWork(workId)).ok).toBe(true);
    expect((await listWorks()).total).toBe(0);
    expect(
      ctx.db
        .select()
        .from(submissions)
        .where(eq(submissions.work_id, workId))
        .all(),
    ).toHaveLength(0);
  });
});
