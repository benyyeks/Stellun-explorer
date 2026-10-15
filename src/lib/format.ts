// Client-safe formatting helpers ported from the original STELLUN
// format-utils.js. Used across every page for consistent number, date,
// distance, and light-travel-time formatting.

export function fmtNum(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "--";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function fmtKm(km: number | null | undefined, digits = 0): string {
  return `${fmtNum(km, digits)} km`;
}

export function fmtAU(au: number | null | undefined, digits = 3): string {
  return `${fmtNum(au, digits)} AU`;
}

export function lightTimeFromKm(km: number): string {
  const seconds = (km * 1000) / 299792458;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  const hours = seconds / 3600;
  if (hours < 48) return `${hours.toFixed(2)} hr`;
  return `${(hours / 24).toFixed(2)} days`;
}

export function lightTimeFromAU(au: number): string {
  // 1 AU = 499.00478 light-seconds
  const seconds = au * 499.00478;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  const hours = seconds / 3600;
  if (hours < 48) return `${hours.toFixed(2)} hr`;
  return `${(hours / 24).toFixed(2)} days`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function utcClock(date: Date): string {
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`;
}

export function utcDateStr(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// Light sanitization for third-party text we render: strip angle brackets
// and clamp length. React escapes the rest, so this is belt-and-suspenders.
export function safeText(str: unknown, maxLen = 240): string {
  if (typeof str !== "string") return "";
  return str.replace(/[<>]/g, "").slice(0, maxLen).trim();
}

// Some syndicated summaries, especially the weekly reports, arrive with
// Markdown markup in them. Cards show plain prose, so the markup is removed
// before the text is trimmed to length.
export function plainText(str: unknown, maxLen = 240): string {
  if (typeof str !== "string") return "";
  const cleaned = str
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^\s{0,3}(?:[-*_]\s*){3,}$/gm, " ")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ");
  return safeText(cleaned, maxLen);
}
