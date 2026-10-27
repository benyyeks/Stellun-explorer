// Combined refresh cycle. Scheduler walks this registry; cached() only hits
// upstream when TTL is past (unless forceRefresh is set by admin).

import { cached } from "@/lib/api-cache.server";
import { fetchJson, isoDate, nasaKey } from "@/lib/stellun-fetch.server";

type Feed = { name: string; run: () => Promise<{ source: string }> };

/** Set true for one admin cycle so every feed ignores TTL and re-hits upstream. */
let forceRefresh = false;

export function setForceRefresh(v: boolean) {
  forceRefresh = v;
}

async function launchFeed(url: string, timeoutMs: number) {
  const raw = (process.env["LAUNCH_LIBRARY_KEY"] ?? "").trim();
  // Only send a token if it looks non-empty; never send junk
  const token = raw.length >= 16 ? raw : "";

  const withAuth = token
    ? { timeoutMs, headers: { Authorization: `Token ${token}` } }
    : { timeoutMs };

  try {
    return await fetchJson(url, withAuth);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    // Invalid / expired key → retry with NO auth (public free tier)
    if (token && /HTTP (401|403)/.test(msg)) {
      console.error("LL2 token rejected; retrying without Authorization");
      return await fetchJson(url, { timeoutMs });
    }

    // Rate limit → wait once, then retry (prefer without burning a bad token again)
    if (/HTTP 429/.test(msg)) {
      await new Promise((r) => setTimeout(r, 3000));
      return await fetchJson(url, token ? withAuth : { timeoutMs });
    }

    throw err;
  }
}
function normalizeApod(raw: unknown) {
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!item || typeof item !== "object") {
    throw new Error("APOD response was empty.");
  }
  const r = item as Record<string, unknown>;
  const strip = (s: unknown) =>
    typeof s === "string" ? s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";

  const candidates = [r.hdurl, r.url].filter((u): u is string => typeof u === "string" && u.length > 0);

  const imageUrl =
    candidates.find(
      (u) =>
        /assets\.science\.nasa\.gov/i.test(u) ||
        /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u),
    ) ?? null;

  if (!imageUrl) {
    throw new Error("APOD response had no usable image URL.");
  }

  const title =
    typeof r.title === "string" && r.title.trim() && r.title.trim() !== "NASA Science"
      ? r.title.trim()
      : "Astronomy Picture of the Day";

  return {
    date: r.date ?? null,
    title,
    explanation: strip(r.explanation),
    url: imageUrl,
    hdurl: imageUrl,
    media_type: r.media_type ?? "image",
    copyright: strip(r.copyright) || strip(r.credit) || undefined,
    permalink: typeof r.permalink === "string" ? r.permalink : undefined,
  };
}

function normalizeLl2List(ll: any) {
  const results = Array.isArray(ll?.results) ? ll.results : [];
  return {
    count: ll?.count ?? results.length,
    next: null,
    previous: null,
    results: results.map((r: any) => ({
      id: r.id,
      name: r.name,
      net: r.net,
      status:
        typeof r.status === "object"
          ? r.status
          : { name: String(r.status ?? "Scheduled") },
      launch_service_provider: {
        name: r.lsp_name ?? r.launch_service_provider?.name ?? "",
      },
      rocket: {
        configuration: {
          full_name:
            r.rocket_configuration?.full_name ??
            r.rocket?.configuration?.full_name ??
            null,
        },
      },
      mission: {
        type: r.mission_type ?? r.mission?.type ?? null,
        description: r.mission_description ?? r.mission?.description ?? null,
        orbit: { name: r.orbit ?? r.mission?.orbit?.name ?? null },
      },
      pad: {
        name: r.pad?.name ?? null,
        location: { name: r.pad?.location?.name ?? r.pad_location ?? null },
        country_code: r.pad?.country_code ?? null,
      },
      image:
        typeof r.image === "string"
          ? r.image
          : (r.image?.image_url ??
            r.image?.url ??
            r.rocket?.configuration?.image_url ??
            null),
      webcast_live: Boolean(r.webcast_live),
      vidURLs: r.vidURLs ?? r.vid_urls ?? [],
    })),
  };
}

const LL2_UPCOMING =
  "https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=10&mode=list";
const LL2_PREVIOUS =
  "https://ll.thespacedevs.com/2.3.0/launches/previous/?limit=10&mode=list";

