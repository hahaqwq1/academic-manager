"use client";

import { RouteError } from "@/components/common/route-error";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} title="加载数据体检时出错" />;
}
