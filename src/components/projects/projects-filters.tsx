"use client";

// 项目列表筛选器 —— Phase 3
//
// 与作品筛选器同构:筛选状态全部存放在 URL query。
// - q:搜索框(标题 / 备注 / 编号),约 300ms 防抖后写入 URL。
// - level / status / tag:Select(含「全部」项,ALL 哨兵规避 Radix 空字符串限制)。
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
import { PROJECT_LEVELS, PROJECT_STATUSES } from "@/lib/constants";

const ALL = "__all__";

interface ProjectsFiltersProps {
  allTags: Tag[];
}

export function ProjectsFilters({ allTags }: ProjectsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentQ = searchParams.get("q") ?? "";
  const currentLevel = searchParams.get("level") ?? "";
  const currentStatus = searchParams.get("status") ?? "";
  const currentTag = searchParams.get("tag") ?? "";

  const [keyword, setKeyword] = useState(currentQ);
  const [syncedQ, setSyncedQ] = useState(currentQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (currentQ !== syncedQ) {
    setSyncedQ(currentQ);
    setKeyword(currentQ);
  }

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
      params.delete("page");
      const queryString = params.toString();
      return queryString ? `${pathname}?${queryString}` : pathname;
    },
    [pathname, searchParams]
  );

  const setParam = useCallback(
    (key: string, value: string | null) => {
      router.replace(buildQuery({ [key]: value }), { scroll: false });
    },
    [buildQuery, router]
  );

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParam("q", value.trim() === "" ? null : value.trim());
    }, 300);
  };

  const clearKeyword = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setKeyword("");
    setParam("q", null);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const clearAll = () => {
    setKeyword("");
    router.replace(pathname, { scroll: false });
  };

  const hasFilters =
    currentQ !== "" ||
    currentLevel !== "" ||
    currentStatus !== "" ||
    currentTag !== "";

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={keyword}
          onChange={(e) => handleKeywordChange(e.target.value)}
          placeholder="搜索名称 / 备注 / 编号…"
          aria-label="搜索项目"
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

      {/* 级别筛选 */}
      <Select
        value={currentLevel === "" ? ALL : currentLevel}
        onValueChange={(value) => setParam("level", value === ALL ? null : value)}
      >
        <SelectTrigger className="w-full sm:w-32" aria-label="按级别筛选">
          <SelectValue placeholder="级别" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全部级别</SelectItem>
          {PROJECT_LEVELS.map((level) => (
            <SelectItem key={level} value={level}>
              {level}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 状态筛选 */}
      <Select
        value={currentStatus === "" ? ALL : currentStatus}
        onValueChange={(value) => setParam("status", value === ALL ? null : value)}
      >
        <SelectTrigger className="w-full sm:w-32" aria-label="按状态筛选">
          <SelectValue placeholder="状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全部状态</SelectItem>
          {PROJECT_STATUSES.map((status) => (
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
          onValueChange={(value) => setParam("tag", value === ALL ? null : value)}
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
