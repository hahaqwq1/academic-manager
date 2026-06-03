// Vitest 配置 —— P2-7 测试 + CI;升级线新增组件测试 project
//
// 拆成两个 project,一条 `vitest run` 同时跑:
//   - node:既有后端逻辑(查询/校验/server action/迁移/DB CHECK)。environment=node、pool=forks
//     (better-sqlite3 是原生模块,子进程池比 worker_threads 更稳)、TZ=UTC 固定日期边界。
//     只收 *.test.ts(不含 .tsx),行为与重构前完全一致。
//   - dom:React 组件测试。environment=happy-dom、@vitejs/plugin-react 转 JSX/TSX、
//     setupFiles 装 jest-dom 匹配器并给 Radix 补几个 happy-dom 缺失的 DOM API。只收 *.test.tsx。
// alias `@` → src/ 需在每个 project 各自声明(project 不自动继承根 resolve)。
import { fileURLToPath } from "node:url";
import path from "node:path";

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL(".", import.meta.url));
const alias = { "@": path.resolve(root, "src") };

export default defineConfig({
  test: {
    // 覆盖率在根级聚合两个 project。
    coverage: {
      provider: "v8",
      include: ["src/db/queries/**", "src/lib/**"],
      reporter: ["text", "html"],
    },
    projects: [
      {
        resolve: { alias },
        test: {
          name: "node",
          environment: "node",
          include: ["test/**/*.test.ts"],
          pool: "forks",
          // 固定时区,让「本地零点」的日期解析与超期/审稿周期天数计算跨机器确定。
          env: { TZ: "UTC" },
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "dom",
          environment: "happy-dom",
          include: ["test/**/*.test.tsx"],
          setupFiles: ["./test/helpers/setup-dom.ts"],
        },
      },
    ],
  },
});
