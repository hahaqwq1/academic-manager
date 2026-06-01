# 学术资料管理系统 · 路线图

> 主功能已完整、测试全绿、已开源。本文件记录**后续「目前没用但值得上」的增量改进**,按性价比分批,**每批独立可单做**,沿用「一次一项、做完跑全绿再进下一项」的节奏。

## 现状(截至 2026-06-01)

- **主线 Phase 0→7**:脚手架 / 数据层 / 作品·项目·投稿·标签 CRUD / 看板 / 导出 / Docker —— 全部完成。
- **升级线 P0→P3**:正确性 · 体验打磨 · 测试+CI · JSON 导入恢复 · 投稿录用联动 · N+1 消除 · 抽公共 · 小加固 —— 全部完成。(P4 VPS 硬化已取消:本项目不上 VPS。)
- **资深建议线 Tier 0**:自动滚动备份+完整性自检 · 搜索 LIKE 转义 · 列级 enum 类型 —— 全部完成。
- **资深评阅线 Tier 1-0(数据正确性加固)**:`updateWork`/`updateProject` 查 `info.changes`→0 抛业务错并回滚(杜绝「编辑已删实体」写入孤儿标签)· create/update 四处 `tagIds` 去重 · 导入恢复 schema 补 `word_count ≥ 0` —— 已完成。
- 指标:**151 测试 / 17 文件全过**;`tsc --noEmit`、`eslint`、`next build` 均 0。

---

## 待办路线图

### Tier 1 — 数据完整性 & 正确性
| 项 | 做什么 | 关键文件 | 量 |
|---|---|---|---|
| **1-1 跨字段日期校验** | `zod superRefine`:`end_date ≥ start_date`、`decided_at ≥ submitted_at`,两端有值才校验,报友好中文错误(挂到对应字段) | `src/lib/validations.ts`(+ 单测) | 低 |
| **1-2 DB 级 CHECK 约束** | drizzle 表定义 `check()` 加枚举白名单 + `round ≥ 1` + `word_count ≥ 0`,`db:generate` 出新迁移;迁移测试补「非法值被 DB 拒」 | `src/db/schema.ts`、`drizzle/0002_*.sql`、`test/migration.test.ts` | 中 |
| **1-3 看板数据健康提示** | 「N 篇已标『已发表』但缺发表日期,未计入年度图」一行提示,可点击跳筛选(已发表口径按 status、年度图按 published_at,二者会差) | `src/db/queries/dashboard.ts`、`src/app/page.tsx`、`src/components/dashboard/*` | 低-中 |

### Tier 2 — 补 UI 测试空白(目前最大的真实缺口)
| 项 | 做什么 | 关键文件 | 量 |
|---|---|---|---|
| **2-1 组件测试** | 引入 `@testing-library/react` + `happy-dom`(组件测试文件用 `// @vitest-environment happy-dom`)。覆盖:`EntityList` 乐观删除/失败回滚、`EntityFilters` 防抖·清除筛选·陈旧 `?tag` 清除按钮、`work-submissions-manager` 录用后弹「标为已发表」toast 并触发 `markWorkPublished` | `test/components/*`、`package.json`、`vitest.config.ts` | 中 |

> 不建议上整套 Playwright E2E——对单机工具偏重;组件测试以更低成本覆盖同样的风险面。

### Tier 3 — 高手向 & 打磨
| 项 | 做什么 | 关键文件 | 量 |
|---|---|---|---|
| **3-1 全局 ⌘K 命令面板** | 用已装的 `cmdk`/`CommandDialog`(目前只用在成果挂接下拉):快速导航 6 个区 + 「新建作品/项目」+ 跳转搜索 | 新增 `command-palette.tsx`、挂到 `app-shell` | 中 |
| **3-2 列表页 error 边界** | `/works /projects /submissions /tags /export` 补 `error.tsx`(照现成 `works/[id]/error.tsx`),取数报错优雅降级而非冒到根边界 | `src/app/*/error.tsx` | 低 |
| **3-3 可达性快赢** | AppShell 顶部 skip-to-content;`globals.css` 加 `@media (prefers-reduced-motion)`;三张图加 `role="img"`+`aria-label`+sr-only 数据摘要 | `app-shell.tsx`、`globals.css`、`dashboard/charts.tsx` | 低 |
| **3-4 recharts 懒加载** | 看板图表改 `next/dynamic` 延迟加载,瘦首屏 JS(现为直接 import) | `src/app/page.tsx` | 低 |
| **3-5 /export 打印样式** | `@media print` 打印/导 PDF 友好(隐背景、留边框、A4) | `globals.css`、export 页 | 低 |

### Tier 4 — 仓库工程化(面向开源克隆者;单人可选)
| 项 | 做什么 | 量 |
|---|---|---|
| **4-1 Prettier + pre-commit** | `prettier` + `lint-staged` + husky `pre-commit`(提交前自动 `eslint --fix` + `prettier`) | 低 |
| **4-2 ESLint 增强** | `eslint-plugin-jsx-a11y`(无障碍静态检查)+ import 排序 | 低 |
| **4-3 tsconfig 收严** | 开 `noUncheckedIndexedAccess`(抓 `const [x] = …all()` 隐式 undefined)、`noUnusedLocals/Parameters`、`noImplicitReturns`,顺手修几十行 | 低-中 |
| **4-4 CI 小升级** | `actions/checkout@`、`setup-node@` v4→v5(消 Node20 弃用告警);lint/tsc 提到靠前;可选跑 `test:coverage` | 低 |

---

## 明确不做 / 降级(避免过度工程)

- **Drizzle `relations()` 重写查询**:现查询已 N+1-free 且测试覆盖,改它高 churn、低边际收益。
- **`notFound()→200` 尾巴**:父段 `loading.tsx` 流式 Suspense 致 `/works/999` 返 200 而非 404;单机本地无实害,最低优先。
- **安全响应头 / `swcMinify`**:`swcMinify` 在 Next 16 已移除;安全头对本地单机价值低;均不做。
- **Playwright 全套 E2E、覆盖率红线门禁、commitlint/约定式提交**:团队向重器,对单人项目过重(组件测试已覆盖核心风险)。
- **VPS 相关**(健康检查、镜像瘦身、反代鉴权):本项目不上 VPS,整批取消。

## 落地后统一验证

每条改完过四道门:`npx tsc --noEmit` + `npm run lint` + `npm test` + `npm run build` 全 0;新功能各自补测;必要时用**临时 `DATA_DIR`** 起 `next start` 冒烟。**纪律:绝不碰本地 `data/app.db`、绝不对本地实例跑 `npm run db:seed`。**
