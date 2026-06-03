// 作品 Server Action 集成测试 —— P2-7
//
// 成功路径在 try/catch 之外 redirect():mock 成抛 `NEXT_REDIRECT:<url>` 哨兵,用 rejects 断言;
// 失败/校验路径正常返回对象。同时校验事务副作用(works 行、entity_tags 同步、级联删除)。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { eq, and } from "drizzle-orm";

import { createTestContext, type TestDb } from "../helpers/test-db";
import {
  makeWork,
  makeTag,
  makeSubmission,
  tagEntity,
} from "../helpers/factories";

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
const revalidateMock = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));

import {
  createWork,
  updateWork,
  deleteWork,
  markWorkPublished,
} from "@/lib/actions/works";
import { works, entity_tags, submissions } from "@/db/schema";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
  redirectMock.mockClear();
  revalidateMock.mockClear();
});
afterEach(() => ctx.sqlite.close());

const valid = {
  type: "paper",
  title: "新作品",
  status: "已完成",
  authors: "示例作者",
};

describe("createWork", () => {
  it("成功:写入作品 + 标签关联,revalidate 后 redirect 到详情页", async () => {
    const tag = makeTag(ctx.db, "T");
    await expect(createWork({ ...valid, tagIds: [tag.id] })).rejects.toThrow(
      "NEXT_REDIRECT:/works/1",
    );

    const rows = ctx.db.select().from(works).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe("新作品");
    const links = ctx.db
      .select()
      .from(entity_tags)
      .where(
        and(
          eq(entity_tags.entity_type, "work"),
          eq(entity_tags.entity_id, rows[0]!.id),
        ),
      )
      .all();
    expect(links.map((l) => l.tag_id)).toEqual([tag.id]);
    expect(revalidateMock).toHaveBeenCalledWith("/works");
  });

  it("校验失败:返回错误对象,不落库、不 redirect", async () => {
    const res = await createWork({ ...valid, title: "   " });
    expect(res.ok).toBe(false);
    expect(res.errors?.title).toBe("请输入标题");
    expect(ctx.db.select().from(works).all()).toHaveLength(0);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("重复 tagIds 去重:只建一条关联,不触发唯一索引报错", async () => {
    const tag = makeTag(ctx.db, "T");
    await expect(
      createWork({ ...valid, tagIds: [tag.id, tag.id, tag.id] }),
    ).rejects.toThrow("NEXT_REDIRECT:/works/1");
    const links = ctx.db
      .select()
      .from(entity_tags)
      .where(
        and(eq(entity_tags.entity_type, "work"), eq(entity_tags.entity_id, 1)),
      )
      .all();
    expect(links.map((l) => l.tag_id)).toEqual([tag.id]);
  });
});

describe("updateWork", () => {
  it("更新字段并以「先删后插」同步标签", async () => {
    const w = makeWork(ctx.db, { title: "原标题", status: "写作中" });
    const a = makeTag(ctx.db, "A");
    const b = makeTag(ctx.db, "B");
    tagEntity(ctx.db, "work", w.id, a.id); // 原本挂 A

    await expect(
      updateWork(w.id, { ...valid, title: "改后标题", tagIds: [b.id] }),
    ).rejects.toThrow(`NEXT_REDIRECT:/works/${w.id}`);

    const row = ctx.db.select().from(works).where(eq(works.id, w.id)).all()[0]!;
    expect(row.title).toBe("改后标题");
    const links = ctx.db
      .select()
      .from(entity_tags)
      .where(
        and(
          eq(entity_tags.entity_type, "work"),
          eq(entity_tags.entity_id, w.id),
        ),
      )
      .all();
    // A 被删、B 被插。
    expect(links.map((l) => l.tag_id)).toEqual([b.id]);
  });

  it("目标作品不存在(0 行变更)→ ok:false,且不写入孤儿标签", async () => {
    const tag = makeTag(ctx.db, "T");
    const res = await updateWork(9999, { ...valid, tagIds: [tag.id] });
    expect(res.ok).toBe(false);
    expect(res.message).toBe("作品不存在或已被删除");
    // 孤儿防线:不存在的 work id 不应留下任何 entity_tags 行。
    expect(
      ctx.db
        .select()
        .from(entity_tags)
        .where(
          and(
            eq(entity_tags.entity_type, "work"),
            eq(entity_tags.entity_id, 9999),
          ),
        )
        .all(),
    ).toHaveLength(0);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("重复 tagIds 去重:只建一条关联", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    const a = makeTag(ctx.db, "A");
    await expect(
      updateWork(w.id, { ...valid, title: "改", tagIds: [a.id, a.id] }),
    ).rejects.toThrow(`NEXT_REDIRECT:/works/${w.id}`);
    const links = ctx.db
      .select()
      .from(entity_tags)
      .where(
        and(
          eq(entity_tags.entity_type, "work"),
          eq(entity_tags.entity_id, w.id),
        ),
      )
      .all();
    expect(links.map((l) => l.tag_id)).toEqual([a.id]);
  });
});

describe("deleteWork", () => {
  it("删作品:手动删标签关联 + 级联删投稿,返回 ok", async () => {
    const w = makeWork(ctx.db, { title: "待删" });
    const tag = makeTag(ctx.db, "T");
    tagEntity(ctx.db, "work", w.id, tag.id);
    makeSubmission(ctx.db, w.id, { round: 1 });

    const res = await deleteWork(w.id);
    expect(res.ok).toBe(true);
    expect(
      ctx.db.select().from(works).where(eq(works.id, w.id)).all(),
    ).toHaveLength(0);
    expect(
      ctx.db
        .select()
        .from(entity_tags)
        .where(
          and(
            eq(entity_tags.entity_type, "work"),
            eq(entity_tags.entity_id, w.id),
          ),
        )
        .all(),
    ).toHaveLength(0);
    // 外键 onDelete:cascade 自动删投稿(证明测试库 foreign_keys=ON)。
    expect(
      ctx.db
        .select()
        .from(submissions)
        .where(eq(submissions.work_id, w.id))
        .all(),
    ).toHaveLength(0);
    expect(revalidateMock).toHaveBeenCalledWith("/works");
  });
});

describe("markWorkPublished(P2-9 联动)", () => {
  it("把作品状态改为已发表 + revalidate;刻意不动 published_at", async () => {
    const w = makeWork(ctx.db, {
      title: "W",
      status: "投稿中",
      published_at: null,
    });
    const res = await markWorkPublished(w.id);
    expect(res.ok).toBe(true);
    const row = ctx.db.select().from(works).where(eq(works.id, w.id)).all()[0]!;
    expect(row.status).toBe("已发表");
    expect(row.published_at).toBeNull(); // 录用日期 ≠ 发表日期,不联动
    expect(revalidateMock).toHaveBeenCalledWith("/works");
    expect(revalidateMock).toHaveBeenCalledWith(`/works/${w.id}`);
    expect(revalidateMock).toHaveBeenCalledWith("/");
  });

  it("作品不存在(0 行变更)→ ok:false,不误报成功", async () => {
    const res = await markWorkPublished(9999);
    expect(res.ok).toBe(false);
    expect(res.message).toBeTruthy();
  });
});
