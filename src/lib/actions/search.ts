"use server";

// 命令面板搜索索引 —— 升级线(体验层)
//
// ⌘K 命令面板首次/每次打开时拉取的轻量索引:作品 / 项目 / 标签的 id + 标题(名称)。
// 字段刻意最小化(只够过滤与跳转),单人本地库数据量小,整表取出再交给 cmdk 客户端模糊过滤即可。
import { asc, desc } from "drizzle-orm";

import { db } from "@/db";
import { works, projects, tags } from "@/db/schema";

export interface SearchIndex {
  works: { id: number; title: string }[];
  projects: { id: number; title: string }[];
  tags: { id: number; name: string }[];
}

export async function getSearchIndex(): Promise<SearchIndex> {
  const w = db
    .select({ id: works.id, title: works.title })
    .from(works)
    .orderBy(desc(works.updated_at))
    .all();
  const p = db
    .select({ id: projects.id, title: projects.title })
    .from(projects)
    .orderBy(desc(projects.updated_at))
    .all();
  const t = db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .orderBy(asc(tags.name))
    .all();
  return { works: w, projects: p, tags: t };
}
