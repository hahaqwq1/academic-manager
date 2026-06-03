// DOI 导入(Crossref)测试 —— 升级线(元数据 + 引用)
//
// mock 全局 fetch:验证字段映射 + 离线/404/超时/坏数据的优雅降级(永不抛)。
import { describe, it, expect, vi, afterEach } from "vitest";

import { importFromDoi } from "@/lib/actions/crossref";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(impl: (...args: unknown[]) => unknown) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("importFromDoi", () => {
  it("200:映射 标题/作者/期刊/日期/类型", async () => {
    stubFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        message: {
          title: ["A Study"],
          author: [{ given: "San", family: "Zhang" }, { name: "Li Si" }],
          "container-title": ["民族研究"],
          issued: { "date-parts": [[2024, 3, 1]] },
          type: "journal-article",
        },
      }),
    }));
    const r = await importFromDoi("10.1000/x");
    expect(r.ok).toBe(true);
    expect(r.data).toMatchObject({
      title: "A Study",
      authors: "San Zhang; Li Si",
      journal: "民族研究",
      published_at: "2024-03-01",
      type: "paper",
      doi: "10.1000/x",
    });
  });

  it("剥离 https://doi.org/ 前缀,仅年份补 -01-01,未知类型→other", async () => {
    const fn = stubFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        message: {
          title: ["T"],
          issued: { "date-parts": [[2020]] },
          type: "x",
        },
      }),
    }));
    const r = await importFromDoi("https://doi.org/10.5/y");
    expect(r.data?.doi).toBe("10.5/y");
    expect(r.data?.published_at).toBe("2020-01-01");
    expect(r.data?.type).toBe("other");
    expect(String(fn.mock.calls[0]?.[0])).toContain("10.5/y");
  });

  it("404 → 未找到", async () => {
    stubFetch(async () => ({ ok: false, status: 404 }));
    const r = await importFromDoi("10/x");
    expect(r.ok).toBe(false);
    expect(r.message).toContain("未找到");
  });

  it("网络抛错 → 离线提示(不抛)", async () => {
    stubFetch(async () => {
      throw new Error("network down");
    });
    const r = await importFromDoi("10/x");
    expect(r.ok).toBe(false);
    expect(r.message).toContain("无法连接");
  });

  it("坏 JSON(无 message)→ 数据异常", async () => {
    stubFetch(async () => ({ ok: true, status: 200, json: async () => ({}) }));
    const r = await importFromDoi("10/x");
    expect(r.ok).toBe(false);
    expect(r.message).toContain("数据异常");
  });

  it("空 DOI → 提示且不发请求", async () => {
    const fn = stubFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    }));
    const r = await importFromDoi("   ");
    expect(r.ok).toBe(false);
    expect(r.message).toContain("请输入");
    expect(fn).not.toHaveBeenCalled();
  });
});