async function fetchUpcomingLaunches() {
  try {
    const ll = await launchFeed(LL2_UPCOMING, 25000);
    const n = normalizeLl2List(ll);
    if (n.results.length > 0) return n;
  } catch (e) {
    console.error("LL2 upcoming failed, trying SpaceX:", e);
  }
  try {
    const rows = (await fetchJson("https://api.spacexdata.com/v5/launches/upcoming", {
      timeoutMs: 12000,
    })) as any[];
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("SpaceX upcoming returned no launches");
    }
    const results = rows.slice(0, 12).map((l) => ({
      id: l.id,
      name: l.name ?? "SpaceX mission",
      net: l.date_utc ?? null,
      status: {
        name: l.upcoming ? "Go" : "Success",
        abbrev: l.upcoming ? "Go" : "Success",
      },
      launch_service_provider: { name: "SpaceX" },
      rocket: { configuration: { full_name: "Falcon 9 / Falcon Heavy" } },
      mission: {
        type: null,
        description: l.details ?? null,
        orbit: { name: null },
      },
      pad: { name: null, location: { name: null }, country_code: null },
      image: l.links?.patch?.large ?? l.links?.patch?.small ?? null,
      webcast_live: Boolean(l.links?.webcast),
      vidURLs: l.links?.youtube_id
        ? [{ url: `https://www.youtube.com/watch?v=${l.links.youtube_id}`, priority: 0 }]
        : [],
    }));
    return { count: results.length, next: null, previous: null, results };
  } catch (e) {
    console.error("SpaceX upcoming also failed:", e);
    throw e;
  }
}

async function fetchPastLaunches() {
  const ll = await launchFeed(LL2_PREVIOUS, 25000);
  const n = normalizeLl2List(ll);
  if (!n.results.length) {
    throw new Error("LL2 previous returned no launches");
  }
  return n;
}

/** DONKI first; on failure (often 503) use NOAA SWPC alerts.json. Always an array. */
async function fetchSpaceWeatherAlerts(start: string, end: string, key: string) {
  try {
    const url =
      `https://api.nasa.gov/DONKI/notifications?startDate=${start}&endDate=${end}&type=all&api_key=${key}`;
    const data = await fetchJson(url, { timeoutMs: 15000 });
    if (Array.isArray(data)) return data;
  } catch (e) {
    console.error("DONKI failed, trying NOAA alerts:", e);
  }
  const noaa = await fetchJson("https://services.swpc.noaa.gov/products/alerts.json", {
    timeoutMs: 12000,
  });
  if (!Array.isArray(noaa)) return [];
  return noaa.slice(0, 40).map((a: any, i: number) => ({
    messageType: "SWPC",
    messageID: String(a.product_id ?? `noaa-${i}`),
    messageURL: "https://www.swpc.noaa.gov/",
    messageIssueTime: a.issue_datetime ?? null,
    messageBody: a.message ?? "",
  }));
}

function feeds(): Feed[] {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const weekAhead = new Date();
  weekAhead.setUTCDate(weekAhead.getUTCDate() + 7);
  const key = encodeURIComponent(nasaKey());
  const day = isoDate(today);
  const start = isoDate(weekAgo);
  const end = isoDate(today);
  const endNeo = isoDate(weekAhead);

  return [
    {
      name: "iss-position",
      run: () =>
        cached("iss-position", { id: "25544" }, 30, () =>
          fetchJson("https://api.wheretheiss.at/v1/satellites/25544", { timeoutMs: 12000 }),
          { force: forceRefresh },
        ),
    },
    {
      name: "kp-index",
      run: () =>
        cached(
          "kp-index",
          {},
          300,
          () =>
            fetchJson("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json", {
              timeoutMs: 12000,
            }),
          { force: forceRefresh },
        ),
    },
    {
      name: "solar-wind",
      run: () =>
        cached(
          "solar-wind-v2",
          {},
          300,
          async () => {
            const [plasma, mag] = await Promise.all([
              fetchJson("https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json", {
                timeoutMs: 12000,
              }),
              fetchJson("https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json", {
                timeoutMs: 12000,
              }),
            ]);
            return { plasma, mag };
          },
          { force: forceRefresh },
        ),
    },
    {
      name: "xray-flux",
      run: () =>
        cached(
          "xray-flux",
          {},
          300,
          () =>
            fetchJson("https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json", {
              timeoutMs: 12000,
            }),
          { force: forceRefresh },
        ),
    },
    {
      name: "satellites-stations",
      run: () =>
        cached(
          "satellites",
          { group: "stations" },
          7200,
          () =>
            fetchJson("https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json", {
              timeoutMs: 25000,
            }),
          { force: forceRefresh },
        ),
    },

{
      name: "satellites-starlink",
      run: async () => {
        const { refreshSatelliteGroup } = await import("@/lib/satellite-catalog.server");
        const r = await refreshSatelliteGroup("starlink", { force: forceRefresh });
        return { source: r.source };
      },
    },
    {
      name: "satellites-active",
      run: async () => {
        const { refreshSatelliteGroup } = await import("@/lib/satellite-catalog.server");
        const r = await refreshSatelliteGroup("active", { force: forceRefresh });
        return { source: r.source };
      },
    },
    {
      name: "satellites-geo",
      run: async () => {
        const { refreshSatelliteGroup } = await import("@/lib/satellite-catalog.server");
        const r = await refreshSatelliteGroup("geo", { force: forceRefresh });
        return { source: r.source };
      },
    },
    
    {
      name: "launches",
      run: () =>
        cached("launches", {}, 1800, () => fetchUpcomingLaunches(), { force: forceRefresh }),
    },
    {
      name: "past-launches",
      run: () =>
        cached("launches-previous", {}, 43200, () => fetchPastLaunches(), {
          force: forceRefresh,
        }),
    },
    {
      name: "mars-perseverance",
      run: () =>
        cached(
          "mars-imagery",
          { mission: "mars2020" },
          7200,
          async () => {
            try {
              return await fetchJson(
                "https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&num=8&page=0&format=json&order=sol+desc",
                { timeoutMs: 25000 },
              );
            } catch {
              return { images: [], error: "mars_upstream_unavailable" };
            }
          },
          { force: forceRefresh },
        ),
    },
    {
      name: "space-weather-alerts",
      run: () =>
        cached(
          "donki",
          { start },
          14400,
          () => fetchSpaceWeatherAlerts(start, end, key),
          { force: forceRefresh },
        ),
    },
    {
      name: "asteroids",
      run: () =>
        cached(
          "neo",
          { start: day },
          43200,
          () =>
            fetchJson(
              `https://api.nasa.gov/neo/rest/v1/feed?start_date=${day}&end_date=${endNeo}&api_key=${key}`,
              { timeoutMs: 12000 },
            ),
          { force: forceRefresh },
        ),
    },
    {
      name: "picture-of-the-day",
      // Key by calendar day so the image rotates every morning even if TTL is still warm.
      run: () =>
        cached(
          "apod",
          { day },
          86400,
          async () => {
            const raw = await fetchJson("https://science.nasa.gov/wp-json/wp/v2/apod-basic/", {
              timeoutMs: 15000,
            });
            return normalizeApod(raw);
          },
          { force: forceRefresh },
        ),
    },
    {
      // SNAPI articles/blogs/reports + NASA RSS → space_news table.
      // Not a heavy CelesTrak catalog — safe on full refresh cycles.
      name: "space-news",
      run: async () => {
        const { refreshNews } = await import("@/lib/news-refresh.server");
        const r = await refreshNews();
        if (!r.ok) {
          throw new Error(r.message || "News refresh failed");
        }
        return { source: "fresh" };
      },
    },
  ];
}

