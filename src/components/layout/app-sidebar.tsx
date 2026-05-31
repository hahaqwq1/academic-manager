import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { APP_NAME } from "./nav";
import { SidebarNav } from "./sidebar-nav";

// 桌面端固定侧边栏(窄屏隐藏,改用 MobileNav 抽屉)。
export function AppSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-14 items-center px-5">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="size-4" />
          </span>
          <span className="text-sm tracking-tight">{APP_NAME}</span>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-2">
        <SidebarNav />
      </nav>
      <div className="px-5 py-3 text-xs text-muted-foreground">本地运行 · 单人使用</div>
    </aside>
  );
}
