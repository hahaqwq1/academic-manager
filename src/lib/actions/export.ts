"use server";

// 导入 / 恢复 Server Action —— P2-8(经对抗式审查加固)
//
// 把「整库 JSON 备份」(由 getDatabaseDump 导出、export-client 下载)回灌到当前库。
// 安全分层(从外到内,任一层不过即拒,越早越好——尤其要在「清库」之前拦住坏数据):
//   1) zod 结构/字段校验:6 表键名、类型、枚举、日历日期(复用 P0-3)、ISO 时间戳、id≥1、非空文本。
//   2) checkIntegrity 预检:表内主键/唯一键重复、跨表引用完整性(含 entity_tags.entity_id 多态
//      引用——SQLite 无外键守护它,故必须在此手动校验,否则孤儿会被静默写入)。
//   3) 单个同步事务:先按外键安全序清空 6 表,再「父表先、子表后」插入(保留原 id 与时间戳,
//      保证引用在恢复后自洽)。任一步抛错整体回滚(防御性兜底),库保持导入前原样。
// 成功后 revalidate 主要路由(包进 try/catch:已提交的恢复绝不能因刷新失败被误报为失败)。
// 兼容下载格式 { app, exportedAt, data:{...} } 与「裸 dump」两种输入。
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  works,
  projects,
  submissions,
  tags,
  entity_tags,
  project_outputs,
} from "@/db/schema";
import {
  workTypeSchema,
  workStatusSchema,
  authorRoleSchema,
  projectLevelSchema,
  projectRoleSchema,
  projectStatusSchema,
  submissionStatusSchema,
  entityTypeSchema,
  currencySchema,
} from "@/lib/constants";
import {
  DATE_FORMAT_REGEX,
  DATE_FORMAT_MESSAGE,
  DATE_INVALID_MESSAGE,
  isRealCalendarDate,
  isProjectDateOrderValid,
  projectDateOrderRefineParams,
  isSubmissionDateOrderValid,
  submissionDateOrderRefineParams,
} from "@/lib/date-rules";

// --- 字段级校验件 ---
// 主键 / 外键 id:autoIncrement 主键契约为 ≥1,拒 0 与负数。
const intId = z.number().int().min(1);
const nullableText = z.string().nullable();
// 真实日历日(YYYY-MM-DD);可空版用于 published_at / start_date / end_date / decided_at。
const calendarDate = z
  .string()
  .regex(DATE_FORMAT_REGEX, DATE_FORMAT_MESSAGE)
  .refine(isRealCalendarDate, DATE_INVALID_MESSAGE);
const nullableCalendarDate = calendarDate.nullable();
// 时间戳(created_at / updated_at):须为可被解析的 ISO8601,拒空串/纯空白/乱码,
// 否则会污染列表排序(字典序)与日期展示(Date.parse → NaN)。
const isoTimestamp = z
  .string()
  .refine(
    (v) => v.trim() !== "" && !Number.isNaN(Date.parse(v)),
    "时间戳须为合法 ISO8601 日期时间",
  );

// --- 各表行 schema(与 src/db/schema.ts 对齐,含 id 与时间戳以便原样恢复)---
const workRow = z.object({
  id: intId,
  type: workTypeSchema,
  title: z.string().trim().min(1, "作品标题不能为空"),
  status: workStatusSchema,
  authors: nullableText,
  author_role: authorRoleSchema.nullable(),
  word_count: z.number().int().min(0, "字数不能为负数").nullable(),
  summary: nullableText,
  notes: nullableText,
  file_path: nullableText,
  published_at: nullableCalendarDate,
  // 升级线新增列;.optional() 兼容旧备份(无此键时由列默认/NULL 补)。
  doi: nullableText.optional(),
  journal: nullableText.optional(),
  created_at: isoTimestamp,
  updated_at: isoTimestamp,
});

