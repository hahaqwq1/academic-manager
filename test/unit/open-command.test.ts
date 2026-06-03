// 本机文件打开命令构造测试 —— v1.0
import { describe, expect, it } from "vitest";

import { buildOpenCommand } from "@/lib/open-command";

describe("buildOpenCommand", () => {
  it("win32:open 用 cmd start,reveal 用 explorer /select", () => {
    expect(buildOpenCommand("win32", "C:\\a\\b.pdf", "open")).toEqual({
      cmd: "cmd",
      args: ["/c", "start", "", "C:\\a\\b.pdf"],
    });
    expect(buildOpenCommand("win32", "C:\\a\\b.pdf", "reveal")).toEqual({
      cmd: "explorer",
      args: ["/select,C:\\a\\b.pdf"],
    });
  });

  it("darwin:open 文件 / open -R 定位", () => {
    expect(buildOpenCommand("darwin", "/Users/x/b.pdf", "open")).toEqual({
      cmd: "open",
      args: ["/Users/x/b.pdf"],
    });
    expect(buildOpenCommand("darwin", "/Users/x/b.pdf", "reveal")).toEqual({
      cmd: "open",
      args: ["-R", "/Users/x/b.pdf"],
    });
  });

  it("linux:xdg-open 文件 / reveal 退而打开所在目录", () => {
    expect(buildOpenCommand("linux", "/home/x/b.pdf", "open")).toEqual({
      cmd: "xdg-open",
      args: ["/home/x/b.pdf"],
    });
    expect(buildOpenCommand("linux", "/home/x/b.pdf", "reveal")).toEqual({
      cmd: "xdg-open",
      args: ["/home/x"],
    });
  });
});
