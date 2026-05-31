// 导入 / 恢复 Server Action 测试 —— P2-8
//
// importDatabase:整库 JSON 回灌。重点:
// - 往返:导出 → 污染 → 导入 → 数据复原(覆盖语义),且原 id / 时间戳保留。
// - 兼容下载包装 { data:{...} } 与裸 dump。
// - 结构/日历日期非法 → 校验阶段拒绝,库不动。
// - 外键孤儿 → 插入失败,整事务回滚,库保持导入前(证明「先删后插」失败不丢数据)。
// - 空 dump → 合法地清空全库。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { eq } from "drizzle-orm";

import { createTestContext, type TestDb } from "../helpers/test-db";
import {
  makeWork,
  makeProject,
  makeSubmission,
  makeTag,
  tagEntity,
  linkOutput,
} from "../helpers/factories";

const holder = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/db", () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { importDatabase } from "@/lib/actions/export";
import { getDatabaseDump, type DatabaseDump } from "@/db/queries/export";
import { works, submissions, tags } from "@/db/schema";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
});
afterEach(() => ctx.sqlite.close());

// 播一份覆盖六表的最小数据。
function seedFull(db: TestDb) {
  const w1 = makeWork(db, { title: "W1", published_at: "2025-01-01" });
  const w2 = makeWork(db, { title: "W2" });
  const p1 = makeProject(db, { title: "P1" });
  const t1 = makeTag(db, "标签1");
  makeSubmission(db, w1.id, { round: 1 });
  tagEntity(db, "work", w1.id, t1.id);
  linkOutput(db, p1.id, w1.id);
  return { w1, w2, p1, t1 };
}

describe("importDatabase 往返恢复", () => {
  it("导入覆盖现有数据,保留原 id 与时间戳", async () => {
    const { w1 } = seedFull(ctx.db);
    const dump = await getDatabaseDump();
    const [origW1] = ctx.db.select().from(works).where(eq(works.id, w1.id)).all();

    // 污染当前库:多加一条作品。
    makeWork(ctx.db, { title: "W3-多余" });
    expect(ctx.db.select().from(works).all()).toHaveLength(3);

    // 导入旧 dump(下载包装格式)。
    const res = await importDatabase({
      app: "academic-manager",
      exportedAt: "2025-05-31T00:00:00.000Z",
      data: dump,
    });
    expect(res.ok).toBe(true);
    expect(res.counts).toMatchObject({ works: 2, projects: 1, submissions: 1, tags: 1 });

    // W3 被覆盖移除,只剩 dump 里的两条。
    const after = ctx.db.select().from(works).all();
    expect(after).toHaveLength(2);
    expect(after.map((w) => w.title).sort()).toEqual(["W1", "W2"]);

    // id / created_at / published_at 原样保留。
    const [restored] = ctx.db.select().from(works).where(eq(works.id, w1.id)).all();
    expect(restored.created_at).toBe(origW1.created_at);
    expect(restored.published_at).toBe("2025-01-01");
  });

  it("接受裸 dump(无 data 包装)", async () => {
    seedFull(ctx.db);
    const dump = await getDatabaseDump();
    makeWork(ctx.db, { title: "多余" });
    const res = await importDatabase(dump);
    expect(res.ok).toBe(true);
    expect(ctx.db.select().from(works).all()).toHaveLength(2);
  });
});

describe("importDatabase 校验拒绝(库不变)", () => {
  it("缺少表键 → 拒绝", async () => {
    seedFull(ctx.db);
    const dump = await getDatabaseDump();
    const broken: Partial<DatabaseDump> = { ...dump };
    delete broken.tags;
    const res = await importDatabase({ data: broken });
    expect(res.ok).toBe(false);
    expect(res.message).toContain("tags");
    expect(ctx.db.select().from(works).all()).toHaveLength(2);
  });

  it("非法日历日(2024-02-30)→ 拒绝", async () => {
    seedFull(ctx.db);
    const dump = await getDatabaseDump();
    (dump.works[0] as { published_at: string }).published_at = "2024-02-30";
    const res = await importDatabase({ data: dump });
    expect(res.ok).toBe(false);
    expect(ctx.db.select().from(works).all()).toHaveLength(2);
  });

  it("枚举非法 → 拒绝", async () => {
    seedFull(ctx.db);
    const dump = await getDatabaseDump();
    (dump.works[0] as { type: string }).type = "不存在的类型";
    const res = await importDatabase({ data: dump });
    expect(res.ok).toBe(false);
    expect(ctx.db.select().from(works).all()).toHaveLength(2);
  });
});

