"use server";

// 用系统默认程序打开本机文件 / 在文件管理器中定位 —— v1.0(server action)
//
// 仅本机单人使用:校验路径存在后 spawn 平台命令(detached + unref,不阻塞)。
// 永不抛——返回 {ok,message} 交前端 toast。路径来自用户在作品里填的 file_path。
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

import { buildOpenCommand, type OpenMode } from "@/lib/open-command";

export interface OpenResult {
  ok: boolean;
  message: string;
}

export async function openLocalFile(
  filePath: string,
  mode: OpenMode = "open",
): Promise<OpenResult> {
  const p = filePath?.trim();
  if (!p) return { ok: false, message: "未设置文件路径" };
  if (!existsSync(p)) {
    return {
      ok: false,
      message: "文件不存在(路径可能已失效,或在另一台机器上)",
    };
  }
  try {
    const { cmd, args } = buildOpenCommand(process.platform, p, mode);
    const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
    child.unref();
    return {
      ok: true,
      message: mode === "reveal" ? "已在文件管理器中定位" : "已用默认程序打开",
    };
  } catch (e) {
    return {
      ok: false,
      message: `打开失败:${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
