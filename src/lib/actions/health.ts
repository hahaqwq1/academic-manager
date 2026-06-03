"use server";

// 数据体检的修订动作 —— 升级线(体验层)
//
// 目前只提供「一键清理孤儿标签关联」:孤儿(entity_id 指向已不存在的作品/项目)是
// CHECK/外键都管不到的脏数据(多态 entity_id 无外键),只能在此显式清理。
// 其余健康项(缺日期/状态漂移)有明确的「去对应实体订正」路径,保持导航式、不在此批量改。
import { revalidatePath } from "next/cache";

import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { findOrphanEntityTags } from "@/db/queries/health";
import { entity_tags } from "@/db/schema";

export interface CleanupResult {
  ok: boolean;
  deleted: number;
  message?: string;
}

export async function cleanupOrphanEntityTags(): Promise<CleanupResult> {
  const orphans = findOrphanEntityTags();
  if (orphans.length === 0) {
    return { ok: true, deleted: 0, message: "没有孤儿标签关联可清理。" };
  }

  const ids = orphans.map((o) => o.id);
  try {
    db.delete(entity_tags).where(inArray(entity_tags.id, ids)).run();
  } catch (error) {
    return {
      ok: false,
      deleted: 0,
      message: error instanceof Error ? error.message : "清理失败,请重试。",
    };
  }

  // 已删除。缓存刷新失败不应让已成功的清理被误报为失败。
  try {
    revalidatePath("/health");
  } catch (error) {
    console.error("清理成功,但刷新体检页缓存失败:", error);
  }

  return { ok: true, deleted: ids.length };
}
