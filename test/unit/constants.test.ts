// 枚举常量单元测试 —— P2-7
//
// 纯函数。守护枚举值集合、zod 校验、中文 label map 与 OVERDUE_DAYS 不被误改。
import { describe, it, expect } from "vitest";

import {
  WORK_TYPES,
  workTypeSchema,
  WORK_TYPE_LABELS,
  WORK_STATUSES,
  workStatusSchema,
  AUTHOR_ROLES,
  authorRoleSchema,
  PROJECT_LEVELS,
  projectLevelSchema,
  PROJECT_ROLES,
  projectRoleSchema,
  PROJECT_STATUSES,
  projectStatusSchema,
  SUBMISSION_STATUSES,
  submissionStatusSchema,
  ENTITY_TYPES,
  entityTypeSchema,
  ENTITY_TYPE_LABELS,
  OVERDUE_DAYS,
} from "@/lib/constants";

describe("枚举值集合", () => {
  it("works.type", () => {
    expect(WORK_TYPES).toEqual(["paper", "commentary", "draft", "other"]);
  });
  it("works.status", () => {
    expect(WORK_STATUSES).toEqual([
      "构思",
      "写作中",
      "已完成",
      "投稿中",
      "已发表",
      "已搁置",
    ]);
  });
  it("author_role", () => {
    expect(AUTHOR_ROLES).toEqual(["第一作者", "通讯作者", "独著", "参与"]);
  });
  it("projects.level / role / status", () => {
    expect(PROJECT_LEVELS).toEqual(["国家级", "省部级", "校级", "其他"]);
    expect(PROJECT_ROLES).toEqual(["主持", "参与"]);
    expect(PROJECT_STATUSES).toEqual([
      "拟申报",
      "申报中",
      "已立项",
      "结题中",
      "已结题",
      "未中",
    ]);
  });
  it("submissions.status", () => {
    expect(SUBMISSION_STATUSES).toEqual([
      "在审",
      "退修",
      "录用",
      "被拒",
      "已撤稿",
    ]);
  });
  it("entity_type", () => {
    expect(ENTITY_TYPES).toEqual(["work", "project"]);
  });
});

describe("zod 枚举校验", () => {
  it("接受合法值,拒非法值", () => {
    expect(workTypeSchema.safeParse("paper").success).toBe(true);
    expect(workTypeSchema.safeParse("xxx").success).toBe(false);
    expect(workStatusSchema.safeParse("已发表").success).toBe(true);
    expect(authorRoleSchema.safeParse("独著").success).toBe(true);
    expect(projectLevelSchema.safeParse("国家级").success).toBe(true);
    expect(projectRoleSchema.safeParse("主持").success).toBe(true);
    expect(projectStatusSchema.safeParse("结题中").success).toBe(true);
    expect(submissionStatusSchema.safeParse("在审").success).toBe(true);
    expect(entityTypeSchema.safeParse("work").success).toBe(true);
    expect(entityTypeSchema.safeParse("unknown").success).toBe(false);
  });
});

describe("label map 与常量", () => {
  it("WORK_TYPE_LABELS 覆盖每个 type", () => {
    for (const t of WORK_TYPES) expect(WORK_TYPE_LABELS[t]).toBeTruthy();
    expect(WORK_TYPE_LABELS.paper).toBe("论文");
  });
  it("ENTITY_TYPE_LABELS 覆盖每个 entity_type", () => {
    for (const t of ENTITY_TYPES) expect(ENTITY_TYPE_LABELS[t]).toBeTruthy();
    expect(ENTITY_TYPE_LABELS.work).toBe("作品");
    expect(ENTITY_TYPE_LABELS.project).toBe("项目");
  });
  it("OVERDUE_DAYS === 90", () => {
    expect(OVERDUE_DAYS).toBe(90);
  });
});
