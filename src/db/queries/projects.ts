// 项目查询 —— Phase 3
//
// listProjects:筛选(level/status/q/tagId)+ 分页 + 按 updated_at 倒序;一次性批量填充标签。
// getProjectById:单条项目 + 其标签 + 已挂接成果(works);不存在返回 null。
//
// 标签关联:entity_tags 多态表(entity_type='project' and entity_id=projects.id and tag_id)。
// 成果挂接:project_outputs(project_id, work_id)多对多。
import { eq, and, or, like, inArray, desc, count } from "drizzle-orm";

import { db } from "@/db";
import { projects, entity_tags, tags, project_outputs, works } from "@/db/schema";
import type { Project, Tag } from "@/db/schema";
import type { WorkBrief } from "@/db/queries/works";
import type { ProjectLevel, ProjectStatus } from "@/lib/constants";

// 项目 + 其标签列表。
export interface ProjectWithTags extends Project {
  tags: Tag[];
}

// 项目 + 标签 + 已挂接成果(作品精简信息)。
export interface ProjectWithRelations extends ProjectWithTags {
  outputs: WorkBrief[];
}

// 列表查询参数。
export interface ListProjectsParams {
  q?: string;
  level?: ProjectLevel;
  status?: ProjectStatus;
  tagId?: number;
  page?: number;
  pageSize?: number;
}

// 列表查询结果(含分页元信息)。
export interface ListProjectsResult {
  items: ProjectWithTags[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

// 给定一批项目 id,一次性查出它们的全部标签并按 project id 分组。
function loadTagsForProjects(projectIds: number[]): Map<number, Tag[]> {
  const grouped = new Map<number, Tag[]>();
  if (projectIds.length === 0) return grouped;

  const rows = db
    .select({
      entity_id: entity_tags.entity_id,
      tag: tags,
    })
    .from(entity_tags)
    .innerJoin(tags, eq(entity_tags.tag_id, tags.id))
    .where(
      and(
        eq(entity_tags.entity_type, "project"),
        inArray(entity_tags.entity_id, projectIds)
      )
    )
    .all();

  for (const row of rows) {
    const list = grouped.get(row.entity_id);
    if (list) {
      list.push(row.tag);
    } else {
      grouped.set(row.entity_id, [row.tag]);
    }
  }
  return grouped;
}

// 项目列表:筛选 + 分页 + 排序 + 标签填充。
export async function listProjects(
  params: ListProjectsParams = {}
): Promise<ListProjectsResult> {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

  const conditions = [];

  if (params.level) {
    conditions.push(eq(projects.level, params.level));
  }
  if (params.status) {
    conditions.push(eq(projects.status, params.status));
  }
  if (params.q && params.q.trim() !== "") {
    const keyword = `%${params.q.trim()}%`;
    conditions.push(
      or(
        like(projects.title, keyword),
        like(projects.notes, keyword),
        like(projects.grant_no, keyword)
      )
    );
  }
  if (params.tagId !== undefined) {
    const taggedIds = db
      .select({ id: entity_tags.entity_id })
      .from(entity_tags)
      .where(
        and(
          eq(entity_tags.entity_type, "project"),
          eq(entity_tags.tag_id, params.tagId)
        )
      );
    conditions.push(inArray(projects.id, taggedIds));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ value: total }] = db
    .select({ value: count() })
    .from(projects)
    .where(whereClause)
    .all();

  const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);

  const items = db
    .select()
    .from(projects)
    .where(whereClause)
    .orderBy(desc(projects.updated_at))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all();

  const tagsByProject = loadTagsForProjects(items.map((p) => p.id));

  return {
    items: items.map((p) => ({ ...p, tags: tagsByProject.get(p.id) ?? [] })),
    total,
    page,
    pageSize,
    pageCount,
  };
}

// 单条项目 + 标签 + 已挂接成果;不存在返回 null。
export async function getProjectById(
  id: number
): Promise<ProjectWithRelations | null> {
  const [project] = db.select().from(projects).where(eq(projects.id, id)).all();
  if (!project) return null;

  const tagRows = db
    .select({ tag: tags })
    .from(entity_tags)
    .innerJoin(tags, eq(entity_tags.tag_id, tags.id))
    .where(
      and(
        eq(entity_tags.entity_type, "project"),
        eq(entity_tags.entity_id, id)
      )
    )
    .all();

  // 已挂接成果:project_outputs → works(精简字段),按作品更新时间倒序。
  const outputRows = db
    .select({
      id: works.id,
      title: works.title,
      type: works.type,
      status: works.status,
      published_at: works.published_at,
    })
    .from(project_outputs)
    .innerJoin(works, eq(project_outputs.work_id, works.id))
    .where(eq(project_outputs.project_id, id))
    .orderBy(desc(works.updated_at))
    .all();

  return {
    ...project,
    tags: tagRows.map((r) => r.tag),
    outputs: outputRows,
  };
}
