# 学术资料管理系统 · Academic Manager

一个**本地优先**的个人学术资料管理系统:管理论文 / 评论 / 草稿等**作品**、科研**项目**、**投稿轮次**、**标签**,并提供数据**看板**与**导出 / 备份恢复**。单人使用,数据全部存在本地 SQLite,可随时打包迁移到自有 VPS。

> 演示数据均为虚构占位示例(`src/db/seed.ts`),不含任何真实个人信息。

## ✨ 功能

- **作品管理**:论文 / 评论 / 草稿 / 其他成果的增删改查,按类型 / 状态 / 标签筛选 + 标题/摘要搜索 + 分页。
- **项目管理**:科研项目 CRUD,挂接产出成果(项目 ↔ 作品多对多)。
- **投稿追踪**:每个作品的多轮投稿记录(期刊 / 轮次 / 状态 / 投稿与决定日期);全局「在投」视图,超期(>90 天在审)高亮提醒。
- **标签**:多对多打标签(作品与项目通用),按主题浏览,标签管理与重命名。
- **数据看板**:年度发表数、主题分布、各刊平均审稿周期、当前在投、结题提醒等(Recharts)。
- **导出与备份**:成果清单(按年 / 类型 × Markdown / 纯文本,可复制)、项目结题成果清单、**整库 JSON 备份导出与一键恢复**(带结构 / 引用完整性校验 + 二次确认)。

## 🧱 技术栈

- **Next.js 16**(App Router)+ **React 19** + **TypeScript**(strict)
- **Tailwind CSS v4** + **shadcn/ui**(Radix)+ **lucide** 图标 + next-themes
- **Drizzle ORM** + **better-sqlite3**(同步驱动,Windows 有预编译二进制)
- **Recharts** 图表;**zod** 校验;**Vitest** 测试

## 🚀 快速开始

前置:Node.js ≥ 20。

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量(仅一个:数据目录,默认 ./data)
cp .env.example .env.local

# 3. 建库(应用迁移)
npm run db:migrate

# 4. (可选)灌入示例演示数据
npm run db:seed

# 5. 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可使用。

## 📜 脚本

| 命令 | 说明 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run build` / `npm start` | 生产构建 / 启动 |
| `npm run lint` | ESLint |
| `npm test` | Vitest(单元 + 集成测试) |
| `npm run test:coverage` | 测试覆盖率 |
| `npm run db:generate` | 由 schema 生成迁移 |
| `npm run db:migrate` | 应用迁移 |
| `npm run db:seed` | 灌入示例数据 |
| `npm run db:studio` | Drizzle Studio |

## 🧪 测试

测试用真实迁移在内存 SQLite 上跑(绕开 `server-only`),覆盖查询层筛选 / 分页 / 聚合、zod 校验边界(含日历日期)、Server Action 的 CRUD 副作用与事务回滚、整库导入恢复等。

```bash
npm test
```

## 📦 数据与备份

- 数据库为单文件 SQLite,路径由 `DATA_DIR` 决定(默认 `./data/app.db`),**已在 `.gitignore` 中忽略**。
- 一级备份:直接复制 `data/` 目录。
- 二级备份:应用内「导出」页可下载整库 JSON,并支持**一键恢复回灌**(覆盖前二次确认)。

## ☁️ 部署

附带多阶段 `Dockerfile`,部署到自有 VPS 的说明见 [`DEPLOY.md`](./DEPLOY.md)。设计蓝本见 [`PROJECT_SPEC.md`](./PROJECT_SPEC.md)。

## 📄 许可证

[MIT](./LICENSE)
