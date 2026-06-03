// 测试数据工厂 —— P2-7
//
// 直接用 drizzle 往临时库插入最小合法行,返回带 id 的整行(便于断言、关联)。
// 默认值刻意「能过非空约束 + 语义清晰」;需要控制排序/筛选时由 overrides 显式覆盖,
// 尤其是 updated_at(works/projects 列表按其倒序):不覆盖则取 $defaultFn 的 isoNow()。
import {
  works,
  projects,
  submissions,
  tags,
  entity_tags,
  project_outputs,
} from "@/db/schema";
import type {
  Work,
  Project,
  Submission,
  Tag,
  EntityTag,
  ProjectOutput,
  NewWork,
  NewProject,
  NewSubmission,
} from "@/db/schema";

import type { TestDb } from "./test-db";

export function makeWork(db: TestDb, overrides: Partial<NewWork> = {}): Work {
  const [row] = db
    .insert(works)
    .values({
      type: "paper",
      title: "作品标题",
      status: "已完成",
      ...overrides,
    })
    .returning()
    .all();
  return row!;
}

export function makeProject(
  db: TestDb,
  overrides: Partial<NewProject> = {},
): Project {
  const [row] = db
    .insert(projects)
    .values({
      title: "项目标题",
      level: "校级",
      role: "主持",
      status: "已立项",
      ...overrides,
    })
    .returning()
    .all();
  return row!;
}

export function makeSubmission(
  db: TestDb,
  workId: number,
  overrides: Partial<NewSubmission> = {},
): Submission {
  const [row] = db
    .insert(submissions)
    .values({
      work_id: workId,
      journal: "某刊",
      round: 1,
      status: "在审",
      submitted_at: "2024-01-01",
      ...overrides,
    })
    .returning()
    .all();
  return row!;
}

export function makeTag(db: TestDb, name: string): Tag {
  const [row] = db.insert(tags).values({ name }).returning().all();
  return row!;
}

// 给某实体(work / project)打标签。
export function tagEntity(
  db: TestDb,
  entityType: "work" | "project",
  entityId: number,
  tagId: number,
): EntityTag {
  const [row] = db
    .insert(entity_tags)
    .values({ entity_type: entityType, entity_id: entityId, tag_id: tagId })
    .returning()
    .all();
  return row!;
}

// 把作品挂接到项目。
export function linkOutput(
  db: TestDb,
  projectId: number,
  workId: number,
): ProjectOutput {
  const [row] = db
    .insert(project_outputs)
    .values({ project_id: projectId, work_id: workId })
    .returning()
    .all();
  return row!;
}