/** Stable list of feed ids the admin panel must always show. */
export function listRegisteredFeeds(): string[] {
  return feeds().map((f) => f.name);
}
export async function runRefreshCycle(opts?: { force?: boolean; only?: string }) {
  forceRefresh = Boolean(opts?.force);
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const all = feeds();
    const selected = opts?.only
      ? all.filter((f) => f.name === opts.only)
      : all;

    if (opts?.only && selected.length === 0) {
      return [
        {
          feed: opts.only,
          ok: false,
          source: "none",
          duration_ms: 0,
          error: `Unknown feed "${opts.only}".`,
        },
      ];
    }

    const HEAVY_FEEDS = new Set([
      "satellites-starlink",
      "satellites-active",
      "satellites-geo",
    ]);

    // Full cycle: skip mega catalogs (refresh those feeds alone).
    // Single-feed refresh: always run the requested feed.
    const toRun =
      opts?.only != null
        ? selected
        : selected.filter((f) => !HEAVY_FEEDS.has(f.name));

    const results: Array<{
      feed: string;
      ok: boolean;
      source: string;
      duration_ms: number;
      error: string | null;
    }> = [];

    // Sequential = stays under Cloudflare Worker subrequest limits.
    for (const f of toRun) {
      const t0 = Date.now();
      try {
        const r = await f.run();
        results.push({
          feed: f.name,
          ok: r.source !== "stale",
          source: r.source,
          duration_ms: Date.now() - t0,
          error: r.source === "stale" ? "Source unavailable, showing last saved copy" : null,
        });
      } catch (e) {
        results.push({
          feed: f.name,
          ok: false,
          source: "none",
          duration_ms: Date.now() - t0,
          error: (e instanceof Error ? e.message : String(e)).slice(0, 300),
        });
      }
    }

    if (!opts?.only) {
      for (const name of HEAVY_FEEDS) {
        results.push({
          feed: name,
          ok: true,
          source: "skipped",
          duration_ms: 0,
          error: "Skipped on full cycle — refresh this feed alone (CF subrequest budget).",
        });
      }
    }

    const { error } = await supabaseAdmin.from("diagnostics_events").insert(results);
    if (error) {
      console.error("diagnostics insert failed", error);
      results.push({
        feed: "_diagnostics_write",
        ok: false,
        source: "none",
        duration_ms: 0,
        error: error.message.slice(0, 300),
      });
    }
    return results;
  } finally {
    forceRefresh = false;
  }
}
