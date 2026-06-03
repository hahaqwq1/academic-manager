// 导出查询 —— Phase 6
//
// getAllWorksForExport:全部作品(完整字段),用于「成果清单」(按年份 / 类型)。
// getProjectsWithOutputs:全部项目 + 各自挂接的成果,用于「项目结题成果列表」。
// getDatabaseDump:六张表的整库快照,用于「导出全部数据为 JSON」二级备份。
import { asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import type { Work } from "@/db/schema";
import {
  entity_tags,
  project_outputs,
  projects,
  submissions,
  tags,
  works,
} from "@/db/schema";
import type { WorkStatus, WorkType } from "@/lib/constants";

// 作品 + 解析后的期刊(供引用导出):works.journal 缺失时由其投稿兜底。
export interface WorkForExport extends Work {
  resolvedJournal: string | null;
}

// 成果清单数据:全部作品,已发表者按发表日期倒序(NULL 日期排最后)。
// 额外解析 resolvedJournal:优先 works.journal;缺失时取该作品「录用 > 最近已决 > 最新轮次」投稿的 journal。
export async function getAllWorksForExport(): Promise<WorkForExport[]> {
  const rows = db.select().from(works).orderBy(desc(works.published_at)).all();

  const needIds = rows.filter((w) => !w.journal).map((w) => w.id);
  const fallback = new Map<number, string>();
  if (needIds.length > 0) {
    const subs = db
      .select({
        work_id: submissions.work_id,
        journal: submissions.journal,
        status: submissions.status,
        decided_at: submissions.decided_at,
        round: submissions.round,
      })
      .from(submissions)
      .where(inArray(submissions.work_id, needIds))
      .all();

    const byWork = new Map<number, typeof subs>();
    for (const s of subs) {
      const list = byWork.get(s.work_id);
      if (list) list.push(s);
      else byWork.set(s.work_id, [s]);
    }
    for (const [workId, list] of byWork) {
      // 排序优先级:录用 > 决定日期较近 > 轮次较大;取首条的 journal。
      const best = [...list].sort((a, b) => {
        const ac = a.status === "录用" ? 1 : 0;
        const bc = b.status === "录用" ? 1 : 0;
        if (ac !== bc) return bc - ac;
        const ad = a.decided_at ?? "";
        const bd = b.decided_at ?? "";
        if (ad !== bd) return bd.localeCompare(ad);
        return b.round - a.round;
      })[0];
      if (best) fallback.set(workId, best.journal);
    }
  }

  return rows.map((w) => ({
    ...w,
    resolvedJournal: w.journal ?? fallback.get(w.id) ?? null,
  }));
}

// 项目导出的单条成果(作品精简信息)。
export interface ExportOutput {
  title: string;
  type: WorkType;
  status: WorkStatus;
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
  const rows = db
    .select()
    .from(projects)
    .orderBy(desc(projects.updated_at))
    .all();
  if (rows.length === 0) return [];

  // 一次取出全部「项目 ↔ 成果」连接(带作品精简字段),再在 JS 内按 project_id 分组,
  // 取代原先 projects.map() 内逐项目一次查询的 N+1(P3-10)。
  // 全局按 works.published_at 倒序,分组保序后每个项目内部即各自的发表日期倒序。
  const linkRows = db
    .select({
      project_id: project_outputs.project_id,
      title: works.title,
      type: works.type,
      status: works.status,
      authors: works.authors,
      published_at: works.published_at,
    })
    .from(project_outputs)
    .innerJoin(works, eq(project_outputs.work_id, works.id))
    // 同发表日期(含多个 NULL)的并列项:加 work_id 升序次级排序,使分组内顺序确定,
    // 与旧的「按项目逐查 + 覆盖索引」并列序一致,且不受全表扫描 vs 索引计划影响(P3-10 对抗审查)。
    .orderBy(desc(works.published_at), asc(project_outputs.work_id))
    .all();

  const outputsByProject = new Map<number, ExportOutput[]>();
  for (const { project_id, ...output } of linkRows) {
    const list = outputsByProject.get(project_id);
    if (list) list.push(output);
    else outputsByProject.set(project_id, [output]);
  }

  return rows.map((p) => ({
    id: p.id,
    title: p.title,
    level: p.level,
    role: p.role,
    status: p.status,
    grant_no: p.grant_no,
    outputs: outputsByProject.get(p.id) ?? [],
  }));
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
