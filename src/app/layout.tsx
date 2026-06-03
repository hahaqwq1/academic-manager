import type { Metadata } from "next";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

// 字体自托管:用 geist 包(内部 next/font/local + 内置字体文件),
// 替代 next/font/google —— 消除 build 期向 Google Fonts 联网,保证离线首启 build 可靠。
// 变量名:GeistSans → --font-geist-sans,GeistMono → --font-geist-mono(见 globals.css 映射)。

export const metadata: Metadata = {
  title: {
    default: "学术资料库 · 个人学术资料管理",
    template: "%s · 学术资料库",
  },
  description:
    "统一管理论文、项目与文稿,以及它们之间的关联、投稿轨迹、主题标签与成果导出。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-svh antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppShell>{children}</AppShell>
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
