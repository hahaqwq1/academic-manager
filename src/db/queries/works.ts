// 作品查询 —— Phase 2
//
// listWorks:筛选(type/status/q/tagId)+ 分页 + 按 updated_at 倒序;一次性批量填充标签。
// getWorkById:单条作品 + 其标签;不存在返回 null。
//
// 标签关联:entity_tags 多态表(entity_type='work' and entity_id=works.id and tag_id)。
import { eq, and, or, inArray, desc, count, gte, lte } from "drizzle-orm";

import { db } from "@/db";
import { works, entity_tags, tags } from "@/db/schema";
import type { Work, Tag } from "@/db/schema";
import type { WorkType, WorkStatus } from "@/lib/constants";
import { likeContains } from "@/lib/like";

// 作品 + 其标签列表。
export interface WorkWithTags extends Work {
  tags: Tag[];
}

// 列表查询参数。
export interface ListWorksParams {
  q?: string;
  type?: WorkType;
  status?: WorkStatus;
  tagId?: number;
  from?: string; // published_at 区间起(YYYY-MM-DD,含)
  to?: string; // published_at 区间止(YYYY-MM-DD,含)
  page?: number;
  pageSize?: number;
}

// 列表查询结果(含分页元信息)。
export interface ListWorksResult {
  items: WorkWithTags[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

// 给定一批作品 id,一次性查出它们的全部标签并按 work id 分组。
function loadTagsForWorks(workIds: number[]): Map<number, Tag[]> {
  const grouped = new Map<number, Tag[]>();
  if (workIds.length === 0) return grouped;

  const rows = db
    .select({
      entity_id: entity_tags.entity_id,
      tag: tags,
    })
    .from(entity_tags)
    .innerJoin(tags, eq(entity_tags.tag_id, tags.id))
    .where(
      and(
        eq(entity_tags.entity_type, "work"),
        inArray(entity_tags.entity_id, workIds),
      ),
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

// 作品列表:筛选 + 分页 + 排序 + 标签填充。
export async function listWorks(
  params: ListWorksParams = {},
): Promise<ListWorksResult> {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize =
    params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

  // 组装 where 条件。
  const conditions = [];

  if (params.type) {
    conditions.push(eq(works.type, params.type));
  }
  if (params.status) {
    conditions.push(eq(works.status, params.status));
  }
  if (params.q && params.q.trim() !== "") {
    const q = params.q.trim();
    // 全文检索扩展到 标题 / 摘要 / 作者 / 备注(LIKE 子串,对中英文一致;通配符转义见 like.ts)。
    conditions.push(
      or(
        likeContains(works.title, q),
        likeContains(works.summary, q),
        likeContains(works.authors, q),
        likeContains(works.notes, q),
      ),
    );
  }
  if (params.tagId !== undefined) {
    // 用子查询命中拥有该标签的作品 id 集合,避免 join 去重的复杂度。
    const taggedIds = db
      .select({ id: entity_tags.entity_id })
      .from(entity_tags)
      .where(
        and(
          eq(entity_tags.entity_type, "work"),
          eq(entity_tags.tag_id, params.tagId),
        ),
      );
    conditions.push(inArray(works.id, taggedIds));
  }
  // 发表日期区间(YYYY-MM-DD 字典序即时间序;published_at 为 NULL 的在设区间时被排除)。
  if (params.from) {
    conditions.push(gte(works.published_at, params.from));
  }
  if (params.to) {
    conditions.push(lte(works.published_at, params.to));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 总数(同 where)。
  const total =
    db.select({ value: count() }).from(works).where(whereClause).all()[0]
      ?.value ?? 0;

  const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);

  // 取当前页数据。
  const items = db
    .select()
    .from(works)
    .where(whereClause)
    .orderBy(desc(works.updated_at))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all();

  // 批量填充标签。
  const tagsByWork = loadTagsForWorks(items.map((w) => w.id));

  return {
    items: items.map((w) => ({ ...w, tags: tagsByWork.get(w.id) ?? [] })),
    total,
    page,
    pageSize,
    pageCount,
  };
}

// 单条作品 + 其标签;不存在返回 null。
export async function getWorkById(id: number): Promise<WorkWithTags | null> {
  const [work] = db.select().from(works).where(eq(works.id, id)).all();
  if (!work) return null;

  const tagRows = db
    .select({ tag: tags })
    .from(entity_tags)
    .innerJoin(tags, eq(entity_tags.tag_id, tags.id))
    .where(
      and(eq(entity_tags.entity_type, "work"), eq(entity_tags.entity_id, id)),
    )
    .all();

  return { ...work, tags: tagRows.map((r) => r.tag) };
}

// 作品精简列表(id/title/type/status/published_at),按更新时间倒序。
// 供项目成果挂接选择器、导出等只需轻量字段的场景使用。
export type WorkBrief = Pick<
  Work,
  "id" | "title" | "type" | "status" | "published_at"
>;

export async function listWorksMinimal(): Promise<WorkBrief[]> {
  return db
    .select({
      id: works.id,
      title: works.title,
      type: works.type,
      status: works.status,
      published_at: works.published_at,
    })
    .from(works)
    .orderBy(desc(works.updated_at))
    .all();
}
