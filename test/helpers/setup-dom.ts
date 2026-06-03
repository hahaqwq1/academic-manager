// 组件测试(dom project)的全局 setup —— 升级线
//
// ① 装 @testing-library/jest-dom 的自定义匹配器(toBeInTheDocument / toHaveAttribute 等)。
// ② 每个测试后 cleanup,卸载上一次 render 的 DOM,避免串扰。
// ③ 给 happy-dom 补几个 Radix UI 依赖、但 happy-dom 未实现的 DOM API,
//    否则渲染 Select / Dialog 等会因调用缺失方法而无关报错。
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
});

// --- Radix 需要、happy-dom 缺失的 DOM API 补桩(均为无副作用的安全桩)---
const proto = Element.prototype as unknown as Record<string, unknown>;
if (typeof proto.scrollIntoView !== "function") proto.scrollIntoView = () => {};
if (typeof proto.hasPointerCapture !== "function")
  proto.hasPointerCapture = () => false;
if (typeof proto.setPointerCapture !== "function")
  proto.setPointerCapture = () => {};
if (typeof proto.releasePointerCapture !== "function")
  proto.releasePointerCapture = () => {};

if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
}

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
