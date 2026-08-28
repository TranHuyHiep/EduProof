// Display formatting. Nothing here parses or validates — it only renders.

/** `30 June 2027`. Long month, so 06/07 is never ambiguous across locales. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** `30 June 2027, 14:05`. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${formatDate(iso)}, ${d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** `3 days ago`, `in 2 months`. Falls back to an absolute date past a year. */
export function formatRelative(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;

  const seconds = Math.round((then - now) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["minute", 60],
    ["hour", 3600],
    ["day", 86_400],
    ["month", 2_592_000],
  ];

  if (abs < 60) return "just now";
  for (const [unit, size] of units) {
    if (abs < size * (unit === "month" ? 12 : unit === "day" ? 30 : unit === "hour" ? 24 : 60)) {
      return rtf.format(Math.round(seconds / size), unit);
    }
  }
  return formatDate(iso);
}

/** True when the timestamp is in the past. */
export function isExpired(iso: string, now = Date.now()): boolean {
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && t < now;
}

/** `addr_demo1a3f…9c2b` */
export function shortenMiddle(value: string, head = 12, tail = 4): string {
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}
