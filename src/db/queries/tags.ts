// 标签查询 —— Phase 2 / Phase 4
//
// listAllTags:全部标签(供表单 / 筛选器渲染选项)。
// listTagsWithCounts:全部标签 + 各自被作品 / 项目引用的数量(供标签管理页)。
// getEntitiesByTag:某标签下的作品与项目(供按主题浏览)。
import { asc, eq, and, desc, inArray, count } from "drizzle-orm";

import { db } from "@/db";
import { tags, entity_tags, works, projects } from "@/db/schema";
import type { Tag, Project } from "@/db/schema";
import type { WorkBrief } from "@/db/queries/works";

// 全部标签,按名称升序。
export async function listAllTags(): Promise<Tag[]> {
  return db.select().from(tags).orderBy(asc(tags.name)).all();
}

// 标签 + 引用计数。
export interface TagWithCounts extends Tag {
  workCount: number;
  projectCount: number;
}

// 全部标签 + 各自被作品 / 项目引用的数量。
export async function listTagsWithCounts(): Promise<TagWithCounts[]> {
  const allTags = db.select().from(tags).orderBy(asc(tags.name)).all();
  if (allTags.length === 0) return [];

  // 在 SQL 层按 (tag_id, entity_type) 分组计数,取代原先全量加载 entity_tags 再 JS 累加(P3-10)。
  const counts = db
    .select({
      tag_id: entity_tags.tag_id,
      entity_type: entity_tags.entity_type,
      n: count(),
    })
    .from(entity_tags)
    .groupBy(entity_tags.tag_id, entity_tags.entity_type)
    .all();

  const workCounts = new Map<number, number>();
  const projectCounts = new Map<number, number>();
  for (const c of counts) {
    const map = c.entity_type === "work" ? workCounts : projectCounts;
    map.set(c.tag_id, c.n);
  }

  return allTags.map((t) => ({
    ...t,
    workCount: workCounts.get(t.id) ?? 0,
    projectCount: projectCounts.get(t.id) ?? 0,
  }));
}

// 项目精简信息(供按标签浏览)。复用 Project 的列级枚举类型(0-3),level/role/status 即联合类型。
export type ProjectBrief = Pick<
  Project,
  "id" | "title" | "level" | "role" | "status"
>;

// 某标签下的作品与项目。tag 不存在时返回 null。
export interface EntitiesByTag {
  tag: Tag;
  works: WorkBrief[];
  projects: ProjectBrief[];
}

export async function getEntitiesByTag(
  tagId: number
): Promise<EntitiesByTag | null> {
  const [tag] = db.select().from(tags).where(eq(tags.id, tagId)).all();
  if (!tag) return null;

  // 命中该标签的作品 id / 项目 id 集合。
  const workIds = db
    .select({ id: entity_tags.entity_id })
    .from(entity_tags)
    .where(
      and(eq(entity_tags.entity_type, "work"), eq(entity_tags.tag_id, tagId))
    )
    .all()
    .map((r) => r.id);

  const projectIds = db
    .select({ id: entity_tags.entity_id })
    .from(entity_tags)
    .where(
      and(eq(entity_tags.entity_type, "project"), eq(entity_tags.tag_id, tagId))
    )
    .all()
    .map((r) => r.id);

  const taggedWorks: WorkBrief[] =
    workIds.length === 0
      ? []
      : db
          .select({
            id: works.id,
            title: works.title,
            type: works.type,
            status: works.status,
            published_at: works.published_at,
          })
          .from(works)
          .where(inArray(works.id, workIds))
          .orderBy(desc(works.updated_at))
          .all();

  const taggedProjects: ProjectBrief[] =
    projectIds.length === 0
      ? []
      : db
          .select({
            id: projects.id,
            title: projects.title,
            level: projects.level,
            role: projects.role,
            status: projects.status,
          })
          .from(projects)
          .where(inArray(projects.id, projectIds))
          .orderBy(desc(projects.updated_at))
          .all();

  return { tag, works: taggedWorks, projects: taggedProjects };
}
