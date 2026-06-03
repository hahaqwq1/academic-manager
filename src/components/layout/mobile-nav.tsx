"use client";

import { useState } from "react";

import { GraduationCap, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { APP_NAME } from "./nav";
import { SidebarNav } from "./sidebar-nav";

// 窄屏导航:汉堡按钮唤出左侧抽屉,点击导航项后自动关闭。
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="打开导航"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">主导航</SheetTitle>
        <div className="flex h-14 items-center gap-2 px-5">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            {APP_NAME}
          </span>
        </div>
        <nav className="px-3 py-2">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
