"use client";

import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MobileNav } from "./mobile-nav";
import { NAV_ITEMS } from "./nav";

function useCurrentTitle(): string {
  const pathname = usePathname();
  const match = NAV_ITEMS.find((item) =>
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.label ?? "";
}

export function Topbar() {
  const title = useCurrentTitle();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <MobileNav />
      <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  );
}
