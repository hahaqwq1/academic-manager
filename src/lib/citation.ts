// 学术引用格式化 —— 升级线(元数据 + 引用)
//
// 纯函数,不碰 DB:把一条作品(journal 已在查询层解析好)格式化为 APA / GB-T 7714 / BibTeX。
// 中英文姓名不强拆姓/名(APA 近似),够用于考核/CV 的发表清单;卷/期/页缺省(本应用不存)。
import type { WorkType } from "@/lib/constants";

export interface CitationWork {
  title: string;
  authors: string | null;
  journal: string | null;
  published_at: string | null; // YYYY-MM-DD 或 YYYY
  doi: string | null;
  type: WorkType;
}

// 作者串切分:支持 ; , 、 ,(中英文分隔符)。
function parseAuthors(authors: string | null): string[] {
  if (!authors) return [];
  return authors
    .split(/[;,、，]/)
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
}

// 取年份:从 YYYY-MM-DD 或 YYYY 截前 4 位。
function yearOf(published_at: string | null): string | null {
  if (!published_at) return null;
  const m = /^(\d{4})/.exec(published_at.trim());
  return m ? m[1]! : null;
}

// APA 第 7 版(近似)。
export function toAPA(w: CitationWork): string {
  const authors = parseAuthors(w.authors);
  let authorStr = "";
  if (authors.length === 1) authorStr = authors[0]!;
  else if (authors.length === 2) authorStr = `${authors[0]} & ${authors[1]}`;
  else if (authors.length > 2)
    authorStr = `${authors.slice(0, -1).join(", ")}, & ${authors[authors.length - 1]}`;
  const y = yearOf(w.published_at);
  return [
    authorStr,
    y ? `(${y}).` : "",
    `${w.title}.`,
    w.journal ? `${w.journal}.` : "",
    w.doi ? `https://doi.org/${w.doi}` : "",
  ]
    .filter((p) => p !== "")
    .join(" ")
    .trim();
}

// GB/T 7714-2015 文献类型标识(简化:期刊→J,评论→N,其余→Z)。
const GB_TYPE: Record<WorkType, string> = {
  paper: "J",
  commentary: "N",
  draft: "Z",
  other: "Z",
};

// GB/T 7714-2015(期刊文章简化版,无卷/期/页)。
export function toGB7714(w: CitationWork): string {
  const authors = parseAuthors(w.authors).join(", ");
  const y = yearOf(w.published_at);
  let s = "";
  if (authors) s += `${authors}. `;
  s += `${w.title}[${GB_TYPE[w.type]}]`;
  if (w.journal) s += `. ${w.journal}`;
  if (y) s += `, ${y}`;
  s += ".";
  if (w.doi) s += ` DOI:${w.doi}.`;
  return s;
}

// BibTeX 引用键:首作者(去非字母数字)+ 年份。
function bibKey(w: CitationWork): string {
  const first = parseAuthors(w.authors)[0] ?? "anon";
  const y = yearOf(w.published_at) ?? "nd";
  const slug = first.replace(/[^\p{L}\p{N}]/gu, "");
  return `${slug || "anon"}${y}`;
}

export function toBibTeX(w: CitationWork): string {
  const entryType = w.type === "paper" ? "article" : "misc";
  const authors = parseAuthors(w.authors).join(" and ");
  const y = yearOf(w.published_at);
  const fields: string[] = [`  title = {${w.title}}`];
  if (authors) fields.push(`  author = {${authors}}`);
  if (w.journal) fields.push(`  journal = {${w.journal}}`);
  if (y) fields.push(`  year = {${y}}`);
  if (w.doi) fields.push(`  doi = {${w.doi}}`);
  return `@${entryType}{${bibKey(w)},\n${fields.join(",\n")}\n}`;
}
