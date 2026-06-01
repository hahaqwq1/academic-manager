// Next 启动钩子(server 端,启动时执行一次)—— 升级线 0-1
//
// 仅在 nodejs runtime 下、用动态 import 加载备份模块:这样 better-sqlite3(原生模块)
// 绝不会被拉进 edge runtime 或构建期静态依赖图。register() 可 async,会在服务器开始
// 接收请求前完成。备份内部已自吞异常,不会阻断启动。
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runStartupBackup } = await import("@/lib/backup");
    await runStartupBackup();
  }
}
