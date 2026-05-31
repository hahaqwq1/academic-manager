// 导出查询 —— Phase 6
//
// getAllWorksForExport:全部作品(完整字段),用于「成果清单」(按年份 / 类型)。
// getProjectsWithOutputs:全部项目 + 各自挂接的成果,用于「项目结题成果列表」。
// getDatabaseDump:六张表的整库快照,用于「导出全部数据为 JSON」二级备份。
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  works,
  projects,
  submissions,
  tags,
  entity_tags,
  project_outputs,
} from "@/db/schema";
import type { Work } from "@/db/schema";

// 成果清单数据:全部作品,已发表者按发表日期倒序(NULL 日期排最后)。
export async function getAllWorksForExport(): Promise<Work[]> {
  return db.select().from(works).orderBy(desc(works.published_at)).all();
}

// 项目导出的单条成果(作品精简信息)。
export interface ExportOutput {
  title: string;
  type: string;
  status: string;
  authors: string | null;
  published_at: string | null;
}

// 项目 + 其挂接成果。
export interface ProjectWithOutputsExport {
  id: number;
  title: string;
  level: string;
  role: string;
  status: string;
  grant_no: string | null;
  outputs: ExportOutput[];
}

export async function getProjectsWithOutputs(): Promise<
  ProjectWithOutputsExport[]
> {
  const rows = db.select().from(projects).orderBy(desc(projects.updated_at)).all();

  return rows.map((p) => {
    const outputs = db
      .select({
        title: works.title,
        type: works.type,
        status: works.status,
        authors: works.authors,
        published_at: works.published_at,
      })
      .from(project_outputs)
      .innerJoin(works, eq(project_outputs.work_id, works.id))
      .where(eq(project_outputs.project_id, p.id))
      .orderBy(desc(works.published_at))
      .all();

    return {
      id: p.id,
      title: p.title,
      level: p.level,
      role: p.role,
      status: p.status,
      grant_no: p.grant_no,
      outputs,
    };
  });
}

// 整库快照(六张表)。结构与 schema 对齐,便于将来导入 / 迁移。
export interface DatabaseDump {
  works: unknown[];
  projects: unknown[];
  submissions: unknown[];
  tags: unknown[];
  entity_tags: unknown[];
  project_outputs: unknown[];
}

export async function getDatabaseDump(): Promise<DatabaseDump> {
  return {
    works: db.select().from(works).all(),
    projects: db.select().from(projects).all(),
    submissions: db.select().from(submissions).all(),
    tags: db.select().from(tags).all(),
    entity_tags: db.select().from(entity_tags).all(),
    project_outputs: db.select().from(project_outputs).all(),
  };
}
