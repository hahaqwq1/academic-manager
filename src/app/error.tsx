"use client";

import { useEffect } from "react";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

// 全局错误边界:展示友好错误态并提供重试。
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">出错了</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        页面加载时发生错误,请重试。
      </p>
      <Button onClick={reset} variant="outline" size="sm" className="mt-5">
        重试
      </Button>
    </div>
  );
}