const projectRow = z
  .object({
    id: intId,
    title: z.string().trim().min(1, "项目标题不能为空"),
    level: projectLevelSchema,
    role: projectRoleSchema,
    grant_no: nullableText,
    funding: nullableText,
    // 升级线新增结构化经费;.optional() 兼容旧备份。
    funding_amount: z
      .number()
      .min(0, "经费金额不能为负数")
      .nullable()
      .optional(),
    funding_currency: currencySchema.nullable().optional(),
    status: projectStatusSchema,
    start_date: nullableCalendarDate,
    end_date: nullableCalendarDate,
    notes: nullableText,
    created_at: isoTimestamp,
    updated_at: isoTimestamp,
  })
  // 跨字段日期校验:规则 + 文案 + 挂载字段与表单 projectInputSchema 同源(@/lib/date-rules),
  // 坏备份(end<start)在清库前就被拦。
  .refine(isProjectDateOrderValid, projectDateOrderRefineParams);

const submissionRow = z
  .object({
    id: intId,
    work_id: intId,
    journal: z.string().trim().min(1, "期刊不能为空"),
    round: z.number().int().min(1),
    status: submissionStatusSchema,
    submitted_at: calendarDate,
    decided_at: nullableCalendarDate,
    review_notes: nullableText,
  })
  // 跨字段日期校验:规则 + 文案与表单 submissionInputSchema 同源(@/lib/date-rules,decided>=submitted)。
  .refine(isSubmissionDateOrderValid, submissionDateOrderRefineParams);

const tagRow = z.object({
  id: intId,
  name: z.string().trim().min(1, "标签名不能为空"),
});

const entityTagRow = z.object({
  id: intId,
  entity_type: entityTypeSchema,
  entity_id: intId,
  tag_id: intId,
});

const projectOutputRow = z.object({
  id: intId,
  project_id: intId,
  work_id: intId,
});

const dumpSchema = z.object({
  works: z.array(workRow),
  projects: z.array(projectRow),
  submissions: z.array(submissionRow),
  tags: z.array(tagRow),
  entity_tags: z.array(entityTagRow),
  project_outputs: z.array(projectOutputRow),
});

type Dump = z.infer<typeof dumpSchema>;

export interface ImportCounts {
  works: number;
  projects: number;
  submissions: number;
  tags: number;
  entity_tags: number;
  project_outputs: number;
}

export interface ImportResult {
  ok: boolean;
  message?: string;
  counts?: ImportCounts;
}

// 返回数组内首个重复键的描述;无重复返回 null。
function firstDuplicate<T>(
  rows: T[],
  keyOf: (row: T) => string | number,
  label: string,
): string | null {
  const seen = new Set<string | number>();
  for (const row of rows) {
    const k = keyOf(row);
    if (seen.has(k)) return `${label} 存在重复值「${k}」`;
    seen.add(k);
  }
  return null;
}

// 事务之前的完整性预检:重复键 + 跨表引用(含多态 entity_id)。返回首个错误描述或 null。
// 关键意义:坏备份在「清库」动作之前就被拒,绝不会出现「删了旧数据又灌不进新数据」。
function checkIntegrity(data: Dump): string | null {
  const dupErr =
    firstDuplicate(data.works, (r) => r.id, "works.id") ??
    firstDuplicate(data.projects, (r) => r.id, "projects.id") ??
    firstDuplicate(data.submissions, (r) => r.id, "submissions.id") ??
    firstDuplicate(data.tags, (r) => r.id, "tags.id") ??
    firstDuplicate(data.tags, (r) => r.name, "tags.name") ??
    firstDuplicate(data.entity_tags, (r) => r.id, "entity_tags.id") ??
    firstDuplicate(data.project_outputs, (r) => r.id, "project_outputs.id") ??
    firstDuplicate(
      data.submissions,
      (r) => `${r.work_id}#${r.round}`,
      "submissions(work_id,round)",
    ) ??
    firstDuplicate(
      data.entity_tags,
      (r) => `${r.entity_type}#${r.entity_id}#${r.tag_id}`,
      "entity_tags 唯一组合",
    ) ??
    firstDuplicate(
      data.project_outputs,
      (r) => `${r.project_id}#${r.work_id}`,
      "project_outputs 唯一组合",
    );
  if (dupErr) return dupErr;

  const workIds = new Set(data.works.map((w) => w.id));
  const projectIds = new Set(data.projects.map((p) => p.id));
  const tagIds = new Set(data.tags.map((t) => t.id));

  for (const s of data.submissions) {
    if (!workIds.has(s.work_id))
      return `submissions.work_id=${s.work_id} 无对应作品`;
  }
  for (const e of data.entity_tags) {
    if (!tagIds.has(e.tag_id))
      return `entity_tags.tag_id=${e.tag_id} 无对应标签`;
    // entity_id 是多态引用(work | project),SQLite 无外键约束,必须在此手动校验。
    const pool = e.entity_type === "work" ? workIds : projectIds;
    if (!pool.has(e.entity_id)) {
      return `entity_tags.entity_id=${e.entity_id}(${e.entity_type})无对应实体`;
    }
  }
  for (const po of data.project_outputs) {
    if (!projectIds.has(po.project_id)) {
      return `project_outputs.project_id=${po.project_id} 无对应项目`;
    }
    if (!workIds.has(po.work_id)) {
      return `project_outputs.work_id=${po.work_id} 无对应作品`;
    }
  }
  return null;
}

