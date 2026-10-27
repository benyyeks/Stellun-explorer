// Server-only news refresh: SNAPI (includes NASA stories) + optional NASA RSS.
// Upserts into space_news via service-role client.

import type { Database } from "@/integrations/supabase/types";

const SNAPI_BASE = "https://api.spaceflightnewsapi.net/v4";

type ContentType = {
  endpoint: "articles" | "blogs" | "reports";
  contentType: "article" | "blog" | "report";
};
const CONTENT_TYPES: ContentType[] = [
  { endpoint: "articles", contentType: "article" },
  { endpoint: "blogs", contentType: "blog" },
  { endpoint: "reports", contentType: "report" },
];

type NewsRow = Database["public"]["Tables"]["space_news"]["Insert"];

async function fetchContentType({ endpoint, contentType }: ContentType): Promise<NewsRow[]> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  // Prefer NASA-heavy slice: pull more rows, then keep NASA first in ordering via published_at.
  const url = `${SNAPI_BASE}/${endpoint}/?limit=40&ordering=-published_at&published_at_gte=${encodeURIComponent(since)}`;
  const res = await fetch(url, { headers: { "User-Agent": "STELLUN-SpaceIntelligence/1.0" } });
  if (!res.ok) throw new Error(`SNAPI ${endpoint} responded HTTP ${res.status}`);
  const json = (await res.json()) as { results: Array<Record<string, unknown>> };
  const results = Array.isArray(json.results) ? json.results : [];
  return results.map((item) => ({
    id: Number(item["id"]),
    content_type: contentType,
    title: String(item["title"] ?? ""),
    summary: (item["summary"] as string | null) ?? null,
    url: String(item["url"] ?? ""),
    image_url: (item["image_url"] as string | null) ?? null,
    news_site: (item["news_site"] as string | null) ?? null,
    published_at: (item["published_at"] as string | null) ?? null,
    fetched_at: new Date().toISOString(),
  }));
}

/** Pull first image URL from an RSS item block (enclosure, media:*, or HTML img). */
function imageFromRssBlock(block: string): string | null {
  const candidates = [
    block.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1],
    block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1],
    block.match(/<enclosure[^>]+url=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/i)?.[1],
    block.match(/<enclosure[^>]+type=["']image\/[^"']*["'][^>]+url=["']([^"']+)["']/i)?.[1],
    block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image\//i)?.[1],
    block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1],
  ];
  for (const c of candidates) {
    if (!c) continue;
    const url = c.trim();
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
  }
  return null;
}

/** NASA Breaking News RSS → space_news rows (negative ids to avoid SNAPI collision). */
async function fetchNasaRss(): Promise<NewsRow[]> {
  try {
    const res = await fetch("https://www.nasa.gov/rss/dyn/breaking_news.rss", {
      headers: { "User-Agent": "STELLUN-SpaceIntelligence/1.0" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: NewsRow[] = [];
    const blocks = xml.split(/<item>/i).slice(1);
    let i = 0;
    for (const block of blocks.slice(0, 20)) {
      const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) ||
        block.match(/<title>(.*?)<\/title>/i))?.[1]?.trim();
      const link = (block.match(/<link>(.*?)<\/link>/i))?.[1]?.trim();
      const desc = (block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i) ||
        block.match(/<description>(.*?)<\/description>/i))?.[1]?.replace(/<[^>]+>/g, " ").trim();
      const pub = (block.match(/<pubDate>(.*?)<\/pubDate>/i))?.[1]?.trim();
      if (!title || !link) continue;
      i += 1;
      const id = -100000 - i;
      items.push({
        id,
        content_type: "article",
        title,
        summary: desc?.slice(0, 500) ?? null,
        url: link,
        image_url: imageFromRssBlock(block),
        news_site: "NASA",
        published_at: pub ? new Date(pub).toISOString() : new Date().toISOString(),
        fetched_at: new Date().toISOString(),
      });
    }
    return items;
  } catch {
    return [];
  }
}
export type RefreshResult = { ok: boolean; statusCode: number; message: string; count?: number };

export async function refreshNews(): Promise<RefreshResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const settled = await Promise.allSettled([
    ...CONTENT_TYPES.map(fetchContentType),
    fetchNasaRss(),
  ]);
  const rows = settled
    .filter((r): r is PromiseFulfilledResult<NewsRow[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
  const failures = settled
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));

if (rows.length === 0) {
    return {
      ok: false,
      statusCode: 502,
      message: `No news could be fetched this run. ${failures.join("; ")}`,
    };
  }

  // Prefer one row per headline (keeps first = usually newest in our merge order).
  const byTitle = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = (row.title ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!key) continue;
    const prev = byTitle.get(key);
    if (!prev) {
      byTitle.set(key, row);
      continue;
    }
    // Prefer the copy that has an image
    if (!prev.image_url && row.image_url) byTitle.set(key, row);
  }
  const uniqueRows = [...byTitle.values()];

  const { error } = await supabaseAdmin
    .from("space_news")
    .upsert(uniqueRows, { onConflict: "id" });

  const { error } = await supabaseAdmin.from("space_news").upsert(rows, { onConflict: "id" });
  if (error) {
    return { ok: false, statusCode: 500, message: `Database write failed: ${error.message}` };
  }

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 60);
  await supabaseAdmin.from("space_news").delete().lt("published_at", cutoff.toISOString());

  const nasaCount = rows.filter((r) => (r.news_site || "").toLowerCase().includes("nasa")).length;
  return {
    ok: true,
    statusCode: 200,
    message: `Upserted ${rows.length} news items (${nasaCount} NASA-tagged).${failures.length ? " Partial: " + failures.join("; ") : ""}`,
    count: rows.length,
  };
}
