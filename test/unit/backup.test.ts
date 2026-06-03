// 备份滚动清理单测 —— 升级线 0-1
//
// 只测纯函数 pickBackupsToDelete 的「保留最近 N 份、删更早、忽略非备份文件」逻辑。
// backup.ts 顶部 `import { sqlite } from "@/db"`(server-only)在 vitest 下会抛,故沿用
// 既有模式 mock 掉 @/db(本测试不触达 sqlite,只用纯函数)。
import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({ sqlite: {}, DATA_DIR: "./data" }));

import { pickBackupsToDelete } from "@/lib/backup";

describe("pickBackupsToDelete", () => {
  it("份数 <= keep 时不删", () => {
    expect(
      pickBackupsToDelete(["app-2026-01-01.db", "app-2026-01-02.db"], 14),
    ).toEqual([]);
  });

  it("超出 keep 时删最旧的(按日期升序,乱序输入也成立)", () => {
    const files = [
      "app-2026-01-03.db",
      "app-2026-01-01.db",
      "app-2026-01-02.db",
    ];
    expect(pickBackupsToDelete(files, 2)).toEqual(["app-2026-01-01.db"]);
    expect(pickBackupsToDelete(files, 1)).toEqual([
      "app-2026-01-01.db",
      "app-2026-01-02.db",
    ]);
  });

  it("忽略非备份文件(其它库文件 / 临时文件不计入也不删)", () => {
    const files = [
      "app-2026-01-01.db",
      "app.db",
      "readme.md",
      "app-2026-01-01.db-wal",
    ];
    // keep=0:只应删唯一的合规备份,app.db / wal / md 一律不动。
    expect(pickBackupsToDelete(files, 0)).toEqual(["app-2026-01-01.db"]);
  });
});
