"use server";

// 标签 Server Actions —— Phase 4
//
// createTag / renameTag / deleteTag。名称唯一(schema 层 unique 约束),
// 命中唯一冲突时返回友好错误。删除标签时 entity_tags 经外键 onDelete:cascade 自动清理关联。
// 标签变化会影响表单芯片与筛选选项,故 revalidate 相关页面。
import { revalidatePath } from "next/cache";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { tags } from "@/db/schema";

export type TagActionState = { ok: boolean; message?: string };

// 标签增删改后,刷新依赖标签的页面(管理页 + 两类表单 + 两类列表筛选)。
function revalidateTagDependents() {
  revalidatePath("/tags");
  revalidatePath("/works");
  revalidatePath("/works/new");
  revalidatePath("/projects");
  revalidatePath("/projects/new");
}

// SQLite 唯一约束冲突的判定(better-sqlite3 抛出的错误信息含 UNIQUE)。
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /unique/i.test(error.message);
}

export async function createTag(nameRaw: string): Promise<TagActionState> {
  const name = (nameRaw ?? "").trim();
  if (name === "") return { ok: false, message: "请输入标签名称" };
  if (name.length > 50)
    return { ok: false, message: "标签名称过长(最多 50 字)" };

  try {
    db.insert(tags).values({ name }).run();
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: `标签「${name}」已存在` };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "创建失败,请重试",
    };
  }

  revalidateTagDependents();
  return { ok: true };
}

export async function renameTag(
  id: number,
  nameRaw: string,
): Promise<TagActionState> {
  const name = (nameRaw ?? "").trim();
  if (name === "") return { ok: false, message: "请输入标签名称" };
  if (name.length > 50)
    return { ok: false, message: "标签名称过长(最多 50 字)" };

  try {
    db.update(tags).set({ name }).where(eq(tags.id, id)).run();
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: `标签「${name}」已存在` };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "重命名失败,请重试",
    };
  }

  revalidateTagDependents();
  return { ok: true };
}

export async function deleteTag(id: number): Promise<TagActionState> {
  try {
    // entity_tags.tag_id 外键 onDelete:cascade,删除标签会自动清理其全部关联。
    db.delete(tags).where(eq(tags.id, id)).run();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "删除失败,请重试",
    };
  }

  revalidateTagDependents();
  return { ok: true };
}
