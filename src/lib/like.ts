// LIKE 通配符转义 —— 升级线 0-2
//
// SQLite 的 LIKE 把 % 和 _ 当通配符。直接把用户关键词拼进 `%kw%` 会让「搜 100% / a_b」
// 被误当通配符匹配(% 匹配任意串、_ 匹配任意单字符),返回超出预期的结果。
// 此处转义 \ % _ 三个字符,并配合 LIKE ... ESCAPE '\',使它们按字面量匹配。
import { sql, type Column } from "drizzle-orm";

// 转义 LIKE 元字符:`\` `%` `_` 各前置一个反斜杠(单次扫描,插入的反斜杠不会被重复转义)。
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

// 构造「column LIKE %关键词%(字面量)」条件;关键词中的通配符按字面量处理。
// keyword 由调用方 trim;column 由 sql 模板内联,keyword 作为绑定参数。
export function likeContains(column: Column, keyword: string) {
  return sql`${column} like ${`%${escapeLike(keyword)}%`} escape '\\'`;
}
