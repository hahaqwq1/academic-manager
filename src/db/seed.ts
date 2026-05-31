// 数据库 Seed 脚本 —— 通用示例数据(开源版,无任何真实个人信息)
//
// 经 `npm run db:seed`(tsx src/db/seed.ts)运行,为全新克隆填充一批占位演示数据,
// 方便直接看到列表 / 看板 / 导出等功能的效果。全部为虚构示例,可随意替换。
// 关键约束:
// - 自建连接,绝不 import ./index.ts(它 import "server-only",在 tsx 下会抛错)。
// - 只插数据,不建表;运行前假定迁移已创建好表结构。
// - 幂等:先按外键顺序删子表再删父表,然后重新插入;整个清空+插入包进一个
//   同步事务,任一步失败则整体回滚。
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

// 数据目录与 src/db/index.ts 保持一致:DATA_DIR 默认 ./data,文件名 app.db。
const DATA_DIR = process.env.DATA_DIR ?? "./data";
const DB_PATH = path.join(DATA_DIR, "app.db");

// 确保数据目录存在
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("foreign_keys = ON"); // 启用外键级联约束
const db = drizzle(sqlite, { schema });

// 把毫秒时间戳格式化为 "YYYY-MM-DD"(纯日期用途,取 UTC 日期)。
function toDateString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const DAY_MS = 24 * 60 * 60 * 1000;

// 「今天往前约 120 天」:用于构造唯一一条「超期在审」示例(OVERDUE_DAYS=90,120>90)。
const OVERDUE_DATE = toDateString(Date.now() - 120 * DAY_MS);
// 「今天往前约 30 天」:用于第 2 轮转投在审,属「正常在审」,与超期示例形成对照。
const RECENT_DATE = toDateString(Date.now() - 30 * DAY_MS);

