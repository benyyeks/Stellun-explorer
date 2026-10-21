// Combined refresh cycle. Scheduler walks this registry; cached() only hits
// upstream when TTL is past. TTLs match the rate-limit schedule (NASA ≤20/h,
// LL2 free ≤4/h, NOAA frequent).

import { cached } from "@/lib/api-cache.server";
import { fetchJson, isoDate, nasaKey } from "@/lib/stellun-fetch.server";

type Feed = { name: string; run: () => Promise<{ source: string }> };

async function launchFeed(url: string, timeoutMs: number) {
  const raw = (process.env["LAUNCH_LIBRARY_KEY"] ?? "").trim();
  const token = /^[a-f0-9]{20,}$/i.test(raw) ? raw : "";
  return fetchJson(
    url,
    token
      ? { timeoutMs, headers: { Authorization: `Token ${token}` } }
      : { timeoutMs },
  );
}

function normalizeApod(raw: unknown) {
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!item || typeof item !== "object") throw new Error("APOD response was empty.");
  const r = item as Record<string, unknown>;
  const imageUrl =
    (typeof r.hdurl === "string" && r.hdurl) ||
    (typeof r.url === "string" ? r.url : null);
  const strip = (s: unknown) =>
    typeof s === "string" ? s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
  return {
    date: r.date ?? null,
    title: r.title ?? "Astronomy Picture of the Day",
    explanation: strip(r.explanation),
    url: imageUrl,
    hdurl: typeof r.hdurl === "string" ? r.hdurl : imageUrl,
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
      status: typeof r.status === "object" ? r.status : { name: String(r.status ?? "Scheduled") },
      launch_service_provider: { name: r.lsp_name ?? r.launch_service_provider?.name ?? "" },
      rocket: {
        configuration: {
          full_name: r.launcher ?? r.rocket?.configuration?.full_name ?? "",
        },
      },
      mission: {
        type: r.mission_type ?? r.mission?.type,
        description: typeof r.mission === "string" ? r.mission : r.mission?.description,
        orbit: { name: typeof r.orbit === "string" ? r.orbit : r.mission?.orbit?.name },
      },
      pad: {
        name: typeof r.pad === "string" ? r.pad : r.pad?.name,
        location: { name: typeof r.location === "string" ? r.location : r.pad?.location?.name },
        country_code: r.pad?.country_code ?? null,
      },
      image: r.image ?? null,
      webcast_live: Boolean(r.webcast_live),
      vidURLs: r.vidURLs ?? r.vid_urls ?? [],
    })),
  };
}

async function fetchUpcomingLaunches() {
  try {
    const ll = await launchFeed(
      "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=12&mode=list",
      12000,
    );
    const n = normalizeLl2List(ll);
    if (n.results.length > 0) return n;
  } catch {
    /* SpaceX fallback */
  }
  const rows = (await fetchJson("https://api.spacexdata.com/v5/launches/upcoming", {
    timeoutMs: 12000,
  })) as any[];
  if (!Array.isArray(rows)) return { count: 0, next: null, previous: null, results: [] };
  const results = rows.slice(0, 12).map((l) => ({
    id: l.id,
    name: l.name ?? "SpaceX mission",
    net: l.date_utc ?? null,
    status: { name: l.upcoming ? "Go" : "Success", abbrev: l.upcoming ? "Go" : "Success" },
    launch_service_provider: { name: "SpaceX" },
    rocket: { configuration: { full_name: "Falcon 9 / Falcon Heavy" } },
    mission: { type: null, description: l.details ?? null, orbit: { name: null } },
    pad: { name: null, location: { name: null }, country_code: null },
    image: l.links?.patch?.large ?? l.links?.patch?.small ?? null,
    webcast_live: Boolean(l.links?.webcast),
    vidURLs: l.links?.youtube_id
      ? [{ url: `https://www.youtube.com/watch?v=${l.links.youtube_id}`, priority: 0 }]
      : [],
  }));
  return { count: results.length, next: null, previous: null, results };
}

async function fetchPastLaunches() {
  try {
    const ll = await launchFeed(
      "https://ll.thespacedevs.com/2.2.0/launch/previous/?limit=12&mode=list",
      12000,
    );
    return normalizeLl2List(ll);
  } catch {
    return { count: 0, next: null, previous: null, results: [] };
  }
}

