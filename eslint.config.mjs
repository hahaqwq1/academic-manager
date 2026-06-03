import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 无障碍强化:在 next(core-web-vitals)已注册的 jsx-a11y 插件之上,启用其完整 recommended 规则集
  //(next 默认只开了子集)。只复用规则、不再次声明插件,避免 flat config 重复注册同名插件而报错。
  {
    files: ["**/*.{jsx,tsx}"],
    rules: { ...jsxA11y.flatConfigs.recommended.rules },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 测试覆盖率报告为生成产物,不参与 lint。
    "coverage/**",
  ]),
]);

export default eslintConfig;
