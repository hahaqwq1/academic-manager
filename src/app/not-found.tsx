import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
        页面未找到
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        你访问的页面不存在或已被移动。
      </p>
      <Button asChild variant="outline" size="sm" className="mt-6">
        <Link href="/">返回看板</Link>
      </Button>
    </div>
  );
}
