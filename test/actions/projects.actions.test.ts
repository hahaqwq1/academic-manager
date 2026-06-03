// 项目 Server Action 集成测试 —— P2-7
//
// create/update/delete 同作品模式;另含成果挂接 link(onConflictDoNothing 幂等)/ unlink。
import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  linkOutput,
  makeProject,
  makeTag,
  makeWork,
  tagEntity,
} from "../helpers/factories";
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
const revalidateMock = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));

import { entity_tags, project_outputs, projects } from "@/db/schema";
import {
  createProject,
  deleteProject,
  linkProjectOutput,
  unlinkProjectOutput,
  updateProject,
} from "@/lib/actions/projects";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
  redirectMock.mockClear();
  revalidateMock.mockClear();
});
afterEach(() => ctx.sqlite.close());

const valid = {
  title: "新项目",
  level: "省部级",
  role: "主持",
  status: "已立项",
};

describe("createProject", () => {
  it("成功:写入项目 + 标签,redirect 到详情页", async () => {
    const tag = makeTag(ctx.db, "T");
    await expect(createProject({ ...valid, tagIds: [tag.id] })).rejects.toThrow(
      "NEXT_REDIRECT:/projects/1",
    );
    const rows = ctx.db.select().from(projects).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe("新项目");
    expect(
      ctx.db
        .select()
        .from(entity_tags)
        .where(
          and(
            eq(entity_tags.entity_type, "project"),
            eq(entity_tags.entity_id, rows[0]!.id),
          ),
        )
        .all(),
    ).toHaveLength(1);
  });

  it("校验失败返回错误,不落库", async () => {
    const res = await createProject({ ...valid, level: "宇宙级" });
    expect(res.ok).toBe(false);
    expect(ctx.db.select().from(projects).all()).toHaveLength(0);
  });

  it("重复 tagIds 去重:只建一条关联,不触发唯一索引报错", async () => {
    const tag = makeTag(ctx.db, "T");
    await expect(
      createProject({ ...valid, tagIds: [tag.id, tag.id, tag.id] }),
    ).rejects.toThrow("NEXT_REDIRECT:/projects/1");
    expect(
      ctx.db
        .select()
        .from(entity_tags)
        .where(
          and(
            eq(entity_tags.entity_type, "project"),
            eq(entity_tags.entity_id, 1),
          ),
        )
        .all(),
    ).toHaveLength(1);
  });
});

describe("updateProject", () => {
  it("先删后插同步标签", async () => {
    const p = makeProject(ctx.db, { title: "原" });
    const a = makeTag(ctx.db, "A");
    const b = makeTag(ctx.db, "B");
    tagEntity(ctx.db, "project", p.id, a.id);
    await expect(
      updateProject(p.id, { ...valid, title: "改", tagIds: [b.id] }),
    ).rejects.toThrow(`NEXT_REDIRECT:/projects/${p.id}`);
    const row = ctx.db
      .select()
      .from(projects)
      .where(eq(projects.id, p.id))
      .all()[0]!;
    expect(row.title).toBe("改");
    const links = ctx.db
      .select()
      .from(entity_tags)
      .where(
        and(
          eq(entity_tags.entity_type, "project"),
          eq(entity_tags.entity_id, p.id),
        ),
      )
      .all();
    expect(links.map((l) => l.tag_id)).toEqual([b.id]);
  });

  it("目标项目不存在(0 行变更)→ ok:false,且不写入孤儿标签", async () => {
    const tag = makeTag(ctx.db, "T");
    const res = await updateProject(9999, { ...valid, tagIds: [tag.id] });
    expect(res.ok).toBe(false);
    expect(res.message).toBe("项目不存在或已被删除");
    expect(
      ctx.db
        .select()
        .from(entity_tags)
        .where(
          and(
            eq(entity_tags.entity_type, "project"),
            eq(entity_tags.entity_id, 9999),
          ),
        )
        .all(),
    ).toHaveLength(0);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("重复 tagIds 去重:只建一条关联", async () => {
    const p = makeProject(ctx.db, { title: "P" });
    const a = makeTag(ctx.db, "A");
    await expect(
      updateProject(p.id, { ...valid, title: "改", tagIds: [a.id, a.id] }),
    ).rejects.toThrow(`NEXT_REDIRECT:/projects/${p.id}`);
    const links = ctx.db
      .select()
      .from(entity_tags)
      .where(
        and(
          eq(entity_tags.entity_type, "project"),
          eq(entity_tags.entity_id, p.id),
        ),
      )
      .all();
    expect(links.map((l) => l.tag_id)).toEqual([a.id]);
  });
});

describe("deleteProject", () => {
  it("删项目:手动删标签 + 级联删成果挂接", async () => {
    const p = makeProject(ctx.db, { title: "待删" });
    const w = makeWork(ctx.db, { title: "W" });
    const tag = makeTag(ctx.db, "T");
    tagEntity(ctx.db, "project", p.id, tag.id);
    linkOutput(ctx.db, p.id, w.id);
    const res = await deleteProject(p.id);
    expect(res.ok).toBe(true);
    expect(
      ctx.db.select().from(projects).where(eq(projects.id, p.id)).all(),
    ).toHaveLength(0);
    expect(
      ctx.db
        .select()
        .from(project_outputs)
        .where(eq(project_outputs.project_id, p.id))
        .all(),
    ).toHaveLength(0);
  });
});

describe("linkProjectOutput / unlinkProjectOutput", () => {
  it("挂接幂等(重复挂接静默忽略),取消挂接移除关联", async () => {
    const p = makeProject(ctx.db, { title: "P" });
    const w = makeWork(ctx.db, { title: "W" });
    expect((await linkProjectOutput(p.id, w.id)).ok).toBe(true);
    expect((await linkProjectOutput(p.id, w.id)).ok).toBe(true); // 重复:onConflictDoNothing
    expect(
      ctx.db
        .select()
        .from(project_outputs)
        .where(eq(project_outputs.project_id, p.id))
        .all(),
    ).toHaveLength(1);

    expect((await unlinkProjectOutput(p.id, w.id)).ok).toBe(true);
    expect(
      ctx.db
        .select()
        .from(project_outputs)
        .where(eq(project_outputs.project_id, p.id))
        .all(),
    ).toHaveLength(0);
  });
});
