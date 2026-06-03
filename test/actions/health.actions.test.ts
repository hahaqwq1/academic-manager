// 数据体检修订动作测试 —— 升级线(体验层)
//
// cleanupOrphanEntityTags:删除孤儿 entity_tags(entity_id 指向不存在的作品/项目),保留有效关联。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { createTestContext, type TestDb } from "../helpers/test-db";
import {
  makeWork,
  makeProject,
  makeTag,
  tagEntity,
} from "../helpers/factories";

const holder = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/db", () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { cleanupOrphanEntityTags } from "@/lib/actions/health";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
});
afterEach(() => {
  ctx.sqlite.close();
});

function entityTagCount(): number {
  return (
    ctx.sqlite.prepare("select count(*) c from entity_tags").get() as {
      c: number;
    }
  ).c;
}

describe("cleanupOrphanEntityTags", () => {
  it("删除孤儿、保留有效关联,返回删除数", async () => {
    const tag = makeTag(ctx.db, "T");
    const w = makeWork(ctx.db, {});
    const p = makeProject(ctx.db, {});
    tagEntity(ctx.db, "work", w.id, tag.id); // 有效
    tagEntity(ctx.db, "project", p.id, tag.id); // 有效
    tagEntity(ctx.db, "work", 9001, tag.id); // 孤儿
    tagEntity(ctx.db, "project", 9002, tag.id); // 孤儿
    expect(entityTagCount()).toBe(4);

    const res = await cleanupOrphanEntityTags();
    expect(res).toMatchObject({ ok: true, deleted: 2 });
    expect(entityTagCount()).toBe(2); // 仅剩两条有效关联
  });

  it("无孤儿时 deleted 0、不误删", async () => {
    const tag = makeTag(ctx.db, "T");
    const w = makeWork(ctx.db, {});
    tagEntity(ctx.db, "work", w.id, tag.id);

    const res = await cleanupOrphanEntityTags();
    expect(res).toMatchObject({ ok: true, deleted: 0 });
    expect(entityTagCount()).toBe(1);
  });
});
