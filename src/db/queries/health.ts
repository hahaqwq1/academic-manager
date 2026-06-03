// 数据健康中心查询 —— 升级线(数据完整性 + 体验层)
//
// 列出 DB 允许、但口径/语义上可疑的数据,供 /health 页面集中展示与跳转修订。
// 分工说明:倒挂日期(end<start、decided<submitted)已由 0002 迁移的 DB CHECK 在写入层杜绝
// (projects / submissions),库里不可能再有,故此处不再查;这里只查 CHECK 管不到的几类:
//   1) publishedMissingDate —— 状态=已发表 但未填发表日期(口径外:计入「已发表」却不进年度图)
//   2) datedNotPublished    —— 填了发表日期 但状态≠已发表(口径外)
//   3) worksSubmittingNoSubmission —— 状态=投稿中 却无任何投稿记录(语义漂移)
//   4) submissionsDecidedButPending —— 投稿已填决定日期 却仍标在审(语义漂移:出了结果没更新状态)
//   5) orphanEntityTags —— 多态 entity_id 指向不存在的作品/项目(entity_id 无外键,删父实体会留孤儿)
import {
  and,
  desc,
  eq,
  isNotNull,
  isNull,
  ne,
  notInArray,
  or,
} from "drizzle-orm";

import { db } from "@/db";
import { entity_tags, projects, submissions, tags, works } from "@/db/schema";

// 指向某条作品/项目的健康问题条目(可深链到其详情页)。
export interface HealthEntityRef {
  kind: "work" | "project";
  id: number;
  title: string;
  detail?: string; // 附加上下文,如当前状态 / 投稿期刊
}

// 孤儿标签关联:其多态 entity_id 已无对应实体,无处可跳,仅作诊断展示。
export interface OrphanTagRef {
  id: number; // entity_tags.id
  entity_type: "work" | "project";
  entity_id: number;
  tagName: string;
}

export interface HealthReport {
  publishedMissingDate: HealthEntityRef[];
  datedNotPublished: HealthEntityRef[];
  worksSubmittingNoSubmission: HealthEntityRef[];
  submissionsDecidedButPending: HealthEntityRef[];
  orphanEntityTags: OrphanTagRef[];
  totalIssues: number;
}

// 1) 已发表缺发表日期。
export function findPublishedMissingDate(): HealthEntityRef[] {
  return db
    .select({ id: works.id, title: works.title })
    .from(works)
    .where(and(eq(works.status, "已发表"), isNull(works.published_at)))
    .orderBy(desc(works.updated_at))
    .all()
    .map((w) => ({ kind: "work" as const, id: w.id, title: w.title }));
}

// 2) 有发表日期但状态非已发表。
export function findDatedNotPublished(): HealthEntityRef[] {
  return db
    .select({ id: works.id, title: works.title, status: works.status })
    .from(works)
    .where(and(isNotNull(works.published_at), ne(works.status, "已发表")))
    .orderBy(desc(works.updated_at))
    .all()
    .map((w) => ({
      kind: "work" as const,
      id: w.id,
      title: w.title,
      detail: `当前状态:${w.status}`,
    }));
}

// 3) 状态=投稿中 却无任何投稿记录。
export function findWorksSubmittingNoSubmission(): HealthEntityRef[] {
  const worksWithSubs = db
    .select({ id: submissions.work_id })
    .from(submissions);
  return db
    .select({ id: works.id, title: works.title })
    .from(works)
    .where(and(eq(works.status, "投稿中"), notInArray(works.id, worksWithSubs)))
    .orderBy(desc(works.updated_at))
    .all()
    .map((w) => ({ kind: "work" as const, id: w.id, title: w.title }));
}

// 4) 投稿已填决定日期 却仍标在审。
export function findSubmissionsDecidedButPending(): HealthEntityRef[] {
  return db
    .select({
      id: works.id,
      title: works.title,
      journal: submissions.journal,
    })
    .from(submissions)
    .innerJoin(works, eq(submissions.work_id, works.id))
    .where(
      and(eq(submissions.status, "在审"), isNotNull(submissions.decided_at)),
    )
    .all()
    .map((r) => ({
      kind: "work" as const,
      id: r.id,
      title: r.title,
      detail: `投稿:${r.journal}`,
    }));
}

// 5) 孤儿 entity_tags:entity_id 指向不存在的作品/项目。
export function findOrphanEntityTags(): OrphanTagRef[] {
  const workIds = db.select({ id: works.id }).from(works);
  const projectIds = db.select({ id: projects.id }).from(projects);
  return (
    db
      .select({
        id: entity_tags.id,
        entity_type: entity_tags.entity_type,
        entity_id: entity_tags.entity_id,
        tagName: tags.name,
      })
      .from(entity_tags)
      // tag_id 有外键级联,标签必存在;entity_id 是多态无外键,才会孤儿。
      .innerJoin(tags, eq(entity_tags.tag_id, tags.id))
      .where(
        or(
          and(
            eq(entity_tags.entity_type, "work"),
            notInArray(entity_tags.entity_id, workIds),
          ),
          and(
            eq(entity_tags.entity_type, "project"),
            notInArray(entity_tags.entity_id, projectIds),
          ),
        ),
      )
      .all()
      .map((r) => ({
        id: r.id,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        tagName: r.tagName,
      }))
  );
}

// 汇总报告:各类问题清单 + 问题总数(供页面空态判断与角标)。
export async function getHealthReport(): Promise<HealthReport> {
  const publishedMissingDate = findPublishedMissingDate();
  const datedNotPublished = findDatedNotPublished();
  const worksSubmittingNoSubmission = findWorksSubmittingNoSubmission();
  const submissionsDecidedButPending = findSubmissionsDecidedButPending();
  const orphanEntityTags = findOrphanEntityTags();

  const totalIssues =
    publishedMissingDate.length +
    datedNotPublished.length +
    worksSubmittingNoSubmission.length +
    submissionsDecidedButPending.length +
    orphanEntityTags.length;

  return {
    publishedMissingDate,
    datedNotPublished,
    worksSubmittingNoSubmission,
    submissionsDecidedButPending,
    orphanEntityTags,
    totalIssues,
  };
}