function feeds(): Feed[] {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const weekAhead = new Date();
  weekAhead.setUTCDate(weekAhead.getUTCDate() + 7);
  const key = encodeURIComponent(nasaKey());

  return [
    // Real-time / NOAA (no API key budget pressure)
    {
      name: "iss-position",
      run: () =>
        cached("iss-position", { id: "25544" }, 30, () =>
          fetchJson("https://api.wheretheiss.at/v1/satellites/25544", { timeoutMs: 12000 }),
        ),
    },
    {
      name: "kp-index",
      run: () =>
        cached("kp-index", {}, 300, () =>
          fetchJson("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json", {
            timeoutMs: 12000,
          }),
        ),
    },
    {
      name: "solar-wind",
      run: () =>
        cached("solar-wind-v2", {}, 300, async () => {
          const [plasma, mag] = await Promise.all([
            fetchJson("https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json", {
              timeoutMs: 12000,
            }),
            fetchJson("https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json", {
              timeoutMs: 12000,
            }),
          ]);
          return { plasma, mag };
        }),
    },
    {
      name: "xray-flux",
      run: () =>
        cached("xray-flux", {}, 300, () =>
          fetchJson("https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json", {
            timeoutMs: 12000,
          }),
        ),
    },
    {
      name: "satellites-stations",
      run: () =>
        cached("satellites", { group: "stations" }, 7200, () =>
          fetchJson("https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json", {
            timeoutMs: 25000,
          }),
        ),
    },

    // Launches — ≤2 LL2/h target; SpaceX fallback on upcoming
    {
      name: "launches",
      run: () => cached("launches", {}, 3600, () => fetchUpcomingLaunches()),
    },
    {
      name: "past-launches",
      run: () => cached("launches-previous", {}, 43200, () => fetchPastLaunches()),
    },

    // Mars — no NASA api.nasa.gov key
    {
      name: "mars-perseverance",
      run: () =>
        cached("mars-imagery", { mission: "mars2020" }, 7200, async () => {
          try {
            return await fetchJson(
              "https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&num=8&page=0&format=json&order=sol+desc",
              { timeoutMs: 25000 },
            );
          } catch {
            return { images: [], error: "mars_upstream_unavailable" };
          }
        }),
    },

    // NASA key — sparse
    {
      name: "space-weather-alerts",
      run: () =>
        cached("donki", { start: isoDate(weekAgo) }, 14400, async () => {
          try {
            return await fetchJson(
              `https://api.nasa.gov/DONKI/notifications?startDate=\( {isoDate(weekAgo)}&endDate= \){isoDate(today)}&type=all&api_key=${key}`,
              { timeoutMs: 15000 },
            );
          } catch {
            return [];
          }
        }),
    },
    {
      name: "asteroids",
      run: () =>
        cached("neo", { start: isoDate(today) }, 43200, () =>
          fetchJson(
            `https://api.nasa.gov/neo/rest/v1/feed?start_date=\( {isoDate(today)}&end_date= \){isoDate(weekAhead)}&api_key=${key}`,
            { timeoutMs: 12000 },
          ),
        ),
    },
    {
      name: "picture-of-the-day",
      run: () =>
        cached("apod", {}, 86400, async () => {
          const raw = await fetchJson(
            `https://science.nasa.gov/wp-json/wp/v2/apod-basic/?api_key=${key}`,
            { timeoutMs: 15000 },
          );
          return normalizeApod(raw);
        }),
    },
  ];
}

export async function runRefreshCycle() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const results = await Promise.all(
    feeds().map(async (f) => {
      const t0 = Date.now();
      try {
        const r = await f.run();
        return {
          feed: f.name,
          ok: r.source !== "stale",
          source: r.source,
          duration_ms: Date.now() - t0,
          error: r.source === "stale" ? "Source unavailable, showing last saved copy" : null,
        };
      } catch (e) {
        return {
          feed: f.name,
          ok: false,
          source: "none",
          duration_ms: Date.now() - t0,
          error: (e instanceof Error ? e.message : String(e)).slice(0, 300),
        };
      }
    }),
  );
  const { error } = await supabaseAdmin.from("diagnostics_events").insert(results);
  if (error) console.error("diagnostics insert failed", error);
  return results;
    }
