"use server";

// DOI 元数据导入 —— 升级线(元数据 + 引用)
//
// 粘 DOI → 查 Crossref(免费、无需鉴权)→ 映射为作品字段供表单预填(不自动保存)。
// 本应用首个外部依赖:**永不抛**,离线/404/超时/坏数据各返回 {ok:false,message},表单照常手填。
import type { WorkType } from "@/lib/constants";

export interface DoiImportData {
  title: string;
  authors: string | null;
  journal: string | null;
  published_at: string | null; // YYYY-MM-DD(月/日缺省补 01)
  type: WorkType;
  doi: string;
}

export interface DoiImportResult {
  ok: boolean;
  message?: string;
  data?: DoiImportData;
}

// Crossref 字段多为数组,取首个非空字符串。
function firstString(x: unknown): string | null {
  if (Array.isArray(x) && x.length > 0 && typeof x[0] === "string") {
    const s = x[0].trim();
    return s.length > 0 ? s : null;
  }
  return null;
}

// author[]:{given,family} 或 {name} → "名 姓; …"。
function joinAuthors(x: unknown): string | null {
  if (!Array.isArray(x)) return null;
  const names: string[] = [];
  for (const a of x) {
    if (a && typeof a === "object") {
      const o = a as Record<string, unknown>;
      const given = typeof o.given === "string" ? o.given : "";
      const family = typeof o.family === "string" ? o.family : "";
      const name = typeof o.name === "string" ? o.name : "";
      const full = (`${given} ${family}`.trim() || name).trim();
      if (full) names.push(full);
    }
  }
  return names.length > 0 ? names.join("; ") : null;
}

// issued.date-parts[[y,m,d]] → YYYY-MM-DD(缺月/日补 01,保证过表单日期校验)。
function dateFromIssued(issued: unknown): string | null {
  if (!issued || typeof issued !== "object") return null;
  const dp = (issued as Record<string, unknown>)["date-parts"];
  if (!Array.isArray(dp) || !Array.isArray(dp[0])) return null;
  const part = dp[0] as unknown[];
  const y = part[0];
  if (typeof y !== "number") return null;
  const m = typeof part[1] === "number" ? part[1] : 1;
  const d = typeof part[2] === "number" ? part[2] : 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}`;
}

function guessType(t: unknown): WorkType {
  if (t === "journal-article" || t === "proceedings-article") return "paper";
  if (t === "posted-content") return "draft";
  return "other";
}

function mapCrossref(
  m: Record<string, unknown>,
  doi: string,
): DoiImportData | null {
  const title = firstString(m.title);
  if (!title) return null;
  return {
    title,
    authors: joinAuthors(m.author),
    journal: firstString(m["container-title"]),
    published_at: dateFromIssued(m.issued),
    type: guessType(m.type),
    doi,
  };
}

export async function importFromDoi(rawDoi: string): Promise<DoiImportResult> {
  const doi = rawDoi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  if (!doi) return { ok: false, message: "请输入 DOI" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    // DOI 含斜杠是其路径结构(Crossref 期望字面斜杠);按段编码,既保留 `/` 又转义段内特殊字符。
    const encodedDoi = doi.split("/").map(encodeURIComponent).join("/");
    const res = await fetch(`https://api.crossref.org/works/${encodedDoi}`, {
      headers: {
        "User-Agent":
          "academic-manager/0.1 (https://github.com/hahaqwq1/academic-manager)",
      },
      signal: controller.signal,
    });
    if (res.status === 404) return { ok: false, message: "未找到该 DOI" };
    if (!res.ok) {
      return { ok: false, message: `Crossref 返回 ${res.status},请稍后再试` };
    }
    const json: unknown = await res.json();
    const message =
      json && typeof json === "object"
        ? (json as Record<string, unknown>).message
        : null;
    if (!message || typeof message !== "object") {
      return { ok: false, message: "Crossref 返回数据异常" };
    }
    const data = mapCrossref(message as Record<string, unknown>, doi);
    if (!data) return { ok: false, message: "返回数据缺少标题,请手动填写" };
    return { ok: true, data };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, message: "查询超时,请检查网络或手动填写" };
    }
    return { ok: false, message: "无法连接 Crossref(可能离线),请手动填写" };
  } finally {
    clearTimeout(timer);
  }
}
