// 项目列表加载骨架 —— 与 works/loading.tsx 同构(列表布局)。
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* PageHeader 占位 */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* 筛选器占位(搜索 + 级别 + 状态) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Skeleton className="h-8 w-full rounded-lg sm:w-64" />
        <Skeleton className="h-8 w-full rounded-lg sm:w-32" />
        <Skeleton className="h-8 w-full rounded-lg sm:w-32" />
      </div>

      {/* 列表行占位 */}
      <div className="divide-y divide-border overflow-hidden rounded-xl ring-1 ring-foreground/10">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 bg-card px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-5 w-12 rounded-4xl" />
                <Skeleton className="h-5 w-14 rounded-4xl" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="hidden shrink-0 items-center gap-1 sm:flex">
              <Skeleton className="h-7 w-14 rounded-lg" />
              <Skeleton className="h-7 w-14 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
