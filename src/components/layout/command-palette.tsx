"use client";

// ⌘K 全局命令面板 —— 升级线(体验层)
//
// 在顶栏常驻挂载(layout 内,跨导航不卸载):一个搜索触发按钮 + 一个 cmdk 对话框。
// ⌘K / Ctrl+K 开合;打开时拉取轻量索引(getSearchIndex),交 cmdk 客户端模糊过滤。
// 提供:固定「跳转」(各导航项)、「新建」(作品/项目),以及动态「作品/项目/标签」搜索结果。
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import {
  FilePlus,
  FileText,
  FolderKanban,
  FolderPlus,
  Search,
  Tag,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { getSearchIndex, type SearchIndex } from "@/lib/actions/search";

import { NAV_ITEMS } from "./nav";

const EMPTY_INDEX: SearchIndex = { works: [], projects: [], tags: [] };

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<SearchIndex>(EMPTY_INDEX);
  // 平台相关快捷键提示(⌘ vs Ctrl)。useSyncExternalStore 读「仅客户端」值:
  // 服务端快照 false、客户端读 navigator,既避免水合不一致,也不在 effect 里 setState。
  const isMac = useSyncExternalStore(
    () => () => {},
    () => /mac/i.test(navigator.platform),
    () => false,
  );

  // ⌘K / Ctrl+K 开合。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // 每次打开都刷新索引(本地库轻量),失败回落空索引——只影响搜索,跳转/新建仍可用。
  useEffect(() => {
    if (!open) return;
    let alive = true;
    getSearchIndex()
      .then((idx) => {
        if (alive) setIndex(idx);
      })
      .catch(() => {
        if (alive) setIndex(EMPTY_INDEX);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="打开命令面板"
        className="flex h-8 items-center gap-2 rounded-lg border border-input bg-input/30 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-input/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">搜索…</span>
        <kbd className="hidden rounded border border-border bg-background px-1 font-sans text-[10px] tracking-wider text-muted-foreground sm:inline">
          {isMac ? "⌘" : "Ctrl"} K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="命令面板"
        description="快速跳转,或搜索作品 / 项目 / 标签"
      >
        <CommandInput placeholder="跳转或搜索作品 / 项目 / 标签…" />
        <CommandList>
          <CommandEmpty>无匹配项。</CommandEmpty>

          <CommandGroup heading="跳转">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={`跳转 ${item.label} ${item.href}`}
                  onSelect={() => go(item.href)}
                >
                  <Icon />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandGroup heading="新建">
            <CommandItem value="新建作品" onSelect={() => go("/works/new")}>
              <FilePlus />
              新建作品
            </CommandItem>
            <CommandItem value="新建项目" onSelect={() => go("/projects/new")}>
              <FolderPlus />
              新建项目
            </CommandItem>
          </CommandGroup>

          {index.works.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="作品">
                {index.works.map((w) => (
                  <CommandItem
                    key={`w-${w.id}`}
                    value={`作品 ${w.title}`}
                    onSelect={() => go(`/works/${w.id}`)}
                  >
                    <FileText />
                    <span className="truncate">{w.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {index.projects.length > 0 ? (
            <CommandGroup heading="项目">
              {index.projects.map((p) => (
                <CommandItem
                  key={`p-${p.id}`}
                  value={`项目 ${p.title}`}
                  onSelect={() => go(`/projects/${p.id}`)}
                >
                  <FolderKanban />
                  <span className="truncate">{p.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {index.tags.length > 0 ? (
            <CommandGroup heading="标签(跳到含该标签的作品)">
              {index.tags.map((t) => (
                <CommandItem
                  key={`t-${t.id}`}
                  value={`标签 ${t.name}`}
                  onSelect={() => go(`/works?tag=${t.id}`)}
                >
                  <Tag />
                  <span className="truncate">{t.name}</span>
                  <CommandShortcut>作品</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
