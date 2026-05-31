// Vitest 配置 —— P2-7 测试 + CI
//
// - environment: node —— 纯后端逻辑(查询/校验/server action),不需要 jsdom。
// - alias `@` → src/:vitest 不读 tsconfig paths,需在此显式映射,与 tsconfig.json 一致。
// - pool: forks —— better-sqlite3 是原生模块,用子进程池比 worker_threads 更稳。
// - include 仅匹配 test/ 下的 *.test.ts;helpers/fixtures 不以 .test.ts 结尾,不会被当测试收集。
import { fileURLToPath } from "node:url";
import path from "node:path";

import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    pool: "forks",
    // 固定时区,让「本地零点」的日期解析与超期/审稿周期天数计算跨机器确定
    //(CI 多为 UTC;本地若非 UTC,日期边界会漂)。
    env: { TZ: "UTC" },
    coverage: {
      provider: "v8",
      include: ["src/db/queries/**", "src/lib/**"],
      reporter: ["text", "html"],
    },
  },
});
