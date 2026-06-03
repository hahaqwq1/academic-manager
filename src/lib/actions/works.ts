"use server";

// 作品 Server Actions —— Phase 2
//
// create / update / delete 三个动作。client 组件可直接 import 并以纯对象调用。
// 约定:
// - 校验失败返回 { ok:false, errors, message },client 据此在字段下显示行内错误。
// - 成功路径末尾(try/catch 之外)调用 redirect;redirect 会抛控制流异常,
//   故绝不能放在 try 块里被吞掉。
// - entity_tags 是多态表(entity_id 无外键),删除作品时必须手动先删其标签关联。
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { entity_tags, works } from "@/db/schema";
import { workInputSchema } from "@/lib/validations";

// 动作返回状态:供 client 表单读取。
export type WorkActionState = {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
};

// 把 zod 的 issues 扁平化为「字段名 → 首条消息」的 map。
function toFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (key === undefined) continue;
    const name = String(key);
    // 仅保留每个字段的首条错误。
    if (!(name in errors)) {
      errors[name] = issue.message;
    }
  }
  return errors;
}

// 新建作品:校验 → 事务内插入 works 取回 id,并批量写入 entity_tags → 跳转详情页。
export async function createWork(input: unknown): Promise<WorkActionState> {
  const parsed = workInputSchema.safeParse(input);
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
        .insert(works)
        .values({
          type: data.type,
          title: data.title,
          status: data.status,
          authors: data.authors,
          author_role: data.author_role,
          word_count: data.word_count,
          summary: data.summary,
          notes: data.notes,
          file_path: data.file_path,
          published_at: data.published_at,
          doi: data.doi,
          journal: data.journal,
        })
        .returning({ id: works.id })
        .all();
      if (!row) throw new Error("作品插入后未返回行");

      if (uniqueTagIds.length > 0) {
        tx.insert(entity_tags)
          .values(
            uniqueTagIds.map((tagId) => ({
              entity_type: "work" as const,
              entity_id: row.id,
              tag_id: tagId,
            })),
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

  revalidatePath("/works");
  // 成功路径末尾、try/catch 之外调用 redirect。
  redirect(`/works/${newId}`);
}

// 编辑作品:校验 → 更新 works → 同步标签(先删后插)→ 跳转详情页。
export async function updateWork(
  id: number,
  input: unknown,
): Promise<WorkActionState> {
  const parsed = workInputSchema.safeParse(input);
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
        .update(works)
        .set({
          type: data.type,
          title: data.title,
          status: data.status,
          authors: data.authors,
          author_role: data.author_role,
          word_count: data.word_count,
          summary: data.summary,
          notes: data.notes,
          file_path: data.file_path,
          published_at: data.published_at,
          doi: data.doi,
          journal: data.journal,
        })
        .where(eq(works.id, id))
        .run();
      // 0 行变更:作品已被删除/不存在 —— 抛错回滚,避免写入指向不存在作品的孤儿标签
      //(与 markWorkPublished / updateSubmission 同款 changes 校验)。
      if (info.changes === 0) {
        throw new Error("作品不存在或已被删除");
      }

      // 同步标签:先删除该作品的全部标签关联,再插入当前选中项。
      tx.delete(entity_tags)
        .where(
          and(
            eq(entity_tags.entity_type, "work"),
            eq(entity_tags.entity_id, id),
          ),
        )
        .run();

      if (uniqueTagIds.length > 0) {
        tx.insert(entity_tags)
          .values(
            uniqueTagIds.map((tagId) => ({
              entity_type: "work" as const,
              entity_id: id,
              tag_id: tagId,
            })),
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

  revalidatePath("/works");
  revalidatePath(`/works/${id}`);
  // 成功路径末尾、try/catch 之外调用 redirect。
  redirect(`/works/${id}`);
}

// 删除作品:事务内先删多态标签关联,再删 works 本体。
// submissions / project_outputs 由外键级联自动删除。不在此处 redirect,导航由调用方决定。
export async function deleteWork(
  id: number,
): Promise<{ ok: boolean; message?: string }> {
  try {
    db.transaction((tx) => {
      // entity_tags 是多态表(entity_id 无外键),必须手动删除。
      tx.delete(entity_tags)
        .where(
          and(
            eq(entity_tags.entity_type, "work"),
            eq(entity_tags.entity_id, id),
          ),
        )
        .run();

      tx.delete(works).where(eq(works.id, id)).run();
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "删除失败,请重试",
    };
  }

  revalidatePath("/works");
  return { ok: true };
}

// 把作品标记为「已发表」—— P2-9 方案A:投稿录用后,由 client 提示用户一键联动作品状态。
// 刻意只改 status,不动 published_at:录用日期 ≠ 发表日期,年度发表数依赖真实发表日期,
// 故发表日期仍由用户在编辑页按实际填写,避免静默写入错误日期污染看板统计。
export async function markWorkPublished(
  id: number,
): Promise<{ ok: boolean; message?: string }> {
  let changed = false;
  try {
    const info = db
      .update(works)
      .set({ status: "已发表" })
      .where(eq(works.id, id))
      .run();
    changed = info.changes > 0;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "操作失败,请重试",
    };
  }

  // 0 行变更:作品已在别处被删,不报「成功」以免误导(与 updateSubmission 一致)。
  if (!changed) {
    return { ok: false, message: "作品不存在或已被删除" };
  }

  revalidatePath("/works");
  revalidatePath(`/works/${id}`);
  revalidatePath("/");
  return { ok: true };
}
