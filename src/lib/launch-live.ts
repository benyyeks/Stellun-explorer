export function launchStreamUrl(videos: unknown, net: string, nowMs: number, webcastLive = false): string | null {
  const time = new Date(net).getTime();
  if (!Number.isFinite(time) || (!webcastLive && (time - nowMs > 60 * 60 * 1000 || time < nowMs))) return null;
  if (!Array.isArray(videos)) return null;
  for (const video of [...videos].sort((a, b) => (a?.priority ?? 999) - (b?.priority ?? 999))) {
    if (typeof video?.url !== "string") continue;
    try {
      const url = new URL(video.url);
      if (url.protocol !== "https:") continue;
      return url.href;
    } catch { /* Invalid links are not shown. */ }
  }
  return null;
}