// better-sqlite3 是同步驱动,seed 全程无真正异步 I/O,故声明为同步函数。
function seed(): void {
  db.transaction((tx) => {
    // --- 幂等清空:先删子表(有外键引用),再删父表 ---
    tx.delete(schema.submissions).run();
    tx.delete(schema.entity_tags).run();
    tx.delete(schema.project_outputs).run();
    tx.delete(schema.works).run();
    tx.delete(schema.projects).run();
    tx.delete(schema.tags).run();

    // --- 标签(虚构主题)---
    const insertedTags = tx
      .insert(schema.tags)
      .values([
        { name: "研究主题一" },
        { name: "研究主题二" },
        { name: "研究主题三" },
        { name: "研究方法" },
        { name: "案例研究" },
      ])
      .returning()
      .all();

    const tagByName = new Map(insertedTags.map((t) => [t.name, t.id] as const));
    const tagId = (name: string): number => {
      const id = tagByName.get(name);
      if (id === undefined) throw new Error(`缺少标签:${name}`);
      return id;
    };

    // --- 作品:覆盖各 type 与多种 status(全为虚构占位)---
    const insertedWorks = tx
      .insert(schema.works)
      .values([
        {
          type: "paper",
          title: "示例论文:研究主题一的理论框架与实证分析",
          status: "已发表",
          authors: "示例作者",
          author_role: "第一作者",
          word_count: 12000,
          summary: "占位摘要:从理论与实证两个维度,讨论研究主题一的作用机制。",
          notes: "示例备注:已在示例期刊发表。",
          file_path: "/papers/2025/sample-paper-1.pdf",
          published_at: "2025-03-15",
        },
        {
          type: "paper",
          title: "示例论文:研究主题二的话语建构与传播",
          status: "投稿中",
          authors: "示例作者, 合作者一",
          author_role: "通讯作者",
          word_count: 15000,
          summary: "占位摘要:基于话语分析框架的示例研究,考察传播策略与效果。",
          notes: "示例备注:已投两轮,详见投稿记录。",
          file_path: "/papers/2026/sample-paper-2.docx",
          published_at: null,
        },
        {
          type: "commentary",
          title: "示例评论:研究主题三的风险与治理思路",
          status: "已完成",
          authors: "示例作者",
          author_role: "独著",
          word_count: 6000,
          summary: "占位摘要:评述研究主题三的潜在风险,提出分层治理的应对思路。",
          notes: "示例备注:拟投理论评论类期刊。",
          file_path: "/commentary/sample-commentary.md",
          published_at: null,
        },
        {
          type: "draft",
          title: "示例草稿:某领域制度障碍的初步分析",
          status: "写作中",
          authors: "示例作者",
          author_role: "第一作者",
          word_count: 4000,
          summary: "占位摘要:初稿,聚焦三类制度障碍。",
          notes: "示例备注:文献综述部分尚待补充。",
          file_path: "/drafts/sample-draft.md",
          published_at: null,
        },
        {
          type: "paper",
          title: "示例论文:技术应用适配性的多案例比较",
          status: "已发表",
          authors: "示例作者, 合作者二",
          author_role: "第一作者",
          word_count: 11000,
          summary: "占位摘要:通过多案例比较,揭示落地过程中的供需错配与调适机制。",
          notes: "示例备注:纳入某示例项目结题成果。",
          file_path: "/papers/2024/sample-paper-3.pdf",
          published_at: "2024-11-20",
        },
        {
          type: "other",
          title: "示例数据集:相关文献计量分析数据",
          status: "已搁置",
          authors: "示例作者",
          author_role: "独著",
          word_count: null,
          summary: "占位说明:整理某时间段相关文献的结构化数据集,供后续研究使用。",
          notes: "示例备注:因数据源更新暂停维护。",
          file_path: "/datasets/sample-dataset.csv",
          published_at: null,
        },
      ])
      .returning()
      .all();

    const workIdByTitle = new Map(insertedWorks.map((w) => [w.title, w.id] as const));
    const workId = (title: string): number => {
      const id = workIdByTitle.get(title);
      if (id === undefined) throw new Error(`缺少作品:${title}`);
      return id;
    };

    const PUBLISHED_WORK_1 = "示例论文:研究主题一的理论框架与实证分析";
    const PUBLISHED_WORK_2 = "示例论文:技术应用适配性的多案例比较";
    const SUBMITTING_WORK = "示例论文:研究主题二的话语建构与传播";
    const COMMENTARY_WORK = "示例评论:研究主题三的风险与治理思路";

    // --- 项目:覆盖不同 level / role / status(全为虚构占位)---
    const insertedProjects = tx
      .insert(schema.projects)
      .values([
        {
          title: "示例项目:研究主题一的应用路径研究",
          level: "国家级",
          role: "主持",
          grant_no: "SAMPLE-23-001",
          funding: "20万元",
          status: "结题中",
          start_date: "2023-01-01",
          end_date: "2025-12-31",
          notes: "占位备注:示例基金一般项目,进入结题阶段。",
        },
        {
          title: "示例项目:研究主题二的地方实践与效果评估",
          level: "省部级",
          role: "主持",
          grant_no: "SAMPLE-24-002",
          funding: "8万元",
          status: "已立项",
          start_date: "2024-06-01",
          end_date: "2026-05-31",
          notes: "占位备注:示例规划项目。",
        },
        {
          title: "示例项目:某领域治理机制与对策",
          level: "校级",
          role: "参与",
          grant_no: "SAMPLE-22-118",
          funding: "3万元",
          status: "已结题",
          start_date: "2022-03-01",
          end_date: "2024-02-29",
          notes: "占位备注:示例校级重点项目,已通过结题验收。",
        },
      ])
      .returning()
      .all();

    const projectIdByTitle = new Map(
      insertedProjects.map((p) => [p.title, p.id] as const)
    );
    const projectId = (title: string): number => {
      const id = projectIdByTitle.get(title);
      if (id === undefined) throw new Error(`缺少项目:${title}`);
      return id;
    };

    const PROJECT_FINISHING = "示例项目:研究主题一的应用路径研究"; // 结题中
    const PROJECT_FINISHED = "示例项目:某领域治理机制与对策"; // 已结题
    const PROJECT_APPROVED = "示例项目:研究主题二的地方实践与效果评估"; // 已立项

    // --- 投稿:为「投稿中」作品造多轮次轨迹 + 一条唯一的超期示例 ---
    tx.insert(schema.submissions)
      .values([
        {
          work_id: workId(SUBMITTING_WORK),
          journal: "示例期刊 A",
          round: 1,
          status: "退修",
          submitted_at: "2025-09-10",
          decided_at: "2025-11-28",
          review_notes: "占位审稿意见:建议补充实证数据并修改分析框架。",
        },
        {
          work_id: workId(SUBMITTING_WORK),
          journal: "示例期刊 B",
          round: 2,
          status: "在审",
          submitted_at: RECENT_DATE,
          decided_at: null,
          review_notes: null,
        },
        {
          work_id: workId(COMMENTARY_WORK),
          journal: "示例期刊 C",
          round: 1,
          status: "在审",
          submitted_at: OVERDUE_DATE,
          decided_at: null,
          review_notes: "占位备注:投稿后长期无回复,已超出预期审稿周期。",
        },
      ])
      .run();

    // --- 项目成果关联:把 已结题/结题中 项目关联到 已发表 作品 ---
    tx.insert(schema.project_outputs)
      .values([
        {
          project_id: projectId(PROJECT_FINISHING),
          work_id: workId(PUBLISHED_WORK_1),
        },
        {
          project_id: projectId(PROJECT_FINISHED),
          work_id: workId(PUBLISHED_WORK_2),
        },
      ])
      .run();

    // --- 实体标签:给 works 与 projects 都打标签 ---
    tx.insert(schema.entity_tags)
      .values([
        { entity_type: "work", entity_id: workId(PUBLISHED_WORK_1), tag_id: tagId("研究主题一") },
        { entity_type: "work", entity_id: workId(SUBMITTING_WORK), tag_id: tagId("研究主题二") },
        { entity_type: "work", entity_id: workId(COMMENTARY_WORK), tag_id: tagId("研究主题三") },
        { entity_type: "work", entity_id: workId(PUBLISHED_WORK_2), tag_id: tagId("案例研究") },
        { entity_type: "project", entity_id: projectId(PROJECT_FINISHING), tag_id: tagId("研究主题一") },
        { entity_type: "project", entity_id: projectId(PROJECT_APPROVED), tag_id: tagId("研究主题二") },
        { entity_type: "project", entity_id: projectId(PROJECT_FINISHED), tag_id: tagId("研究方法") },
      ])
      .run();
  });

  // --- 行数统计(事务提交后读取) ---
  const counts = {
    tags: db.select().from(schema.tags).all().length,
    works: db.select().from(schema.works).all().length,
    projects: db.select().from(schema.projects).all().length,
    submissions: db.select().from(schema.submissions).all().length,
    project_outputs: db.select().from(schema.project_outputs).all().length,
    entity_tags: db.select().from(schema.entity_tags).all().length,
  };

  console.log("Seed 完成,各表行数:");
  console.table(counts);
}

try {
  seed();
} catch (err) {
  console.error("Seed 失败:", err);
  sqlite.close();
  process.exit(1);
}
sqlite.close();