describe("importDatabase 引用完整性预检(清库前拦截)", () => {
  it("外键孤儿投稿 → 预检拒绝,库原封不动(不依赖事务回滚)", async () => {
    seedFull(ctx.db);
    const dump = await getDatabaseDump();
    // 结构/日期合法、能过 zod,但 work_id=999 无对应作品。
    dump.submissions.push({
      id: 999,
      work_id: 999,
      journal: "孤儿刊",
      round: 1,
      status: "在审",
      submitted_at: "2025-01-01",
      decided_at: null,
      review_notes: null,
    });
    const res = await importDatabase({ data: dump });
    expect(res.ok).toBe(false);
    expect(res.message).toContain("无对应作品");
    // 预检在「清库」之前完成,原数据完好。
    expect(ctx.db.select().from(works).all()).toHaveLength(2);
    expect(ctx.db.select().from(submissions).all()).toHaveLength(1);
  });

  it("多态 entity_id 孤儿(SQLite 无外键守护)→ 预检拒绝,不被静默写入", async () => {
    seedFull(ctx.db);
    const dump = await getDatabaseDump();
    const tagId = (dump.tags[0] as { id: number }).id;
    dump.entity_tags.push({
      id: 999,
      entity_type: "work",
      entity_id: 999,
      tag_id: tagId,
    });
    const res = await importDatabase({ data: dump });
    expect(res.ok).toBe(false);
    expect(res.message).toContain("无对应实体");
    expect(ctx.db.select().from(works).all()).toHaveLength(2);
  });
});

describe("importDatabase 加固校验(对抗审查)", () => {
  it("非法时间戳(空 created_at)→ 拒绝,库不变", async () => {
    seedFull(ctx.db);
    const dump = await getDatabaseDump();
    (dump.works[0] as { created_at: string }).created_at = "";
    const res = await importDatabase({ data: dump });
    expect(res.ok).toBe(false);
    expect(ctx.db.select().from(works).all()).toHaveLength(2);
  });

  it("id ≤ 0 → 拒绝", async () => {
    seedFull(ctx.db);
    const dump = await getDatabaseDump();
    (dump.works[0] as { id: number }).id = 0;
    const res = await importDatabase({ data: dump });
    expect(res.ok).toBe(false);
  });

  it("表内重复主键(works.id)→ 拒绝,库不变", async () => {
    seedFull(ctx.db);
    const dump = await getDatabaseDump();
    (dump.works[1] as { id: number }).id = (dump.works[0] as { id: number }).id;
    const res = await importDatabase({ data: dump });
    expect(res.ok).toBe(false);
    expect(res.message).toContain("重复");
    expect(ctx.db.select().from(works).all()).toHaveLength(2);
  });

  it("重复标签名(tags.name)→ 拒绝", async () => {
    seedFull(ctx.db);
    const dump = await getDatabaseDump();
    const name = (dump.tags[0] as { name: string }).name;
    dump.tags.push({ id: 999, name });
    const res = await importDatabase({ data: dump });
    expect(res.ok).toBe(false);
    expect(res.message).toContain("重复");
  });
});

describe("importDatabase 空库", () => {
  it("空 dump → 清空全库", async () => {
    seedFull(ctx.db);
    const empty: DatabaseDump = {
      works: [],
      projects: [],
      submissions: [],
      tags: [],
      entity_tags: [],
      project_outputs: [],
    };
    const res = await importDatabase({ data: empty });
    expect(res.ok).toBe(true);
    expect(res.counts).toMatchObject({ works: 0, tags: 0 });
    expect(ctx.db.select().from(works).all()).toHaveLength(0);
    expect(ctx.db.select().from(tags).all()).toHaveLength(0);
  });
});
