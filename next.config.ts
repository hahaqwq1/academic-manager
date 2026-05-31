import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 是原生模块,排除出打包,只在服务端按需 require。
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
