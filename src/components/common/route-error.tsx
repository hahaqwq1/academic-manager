"use client";

// 路由级错误边界的共享 UI —— 升级线(体验层)
//
// 各路由的 error.tsx 是薄壳,把标题/返回链接传进来,复用同一套友好错误态(图标 + 重试 + 返回)。
// error.tsx 必须是 client 组件且默认导出,接收 Next 注入的 { error, reset }。
import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RouteError({
  error,
  reset,
  title,
  description = "请重试;若持续出错,可返回看板或刷新页面。",
  backHref = "/",
  backLabel = "返回看板",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      <div className="mt-5 flex items-center gap-2">
        <Button onClick={reset} variant="outline" size="sm">
          重试
        </Button>
        <Button asChild size="sm">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