// 兼容下载包装 { app, exportedAt, data:{...} } 与裸 dump。
function unwrap(input: unknown): unknown {
  if (input !== null && typeof input === "object" && "data" in input) {
    return (input as { data: unknown }).data;
  }
  return input;
}

export async function importDatabase(input: unknown): Promise<ImportResult> {
  const parsed = dumpSchema.safeParse(unwrap(input));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.length ? first.path.join(".") : "(根)";
    return {
      ok: false,
      message: `备份结构校验失败:${where} — ${first?.message ?? "格式不正确"}`,
    };
  }

  const data: Dump = parsed.data;

  // 引用/重复预检:在触碰数据库之前拦截坏备份。
  const integrityError = checkIntegrity(data);
  if (integrityError) {
    return { ok: false, message: `备份完整性校验失败:${integrityError}` };
  }

  try {
    db.transaction((tx) => {
      // 清空:先删子表(有外键引用),再删父表——与 seed 同序。
      tx.delete(submissions).run();
      tx.delete(entity_tags).run();
      tx.delete(project_outputs).run();
      tx.delete(works).run();
      tx.delete(projects).run();
      tx.delete(tags).run();

      // 重灌:父表先(tags / works / projects),子表后;空数组跳过(drizzle 不接受空 values)。
      if (data.tags.length) tx.insert(tags).values(data.tags).run();
      if (data.works.length) tx.insert(works).values(data.works).run();
      if (data.projects.length) tx.insert(projects).values(data.projects).run();
      if (data.submissions.length)
        tx.insert(submissions).values(data.submissions).run();
      if (data.entity_tags.length)
        tx.insert(entity_tags).values(data.entity_tags).run();
      if (data.project_outputs.length)
        tx.insert(project_outputs).values(data.project_outputs).run();
    });
  } catch (error) {
    return {
      ok: false,
      message: `导入失败,已回滚到导入前状态:${
        error instanceof Error ? error.message : "未知错误"
      }`,
    };
  }

  // 数据已提交。缓存刷新失败不应让已成功的恢复被误报为失败。
  try {
    for (const path of [
      "/",
      "/works",
      "/projects",
      "/submissions",
      "/tags",
      "/export",
    ]) {
      revalidatePath(path);
    }
  } catch (error) {
    console.error("恢复成功,但刷新页面缓存失败:", error);
  }

  const counts: ImportCounts = {
    works: data.works.length,
    projects: data.projects.length,
    submissions: data.submissions.length,
    tags: data.tags.length,
    entity_tags: data.entity_tags.length,
    project_outputs: data.project_outputs.length,
  };

  return {
    ok: true,
    message: `已从备份恢复:作品 ${counts.works}、项目 ${counts.projects}、投稿 ${counts.submissions}、标签 ${counts.tags}`,
    counts,
  };
}
