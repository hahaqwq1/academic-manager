"use client";

// 作品详情错误边界:展示友好错误态,提供重试与返回列表。
import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

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
      <h3 className="mt-4 text-sm font-semibold text-foreground">
        加载作品详情时出错
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        请重试;若持续出错,可返回作品列表。
      </p>
      <div className="mt-5 flex items-center gap-2">
        <Button onClick={reset} variant="outline" size="sm">
          重试
        </Button>
        <Button asChild size="sm">
          <Link href="/works">返回作品列表</Link>
        </Button>
      </div>
    </div>
  );
}
