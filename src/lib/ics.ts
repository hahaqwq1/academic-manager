// .ics(iCalendar / RFC 5545)序列化 —— v0.4
//
// 把截止提醒序列化为标准 VCALENDAR 文本(全天事件 VEVENT),供用户下载后拖进
// 系统日历(Apple/Google/Outlook),由日历负责到点提醒——单机本地工具没有常驻
// 后台进程,做不了主动推送,这是务实且零外部依赖的方案。
// 纯函数(无 DB / 网络)。行折叠(75 字节)略去:多数客户端容忍长行,且中文多字节
// 折叠易截断,故不折叠。
export interface IcsEvent {
  uid: string;
  date: string; // YYYY-MM-DD,全天事件
  summary: string;
  description?: string;
}

// 转义 RFC5545 TEXT 值:反斜杠 / 分号 / 逗号 / 换行。
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function toDateValue(date: string): string {
  return date.replace(/-/g, "");
}

export function buildIcs(
  events: IcsEvent[],
  opts: { calName?: string } = {},
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//academic-manager//deadlines//CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  if (opts.calName) lines.push(`X-WR-CALNAME:${escapeText(opts.calName)}`);
  for (const e of events) {
    const d = toDateValue(e.date);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.uid}`);
    // DATE 值的全天事件:DTEND 省略,RFC 默认时长为一天。DTSTAMP 取事件日零时(保证确定性)。
    lines.push(`DTSTAMP:${d}T000000Z`);
    lines.push(`DTSTART;VALUE=DATE:${d}`);
    lines.push(`SUMMARY:${escapeText(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
