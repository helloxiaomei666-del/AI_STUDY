const businessTimeZone = "Asia/Shanghai";

export function formatDate(date?: Date | string | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: businessTimeZone,
  }).format(new Date(date));
}

export function getCurrentMonthKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: businessTimeZone,
  }).format(date);
}

export function getCurrentDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: businessTimeZone,
  }).format(date);
}

export function dateOnlyFromKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function quotaPercent(used: number, quota: number) {
  if (quota <= 0) return 0;
  return Math.min(100, Math.round((used / quota) * 100));
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
