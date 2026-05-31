import type { ReactNode } from "react";

import { AppSidebar } from "./app-sidebar";
import { Topbar } from "./topbar";

// 应用外壳:左侧导航 + 顶栏 + 主内容区。
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
