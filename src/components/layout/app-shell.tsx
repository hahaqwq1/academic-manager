import type { ReactNode } from "react";

import { AppSidebar } from "./app-sidebar";
import { Topbar } from "./topbar";

// 应用外壳:左侧导航 + 顶栏 + 主内容区。
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        跳到主内容
      </a>
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
