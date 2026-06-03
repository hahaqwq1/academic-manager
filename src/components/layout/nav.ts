import {
  Download,
  FileText,
  FolderKanban,
  HeartPulse,
  LayoutDashboard,
  Send,
  Tags,
  type LucideIcon,
} from "lucide-react";

export const APP_NAME = "学术资料库";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// 与设计规格第六节页面结构一致的主导航。
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "看板", icon: LayoutDashboard },
  { href: "/works", label: "作品", icon: FileText },
  { href: "/projects", label: "项目", icon: FolderKanban },
  { href: "/submissions", label: "在投", icon: Send },
  { href: "/tags", label: "标签", icon: Tags },
  { href: "/health", label: "体检", icon: HeartPulse },
  { href: "/export", label: "导出", icon: Download },
];
