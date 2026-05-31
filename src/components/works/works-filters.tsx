"use client";

// 作品列表筛选器 —— Phase 2 [K]
//
// 把筛选状态全部存放在 URL query(便于分享 / 刷新保留 / 浏览器前进后退),
// 本组件不持有任何「业务」state,只持有搜索框的本地输入与防抖 timer。
// 任一筛选项变更:用 router.replace 更新 query —— 保留其它参数,并把 page 重置为 1。
// - q:搜索框,约 300ms 防抖后写入 URL。
// - type / status / tag:Select(含「全部」项,值用 ALL 哨兵以避免 Radix 空字符串限制)。
// - 存在任意筛选时显示「清除筛选」。
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tag } from "@/db/schema";
import {
  WORK_STATUSES,
  WORK_TYPES,
  WORK_TYPE_LABELS,
} from "@/lib/constants";

// Radix Select 不接受空字符串作为 value,用此哨兵表示「全部」。
const ALL = "__all__";

interface WorksFiltersProps {
  allTags: Tag[];
}

export function WorksFilters({ allTags }: WorksFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 当前 URL 上的筛选值。
  const currentQ = searchParams.get("q") ?? "";
  const currentType = searchParams.get("type") ?? "";
  const currentStatus = searchParams.get("status") ?? "";
  const currentTag = searchParams.get("tag") ?? "";

  // 搜索框本地输入(受控),与 URL 解耦以支持防抖。
  const [keyword, setKeyword] = useState(currentQ);
  // 记录上一次同步自 URL 的 q 值,用于在 URL 外部变更(清除筛选 / 浏览器后退)时
  // 于渲染期重置输入框 —— 这是 React 推荐的「渲染中调整 state」模式,优于 useEffect。
  const [syncedQ, setSyncedQ] = useState(currentQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (currentQ !== syncedQ) {
    setSyncedQ(currentQ);
    setKeyword(currentQ);
  }

  // 基于当前 query 计算新 URL:更新 / 删除某个参数,并把 page 重置为 1。
  const buildQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // 任一筛选变更都回到第 1 页。
      params.delete("page");
      const queryString = params.toString();
      return queryString ? `${pathname}?${queryString}` : pathname;
    },
    [pathname, searchParams]
  );

  // 立即更新某个参数到 URL。
  const setParam = useCallback(
    (key: string, value: string | null) => {
      router.replace(buildQuery({ [key]: value }), { scroll: false });
    },
    [buildQuery, router]
  );

  // 搜索框输入:本地受控 + 300ms 防抖后写入 URL。
  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParam("q", value.trim() === "" ? null : value.trim());
    }, 300);
  };

  // 仅清除搜索关键词(保留 type / status / tag 等其它筛选)。
  const clearKeyword = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setKeyword("");
    setParam("q", null);
  };

  // 卸载时清理 timer。
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // 清除全部筛选:回到干净的列表页。
  const clearAll = () => {
    setKeyword("");
    router.replace(pathname, { scroll: false });
  };

  // 是否存在任意筛选(用于决定「清除筛选」是否出现)。
  const hasFilters =
    currentQ !== "" ||
    currentType !== "" ||
    currentStatus !== "" ||
    currentTag !== "";

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {/* 关键词搜索:左侧放大镜图标,有输入时右侧显示仅清除关键词的 x */}
      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={keyword}
          onChange={(e) => handleKeywordChange(e.target.value)}
          placeholder="搜索标题或摘要…"
          aria-label="搜索作品"
          className="pl-8 [&::-webkit-search-cancel-button]:hidden"
        />
        {keyword !== "" ? (
          <button
            type="button"
            onClick={clearKeyword}
            aria-label="清除搜索"
            className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {/* 类型筛选 */}
      <Select
        value={currentType === "" ? ALL : currentType}
        onValueChange={(value) =>
          setParam("type", value === ALL ? null : value)
        }
      >
        <SelectTrigger className="w-full sm:w-32" aria-label="按类型筛选">
          <SelectValue placeholder="类型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全部类型</SelectItem>
          {WORK_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {WORK_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 状态筛选 */}
      <Select
        value={currentStatus === "" ? ALL : currentStatus}
        onValueChange={(value) =>
          setParam("status", value === ALL ? null : value)
        }
      >
        <SelectTrigger className="w-full sm:w-32" aria-label="按状态筛选">
          <SelectValue placeholder="状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全部状态</SelectItem>
          {WORK_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 标签筛选(无标签时不渲染) */}
      {allTags.length > 0 ? (
        <Select
          value={currentTag === "" ? ALL : currentTag}
          onValueChange={(value) =>
            setParam("tag", value === ALL ? null : value)
          }
        >
          <SelectTrigger className="w-full sm:w-36" aria-label="按标签筛选">
            <SelectValue placeholder="标签" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>全部标签</SelectItem>
            {allTags.map((tag) => (
              <SelectItem key={tag.id} value={String(tag.id)}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {/* 清除筛选 */}
      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-muted-foreground"
        >
          <X />
          清除筛选
        </Button>
      ) : null}
    </div>
  );
}
