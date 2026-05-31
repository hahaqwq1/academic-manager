// 标签页加载骨架 —— 头部 + 新建输入 + 若干标签行。
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-full rounded-lg sm:w-64" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-xl ring-1 ring-foreground/10">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 bg-card px-4 py-3">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-28 rounded-4xl" />
            <div className="ml-auto flex gap-1">
              <Skeleton className="h-7 w-16 rounded-lg" />
              <Skeleton className="h-7 w-14 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
