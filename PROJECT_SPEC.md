# 个人学术资料管理系统 · 设计规格

> 本文档作为交给 Claude Code 的实现蓝本。放入项目根目录,命名为 `PROJECT_SPEC.md`,
> 然后对 Claude Code 说:「按这份 spec 实现,从 Phase 0 开始」。

---

## 一、目标

统一管理个人学术资料,包括但不限于:

- **论文**:在写的草稿、已完成、在投、已发表
- **项目/课题**:拟申报、申报中、已立项、结题中、已结题
- **理论评论 / 其他文稿**:报刊评论、推荐信、计划书等
- 三者之间的关联(尤其是「项目 ↔ 产出成果」),以及统一的搜索、标签、看板与导出

单人使用。**第一阶段本地运行,后续平滑迁移到 VPS。**

---

## 二、技术栈(已确定)

| 层 | 选型 | 说明 |
|---|---|---|
| 框架 | Next.js(App Router)+ TypeScript | 前后端一体,单代码库 |
| 数据库 | SQLite + Drizzle ORM(better-sqlite3) | 零配置,备份=复制一个文件 |
| UI | Tailwind CSS + shadcn/ui | 快速搭出干净界面 |
| 图表 | Recharts | 看板用 |
| 部署 | 本地 `npm run dev`;后续 Docker 化上 VPS | 见「架构原则」 |

---

## 三、架构原则(本地优先 / VPS 就绪)

为了将来迁移到 VPS 不返工,从一开始就遵守以下三条:

1. **数据目录用环境变量**:数据库路径读 `DATA_DIR`,本地默认 `./data/app.db`。
   上 VPS 时只需把 `DATA_DIR` 指向挂载卷,代码不动。
2. **文件关联用「路径/链接」字段,不存文件本体**:本地存文件绝对路径即可;
   字段设计上预留未来改为「上传到服务器存储」的空间(即把 `file_path` 当作可替换的引用,
   而非业务逻辑硬依赖本地磁盘)。
3. **单用户先不做登录**:上 VPS 时再在反向代理(Caddy/Nginx)后加一层 Basic Auth 或简单鉴权,
   应用内部不预设复杂的多用户权限模型。

备份策略:复制 `data/app.db` 一个文件即可。建议提供一个「导出全部数据为 JSON」的按钮作为二级备份。

---

## 四、数据模型(Schema)

采用「作品(writing)与项目分表 + 通用关联」的设计。

### 4.1 works —— 论文 / 评论 / 草稿 / 其他文稿

| 字段 | 类型 | 说明 |
|---|---|---|
| id | PK | |
| type | text | `paper` / `commentary` / `draft` / `other` |
| title | text | 标题 |
| status | text | 构思 / 写作中 / 已完成 / 投稿中 / 已发表 / 已搁置 |
| authors | text, null | 作者列表 |
| author_role | text, null | 第一作者 / 通讯作者 / 独著 / 参与 |
| word_count | int, null | 字数 |
| summary | text, null | 摘要 / 一句话主旨 |
| notes | text, null | 备注 |
| file_path | text, null | 关联本地文件路径(见架构原则 2) |
| created_at | datetime | |
| updated_at | datetime | |

### 4.2 projects —— 课题 / 项目

| 字段 | 类型 | 说明 |
|---|---|---|
| id | PK | |
| title | text | 项目名称 |
| level | text | 国家级 / 省部级 / 校级 / 其他 |
| role | text | 主持 / 参与 |
| grant_no | text, null | 立项编号 |
| funding | text, null | 经费 |
| status | text | 拟申报 / 申报中 / 已立项 / 结题中 / 已结题 / 未中 |
| start_date | date, null | |
| end_date | date, null | |
| notes | text, null | |
| created_at | datetime | |
| updated_at | datetime | |

### 4.3 submissions —— 投稿记录(属于某 work,支持多轮次)

| 字段 | 类型 | 说明 |
|---|---|---|
| id | PK | |
| work_id | FK → works | |
| journal | text | 目标期刊 |
| round | int | 轮次(1、2、3…) |
| status | text | 在审 / 退修 / 录用 / 被拒 / 已撤稿 |
| submitted_at | date | 投稿日期 |
| decided_at | date, null | 出结果日期 |
| review_notes | text, null | 审稿意见 / 周期备注 |

