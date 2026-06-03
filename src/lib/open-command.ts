// 本机文件「打开 / 在文件夹中显示」命令构造 —— v1.0
//
// 纯函数(不 spawn、不碰 fs):按平台返回 spawn 的 {cmd, args}。便于单测,
// 实际执行在 server action(src/lib/actions/open-file.ts)。用 args 数组而非拼 shell,
// 规避注入。仅本机单人使用——这是「本地优先」的天然红利(打开本机 PDF/Word)。
import { dirname } from "node:path";

export type OpenMode = "open" | "reveal";

export interface SpawnCommand {
  cmd: string;
  args: string[];
}

export function buildOpenCommand(
  platform: NodeJS.Platform,
  filePath: string,
  mode: OpenMode,
): SpawnCommand {
  if (platform === "win32") {
    // reveal:explorer /select 定位文件;open:cmd start(首个空串是 start 的窗口标题占位)。
    return mode === "reveal"
      ? { cmd: "explorer", args: [`/select,${filePath}`] }
      : { cmd: "cmd", args: ["/c", "start", "", filePath] };
  }
  if (platform === "darwin") {
    return mode === "reveal"
      ? { cmd: "open", args: ["-R", filePath] }
      : { cmd: "open", args: [filePath] };
  }
  // linux 及其它:xdg-open;reveal 退而打开文件所在目录。
  return mode === "reveal"
    ? { cmd: "xdg-open", args: [dirname(filePath)] }
    : { cmd: "xdg-open", args: [filePath] };
}
