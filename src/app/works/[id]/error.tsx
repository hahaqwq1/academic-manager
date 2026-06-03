"use client";

import { RouteError } from "@/components/common/route-error";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      title="加载作品详情时出错"
      description="请重试;若持续出错,可返回作品列表。"
      backHref="/works"
      backLabel="返回作品列表"
    />
  );
}
