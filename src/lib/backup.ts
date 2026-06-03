// 启动备份 + 完整性自检 —— 升级线 0-1
//
// 由 src/instrumentation.ts 的 register() 在服务器启动时调用一次(仅 nodejs runtime)。
// 设计针对本项目曾发生过的 SQLITE_CORRUPT 事故:
//   ① 先做完整性自检 —— 库已损坏则「告警 + 跳过备份」,绝不用坏快照覆盖既有良好备份;
//   ② 当天已备份则按日节流跳过;
//   ③ 用 better-sqlite3 的在线 .backup()(WAL 安全)生成单文件快照;
//   ④ 滚动保留最近 KEEP 份,删旧。
// 任何异常都被吞掉并降级为告警 —— 备份绝不能拖垮应用启动。
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

import { DATA_DIR, sqlite } from "@/db";

// 保留最近多少份每日备份。
const KEEP = 14;
const PREFIX = "app-";
const SUFFIX = ".db";

// 从现有文件名里挑出应删除的备份:仅认 `app-YYYY-MM-DD.db`,按文件名(即日期)升序,
// 保留最近 keep 份、删更早的。纯函数,便于单测。
export function pickBackupsToDelete(files: string[], keep: number): string[] {
  const backups = files
    .filter((f) => f.startsWith(PREFIX) && f.endsWith(SUFFIX))
    .sort(); // app-YYYY-MM-DD.db 的字典序即时间序
  return backups.length <= keep ? [] : backups.slice(0, backups.length - keep);
}

// 今天的本地日期串 YYYY-MM-DD。
function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 启动备份主流程。绝不抛出。
export async function runStartupBackup(): Promise<void> {
  try {
    // ① 完整性自检。坏库则告警并跳过备份(避免覆盖好备份)。
    const integrity = sqlite.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") {
      console.warn(
        `[backup] ⚠️ 数据库完整性自检未通过:${String(integrity)}。已跳过本次备份,以免用损坏快照覆盖既有良好备份。请尽快从 ${path.join(DATA_DIR, "backups")} 下最近一份恢复。`,
      );
      return;
    }

    const backupDir = path.join(DATA_DIR, "backups");
    if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

    // ② 当天已备份则按日节流跳过。
    const dest = path.join(backupDir, `${PREFIX}${today()}${SUFFIX}`);
    if (existsSync(dest)) return;

    // ③ 在线备份(WAL 安全,产出单一致文件)。
    await sqlite.backup(dest);

    // ④ 滚动清理旧备份。
    for (const f of pickBackupsToDelete(readdirSync(backupDir), KEEP)) {
      try {
        rmSync(path.join(backupDir, f));
      } catch {
        // 删旧失败不致命,忽略。
      }
    }
    console.log(
      `[backup] 已生成每日备份 ${path.basename(dest)}(保留最近 ${KEEP} 份)。`,
    );
  } catch (error) {
    console.warn(
      `[backup] 备份失败(不影响应用运行):${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