> 这张表是核心:一篇论文「投A刊→退修→改→转投B刊」的完整轨迹靠它留痕,
> 看板的「平均审稿周期」也从 `submitted_at` 与 `decided_at` 计算。

### 4.4 tags + entity_tags —— 主题标签(通用,多对多)

**tags**:`id`,`name`(如:新质生产力 / 铸牢中华民族共同体意识 / AI意识形态安全)

**entity_tags**:`id`,`entity_type`(`work` / `project`),`entity_id`,`tag_id`
> 用一张通用关联表,让作品和项目都能打同一套标签,跨类型按方向检索。

### 4.5 project_outputs —— 项目 ↔ 成果关联(多对多)

`id`,`project_id` FK,`work_id` FK
> 项目结题需要列产出成果。选中一个项目即可一键拉出挂在它名下的所有作品。

---

## 五、功能模块(全量,含看板)

### 5.1 作品管理
- 列表(可按类型 / 状态 / 标签筛选,关键词搜索标题与摘要)
- 详情 / 新建 / 编辑 / 删除
- 在详情页内管理该作品的投稿记录(增加轮次、更新状态)
- 关联本地文件路径

### 5.2 项目管理
- 列表 + 详情 + 增删改
- 在详情页挂接 / 取消挂接成果(project_outputs)
- 显示该项目已关联的全部作品

### 5.3 投稿全局视图
- 一个「在投中」页面,汇总所有 status=投稿中 的作品及其最新一轮投稿状态
- 高亮**超期未决**(投稿后超过设定天数仍无结果)

### 5.4 标签与搜索
- 按主题方向浏览全部成果(论文 + 项目混合)
- 全局关键词搜索

### 5.5 看板(Dashboard,首页)
- **年度发表数**:柱状图(按已发表作品的年份)
- **当前在投**:数量 + 各篇状态一览
- **各刊平均审稿周期**:从 submissions 计算
- **主题方向分布**:按标签的成果数饼图
- **待办提醒**:超期未决的投稿、临近结题的项目

### 5.6 导出(对填表 / 报项目省大事)
- **成果清单**:按年份 / 按类型生成,可直接复制
- **项目结题成果列表**:选一个项目 → 输出其挂接的全部成果,格式化为清单
- 起步格式:Markdown / 纯文本可复制;后续可加导出 docx

---

## 六、页面结构

```
/                  看板(Dashboard)
/works             作品列表
/works/[id]        作品详情(含投稿记录)
/works/new
/projects          项目列表
/projects/[id]     项目详情(含成果挂接)
/projects/new
/submissions       在投全局视图
/tags              按主题浏览
/export            导出
```

---

## 七、实施分阶段任务(给 Claude Code 的执行顺序)

- **Phase 0 — 脚手架**:初始化 Next.js(App Router, TS)+ Tailwind + shadcn/ui;
  接入 Drizzle + better-sqlite3;`DATA_DIR` 环境变量;基础布局与导航。
- **Phase 1 — 数据层**:按第四节建表 + 迁移脚本 + 少量示例 seed 数据。
- **Phase 2 — 作品 CRUD**:列表 / 详情 / 新建 / 编辑 / 删除 + 筛选搜索。
- **Phase 3 — 项目 CRUD + 成果挂接**:含 project_outputs 的增删。
- **Phase 4 — 投稿与标签**:submissions 多轮次管理 + tags/entity_tags + 在投全局视图。
- **Phase 5 — 看板**:Recharts 实现五个组件。
- **Phase 6 — 导出**:成果清单 + 项目结题成果列表(Markdown/纯文本)。
- **Phase 7 — Docker 化**:写 Dockerfile,数据卷挂载,为上 VPS 备好(可暂缓)。

每个 Phase 跑通后再进下一个,便于增量验收。

---

## 八、已知注意点

1. **中文搜索**:起步用 SQLite `LIKE '%关键词%'` 即可满足单人语料量;
   若日后要精确全文检索再考虑 FTS5 + 中文分词(配置较繁,初期不上)。
2. **文件关联**:本地阶段存绝对路径;迁移到 VPS 后本地路径会失效,
   届时把 `file_path` 改为指向服务器存储 / 上传即可——所以现在别把业务逻辑硬绑死本地磁盘。
3. **时区与日期**:统一用 ISO 日期存储,显示层再格式化。
4. **数据安全**:本地无需登录;上 VPS 后务必在反代层加鉴权,别裸奔公网。
