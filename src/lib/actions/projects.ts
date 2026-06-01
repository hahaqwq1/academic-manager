"use server";

// 项目 Server Actions —— Phase 3
//
// create / update / delete 三个动作 + 成果挂接 link / unlink。
// 约定与作品一致:
// - 校验失败返回 { ok:false, errors, message },client 据此在字段下显示行内错误。
// - 成功路径末尾(try/catch 之外)调用 redirect;redirect 会抛控制流异常,不能放进 try。
// - entity_tags 是多态表(entity_id 无外键),删除项目时必须手动先删其标签关联;
//   project_outputs 由外键级联自动删除。
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { projects, entity_tags, project_outputs } from "@/db/schema";
import { projectInputSchema } from "@/lib/validations";

// 动作返回状态:供 client 表单读取。
export type ProjectActionState = {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
};

// 把 zod 的 issues 扁平化为「字段名 → 首条消息」的 map。
function toFieldErrors(
  issues: { path: PropertyKey[]; message: string }[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (key === undefined) continue;
    const name = String(key);
    if (!(name in errors)) {
      errors[name] = issue.message;
    }
  }
  return errors;
}

// 新建项目:校验 → 事务内插入 projects 取回 id,并批量写入 entity_tags → 跳转详情页。
export async function createProject(
  input: unknown
): Promise<ProjectActionState> {
  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: toFieldErrors(parsed.error.issues),
      message: "请检查表单",
    };
  }

  const { tagIds, ...data } = parsed.data;
  // 去重 tagIds:重复选择不应触发 entity_tags 唯一索引报错而让整笔保存失败。
  const uniqueTagIds = [...new Set(tagIds)];

  let newId: number;
  try {
    newId = db.transaction((tx) => {
      const [row] = tx
        .insert(projects)
        .values({
          title: data.title,
          level: data.level,
          role: data.role,
          status: data.status,
          grant_no: data.grant_no,
          funding: data.funding,
          start_date: data.start_date,
          end_date: data.end_date,
          notes: data.notes,
        })
        .returning({ id: projects.id })
        .all();

      if (uniqueTagIds.length > 0) {
        tx.insert(entity_tags)
          .values(
            uniqueTagIds.map((tagId) => ({
              entity_type: "project" as const,
              entity_id: row.id,
              tag_id: tagId,
            }))
          )
          .run();
      }

      return row.id;
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "保存失败,请重试",
    };
  }

  revalidatePath("/projects");
  redirect(`/projects/${newId}`);
}

// 编辑项目:校验 → 更新 projects → 同步标签(先删后插)→ 跳转详情页。
export async function updateProject(
  id: number,
  input: unknown
): Promise<ProjectActionState> {
  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: toFieldErrors(parsed.error.issues),
      message: "请检查表单",
    };
  }

  const { tagIds, ...data } = parsed.data;
  const uniqueTagIds = [...new Set(tagIds)];

  try {
    db.transaction((tx) => {
      const info = tx
        .update(projects)
        .set({
          title: data.title,
          level: data.level,
          role: data.role,
          status: data.status,
          grant_no: data.grant_no,
          funding: data.funding,
          start_date: data.start_date,
          end_date: data.end_date,
          notes: data.notes,
        })
        .where(eq(projects.id, id))
        .run();
      // 0 行变更:项目已被删除/不存在 —— 抛错回滚,避免写入指向不存在项目的孤儿标签
      //(与 markWorkPublished / updateSubmission 同款 changes 校验)。
      if (info.changes === 0) {
        throw new Error("项目不存在或已被删除");
      }

      tx.delete(entity_tags)
        .where(
          and(
            eq(entity_tags.entity_type, "project"),
            eq(entity_tags.entity_id, id)
          )
        )
        .run();

      if (uniqueTagIds.length > 0) {
        tx.insert(entity_tags)
          .values(
            uniqueTagIds.map((tagId) => ({
              entity_type: "project" as const,
              entity_id: id,
              tag_id: tagId,
            }))
          )
          .run();
      }
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "保存失败,请重试",
    };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

// 删除项目:事务内先删多态标签关联,再删 projects 本体。
// project_outputs 由外键级联自动删除。不在此处 redirect,导航由调用方决定。
export async function deleteProject(
  id: number
): Promise<{ ok: boolean; message?: string }> {
  try {
    db.transaction((tx) => {
      tx.delete(entity_tags)
        .where(
          and(
            eq(entity_tags.entity_type, "project"),
            eq(entity_tags.entity_id, id)
          )
        )
        .run();

      tx.delete(projects).where(eq(projects.id, id)).run();
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "删除失败,请重试",
    };
  }

  revalidatePath("/projects");
  return { ok: true };
}

// 挂接成果:把一篇作品关联到项目。唯一索引去重,重复挂接静默忽略。
export async function linkProjectOutput(
  projectId: number,
  workId: number
): Promise<{ ok: boolean; message?: string }> {
  try {
    db.insert(project_outputs)
      .values({ project_id: projectId, work_id: workId })
      .onConflictDoNothing()
      .run();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "挂接失败,请重试",
    };
  }
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// 取消挂接:移除项目与某作品的关联。
export async function unlinkProjectOutput(
  projectId: number,
  workId: number
): Promise<{ ok: boolean; message?: string }> {
  try {
    db.delete(project_outputs)
      .where(
        and(
          eq(project_outputs.project_id, projectId),
          eq(project_outputs.work_id, workId)
        )
      )
      .run();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "取消挂接失败,请重试",
    };
  }
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
