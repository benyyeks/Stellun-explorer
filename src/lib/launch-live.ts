export type LaunchStream = {
  /** External https link (fallback). */
  url: string;
  /** YouTube embed URL when we can derive one; use this inside STELLUN. */
  embedUrl: string | null;
};

function youtubeEmbed(href: string): string | null {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "live" || parts[0] === "embed" || parts[0] === "watch") {
        const id2 = parts[1];
        if (id2) return `https://www.youtube.com/embed/${id2}?rel=0`;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Returns a stream only when webcast is live, or within 1 hour before NET.
 * Prefer YouTube embed so STELLUN can play in-page / fullscreen.
 */
export function launchStream(
  videos: unknown,
  net: string,
  nowMs: number,
  webcastLive = false,
): LaunchStream | null {
  const time = new Date(net).getTime();
  if (!Number.isFinite(time) || (!webcastLive && (time - nowMs > 60 * 60 * 1000 || time < nowMs))) {
    return null;
  }
  if (!Array.isArray(videos)) return null;

  const sorted = [...videos].sort(
    (a, b) => (a?.priority ?? 999) - (b?.priority ?? 999),
  );

  for (const video of sorted) {
    if (typeof video?.url !== "string") continue;
    try {
      const url = new URL(video.url);
      if (url.protocol !== "https:") continue;
      const href = url.href;
      return { url: href, embedUrl: youtubeEmbed(href) };
    } catch {
      /* skip bad links */
    }
  }
  return null;
}

/** @deprecated Prefer launchStream(); kept so older call sites still compile. */
export function launchStreamUrl(
  videos: unknown,
  net: string,
  nowMs: number,
  webcastLive = false,
): string | null {
  return launchStream(videos, net, nowMs, webcastLive)?.url ?? null;
}
