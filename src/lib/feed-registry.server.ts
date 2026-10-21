// Combined refresh cycle. The scheduler calls /api/public/refresh every 30 s;
// each run walks this registry and calls cached() with the exact same
// endpoint + params the page server functions use. cached() only goes
// upstream when the saved copy is past its TTL, so the TTL is the tier:
// telemetry (seconds), space weather and Mars (minutes to hours), directories
// (daily). Pages then read the already-saved row. Every run is logged to
// diagnostics_events for the admin health panel.

import { cached } from "@/lib/api-cache.server";
import { fetchJson, isoDate, nasaKey } from "@/lib/stellun-fetch.server";

type Feed = { name: string; run: () => Promise<{ source: string }> };

// Free tier: no key = 15 calls/hour per IP. Only send a token if it is set and
// looks like a real hex token (never a bad leftover secret).
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
function feeds(): Feed[] {
  const today = new Date();
  const weekAgo = new Date(); weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const weekAhead = new Date(); weekAhead.setUTCDate(weekAhead.getUTCDate() + 7);
  const key = encodeURIComponent(nasaKey());
  return [
    // Real-time tier
    { name: "iss-position", run: () => cached("iss-position", { id: "25544" }, 5, () => fetchJson("https://api.wheretheiss.at/v1/satellites/25544", { timeoutMs: 12000 })) },
    { name: "kp-index", run: () => cached("kp-index", {}, 300, () => fetchJson("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json", { timeoutMs: 12000 })) },
    { name: "solar-wind", run: () => cached("solar-wind-v2", {}, 300, async () => {
      const [plasma, mag] = await Promise.all([
        fetchJson("https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json", { timeoutMs: 12000 }),
        fetchJson("https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json", { timeoutMs: 12000 }),
      ]);
      return { plasma, mag };
    }) },
    { name: "xray-flux", run: () => cached("xray-flux", {}, 300, () => fetchJson("https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json", { timeoutMs: 12000 })) },
    { name: "satellites-stations", run: () => cached("satellites", { group: "stations" }, 3600, () => fetchJson("https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json", { timeoutMs: 15000 })) },
    // Hourly tier
    { name: "launches", run: () => cached("launches", {}, 1800, () => launchFeed("https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=12&mode=detailed", 10000)) },
    { name: "mars-perseverance", run: () => cached("mars-imagery", { mission: "mars2020" }, 1800, () => fetchJson("https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&num=8&page=0&format=json&order=sol+desc", { timeoutMs: 20000 })) },
    { name: "space-weather-alerts", run: () => cached("donki", { start: isoDate(weekAgo) }, 7200, () => fetchJson(`https://api.nasa.gov/DONKI/notifications?startDate=${isoDate(weekAgo)}&endDate=${isoDate(today)}&type=all&api_key=${key}`, { timeoutMs: 12000 })) },
    // Daily tier
    { name: "asteroids", run: () => cached("neo", { start: isoDate(today) }, 21600, () => fetchJson(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${isoDate(today)}&end_date=${isoDate(weekAhead)}&api_key=${key}`, { timeoutMs: 12000 })) },
    { name: "picture-of-the-day", run: () => cached("apod", {}, 43200, () => fetchJson(`https://api.nasa.gov/planetary/apod?api_key=${key}`, { timeoutMs: 12000 })) },
    { name: "past-launches", run: () => cached("launches-previous", {}, 21600, () => launchFeed("https://ll.thespacedevs.com/2.2.0/launch/previous/?limit=20&mode=detailed", 12000)) },
  ];
}

export async function runRefreshCycle() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const results = await Promise.all(
    feeds().map(async (f) => {
      const t0 = Date.now();
      try {
        const r = await f.run();
        return { feed: f.name, ok: r.source !== "stale", source: r.source, duration_ms: Date.now() - t0, error: r.source === "stale" ? "Source unavailable, showing last saved copy" : null };
      } catch (e) {
        return { feed: f.name, ok: false, source: "none", duration_ms: Date.now() - t0, error: (e instanceof Error ? e.message : String(e)).slice(0, 300) };
      }
    })
  );
  const { error } = await supabaseAdmin.from("diagnostics_events").insert(results);
  if (error) console.error("diagnostics insert failed", error);
  return results;
}
