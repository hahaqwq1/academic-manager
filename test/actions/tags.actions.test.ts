// 标签 Server Action 集成测试 —— P2-7
//
// createTag/renameTag/deleteTag:空名/超长拦截、唯一冲突友好提示(isUniqueViolation)、
// 删除经外键 onDelete:cascade 自动清理 entity_tags。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { eq } from "drizzle-orm";

import { createTestContext, type TestDb } from "../helpers/test-db";
import { makeWork, makeTag, tagEntity } from "../helpers/factories";

const holder = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/db", () => ({
  get db() {
    return holder.db;
  },
}));
const revalidateMock = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));

import { createTag, renameTag, deleteTag } from "@/lib/actions/tags";
import { tags, entity_tags } from "@/db/schema";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
  revalidateMock.mockClear();
});
afterEach(() => ctx.sqlite.close());

describe("createTag", () => {
  it("空名被拒", async () => {
    expect(await createTag("   ")).toMatchObject({
      ok: false,
      message: "请输入标签名称",
    });
    expect(ctx.db.select().from(tags).all()).toHaveLength(0);
  });

  it("超长(>50)被拒,恰好 50 通过", async () => {
    expect((await createTag("名".repeat(51))).ok).toBe(false);
    expect((await createTag("名".repeat(50))).ok).toBe(true);
  });

  it("成功创建(名称 trim)", async () => {
    expect((await createTag("  新质生产力  ")).ok).toBe(true);
    const rows = ctx.db.select().from(tags).all();
    expect(rows.map((t) => t.name)).toEqual(["新质生产力"]);
  });

  it("重名冲突返回友好提示", async () => {
    await createTag("数字治理");
    const dup = await createTag("数字治理");
    expect(dup).toMatchObject({ ok: false, message: "标签「数字治理」已存在" });
    expect(ctx.db.select().from(tags).all()).toHaveLength(1);
  });
});

describe("renameTag", () => {
  it("改名成功", async () => {
    const t = makeTag(ctx.db, "旧名");
    expect((await renameTag(t.id, "新名")).ok).toBe(true);
    const row = ctx.db.select().from(tags).where(eq(tags.id, t.id)).all()[0]!;
    expect(row.name).toBe("新名");
  });

  it("改成已存在的名 → 唯一冲突", async () => {
    const a = makeTag(ctx.db, "A");
    makeTag(ctx.db, "B");
    const res = await renameTag(a.id, "B");
    expect(res).toMatchObject({ ok: false, message: "标签「B」已存在" });
  });
});

describe("deleteTag", () => {
  it("删除标签并级联清理其关联", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    const t = makeTag(ctx.db, "T");
    tagEntity(ctx.db, "work", w.id, t.id);
    expect((await deleteTag(t.id)).ok).toBe(true);
    expect(
      ctx.db.select().from(tags).where(eq(tags.id, t.id)).all(),
    ).toHaveLength(0);
    // entity_tags.tag_id 外键 onDelete:cascade。
    expect(
      ctx.db
        .select()
        .from(entity_tags)
        .where(eq(entity_tags.tag_id, t.id))
        .all(),
    ).toHaveLength(0);
  });
});
