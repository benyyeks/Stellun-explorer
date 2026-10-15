// Server-only news refresh: pulls the latest articles/blogs/reports from
// the Spaceflight News API (SNAPI) and upserts them into space_news via the
// service-role client (RLS bypassed for privileged writes). Ported from
// netlify/functions/_shared/news-refresh-core.js. Called by the daily cron
// route and by the manual refresh endpoint.

import type { Database } from "@/integrations/supabase/types";

const SNAPI_BASE = "https://api.spaceflightnewsapi.net/v4";

type ContentType = { endpoint: "articles" | "blogs" | "reports"; contentType: "article" | "blog" | "report" };
const CONTENT_TYPES: ContentType[] = [
  { endpoint: "articles", contentType: "article" },
  { endpoint: "blogs", contentType: "blog" },
  { endpoint: "reports", contentType: "report" },
];

type NewsRow = Database["public"]["Tables"]["space_news"]["Insert"];

async function fetchContentType({ endpoint, contentType }: ContentType): Promise<NewsRow[]> {
  // Only stories published in the last 30 days, across every publisher the
  // feed carries (NASA, ESA, SpaceNews, NASASpaceflight, Spaceflight Now and
  // others), so the desk stays current and is not dominated by one source.
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
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

export type RefreshResult = { ok: boolean; statusCode: number; message: string; count?: number };

export async function refreshNews(): Promise<RefreshResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const settled = await Promise.allSettled(CONTENT_TYPES.map(fetchContentType));
  const rows = settled
    .filter((r): r is PromiseFulfilledResult<NewsRow[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
  const failures = settled
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));

  if (rows.length === 0) {
    return { ok: false, statusCode: 502, message: `No news could be fetched this run. ${failures.join("; ")}` };
  }

  const { error } = await supabaseAdmin.from("space_news").upsert(rows, { onConflict: "id" });
  if (error) {
    return { ok: false, statusCode: 500, message: `Database write failed: ${error.message}` };
  }

  // Prune rows older than 60 days to keep the table bounded, matching the
  // original design. A real database write also keeps the project active
  // against free-tier auto-pause.
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 60);
  await supabaseAdmin.from("space_news").delete().lt("published_at", cutoff.toISOString());

  return {
    ok: true,
    statusCode: 200,
    message: `Upserted ${rows.length} news items.${failures.length ? " Partial failures: " + failures.join("; ") : ""}`,
    count: rows.length,
  };
}
