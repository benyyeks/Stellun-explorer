// STELLUN data server functions: typed, cached proxies over the upstream
// APIs (NASA, NOAA, CelesTrak, JPL Horizons, The Space Devs, Open-Meteo,
// Spaceflight News API). Each is a thin wrapper: read env inside the
// handler, call the shared fetch helpers, wrap the call in cached() for
// read-through caching with stale-on-error fallback. No secrets reach the
// client; all upstream calls happen server-side.
//
// Upstream JSON is dynamic, so payloads are typed loosely (any) and narrowed
// on the consuming page. The CacheResult wrapper carries source/freshness
// flags the UI uses to label a value as live or stale-fallback.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cached, type CacheResult } from "@/lib/api-cache.server";
import { fetchJson, fetchText, isoDate, nasaKey } from "@/lib/stellun-fetch.server";

// ------------------------------- Types ------------------------------------
export type DataResult = CacheResult<any>;

// ----------------------------- NOAA: Kp index -----------------------------
export const getKpIndex = createServerFn({ method: "GET" }).handler(async () => {
  return cached("kp-index", {}, 300, () =>
    fetchJson("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json", { timeoutMs: 12000 })
  );
});

// ----------------------------- NOAA: solar wind ---------------------------
// NOAA's real-time solar wind feeds (DSCOVR, falling back to ACE). These are
// arrays of objects with named fields: proton_speed, proton_density,
// proton_temperature (plasma) and bt, bx_gsm, by_gsm, bz_gsm (mag).
export const getSolarWind = createServerFn({ method: "GET" }).handler(async () => {
  return cached("solar-wind-v2", {}, 300, async () => {
    const [plasma, mag] = await Promise.all([
      fetchJson("https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json", { timeoutMs: 12000 }),
      fetchJson("https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json", { timeoutMs: 12000 }),
    ]);
    return { plasma, mag };
  });
});


// --------------------------- NOAA: GOES X-ray flux ------------------------
export const getXrayFlux = createServerFn({ method: "GET" }).handler(async () => {
  return cached("xray-flux", {}, 300, () =>
    fetchJson("https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json", { timeoutMs: 12000 })
  );
});


// -------------------------------- NASA: APOD -----------------------------
// WordPress APOD (legacy planetary/apod is 500 / retires Dec 2026).
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

export const getAPOD = createServerFn({ method: "GET" }).handler(async () => {
  // Key by UTC date so the picture rotates every morning.
  const day = isoDate(new Date());
  return cached("apod", { day }, 86400, async () => {
    const raw = await fetchJson("https://science.nasa.gov/wp-json/wp/v2/apod-basic/", {
      timeoutMs: 15000,
    });
    return normalizeApod(raw);
  });
});

// -------------------------------- NASA: NEO ------------------------------
export const getNEO = createServerFn({ method: "GET" }).handler(async () => {
  const start = new Date();
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + 7);
  const key = nasaKey();
  const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${isoDate(start)}&end_date=${isoDate(end)}&api_key=${encodeURIComponent(key)}`;
  return cached("neo", { start: isoDate(start) }, 43200, () => fetchJson(url, { timeoutMs: 12000 }));
});

// ------------------------------- NASA: Mars ------------------------------
// Raw surface imagery straight from the mission feeds at mars.nasa.gov
// (mars2020 = Perseverance, msl = Curiosity). Every frame the rovers return
// is published here with its sol, instrument, and timestamps, so the latest
// entry doubles as a mission heartbeat.
const MARS_MISSIONS = ["mars2020", "msl"] as const;
const MarsFeedInput = z.object({ mission: z.enum(MARS_MISSIONS).default("mars2020") });

export const getMarsImagery = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => MarsFeedInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const url = `https://mars.nasa.gov/rss/api/?feed=raw_images&category=${data.mission}&feedtype=json&num=8&page=0&format=json&order=sol+desc`;
    return cached("mars-imagery", { mission: data.mission }, 7200, () => fetchJson(url, { timeoutMs: 20000 }));
  });

// --------------------------- CelesTrak: satellites ------------------------
const SAT_GROUPS = [
  "stations", "visual", "gps-ops", "glo-ops", "galileo", "beidou",
  "geo", "weather", "starlink", "science", "active", "iridium-NEXT",
  "resource", "cosmos-2251-debris", "iridium-33-debris", "19820",
] as const;
const SatInput = z.object({ group: z.enum(SAT_GROUPS).default("stations") });

export const getSatellites = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => SatInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const {
      readCatalogPayloads,
      getCatalogStatus,
      refreshSatelliteGroup,
      isHeavySatGroup,
    } = await import("@/lib/satellite-catalog.server");

    // Heavy groups: table-backed, progressive, no cap.
    if (isHeavySatGroup(data.group)) {
      let status = await getCatalogStatus(data.group);
      const { rows, fetchedAt } = await readCatalogPayloads(data.group);

      // First visit / empty: kick a background-style refresh (await so first
      // load still works; admin/cron will keep it warm later).
      if (rows.length === 0 && status?.status !== "loading") {
        try {
          await refreshSatelliteGroup(data.group, { force: true });
          status = await getCatalogStatus(data.group);
          const again = await readCatalogPayloads(data.group);
          return {
            data: again.rows,
            source: "fresh" as const,
            fetchedAt: again.fetchedAt ?? new Date().toISOString(),
            isStale: status?.status === "loading",
          };
        } catch (e) {
          if (rows.length === 0) throw e;
        }
      }

      return {
        data: rows,
        source: status?.status === "ready" ? ("cache" as const) : ("stale" as const),
        fetchedAt: fetchedAt ?? status?.finished_at ?? status?.updated_at ?? new Date().toISOString(),
        isStale: status?.status === "loading",
      };
    }

// Small groups: existing short-TTL cache path (unchanged idea).
    const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${data.group}&FORMAT=json`;
    return cached("satellites", { group: data.group }, 3600, () =>
      fetchJson(url, { timeoutMs: 18000 }),
    );
  });

// Sun-synchronous orbit (SSO): CelesTrak has no single SSO group, so we
// merge NOAA + resource and keep inclinations in the sun-sync band.
export const getSatellitesSSO = createServerFn({ method: "GET" }).handler(async () => {
  return cached("satellites-sso", {}, 3600, async () => {
    const [noaaRes, resourceRes] = await Promise.all([
      fetchJson<any[]>("https://celestrak.org/NORAD/elements/gp.php?GROUP=noaa&FORMAT=json", {
        timeoutMs: 12000,
      }),
      fetchJson<any[]>("https://celestrak.org/NORAD/elements/gp.php?GROUP=resource&FORMAT=json", {
        timeoutMs: 12000,
      }),
    ]);
    const merged = [...(Array.isArray(noaaRes) ? noaaRes : []), ...(Array.isArray(resourceRes) ? resourceRes : [])];
    return merged.filter((rec) => {
      const inc = Number(rec?.INCLINATION);
      return !Number.isNaN(inc) && inc >= 96 && inc <= 100;
    });
  });
});

// Single-object lookup by NORAD catalog number, used by the satellite
// detail template page.
const SatIdInput = z.object({ noradId: z.string().regex(/^\d{1,6}$/) });

export const getSatellite = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => SatIdInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${data.noradId}&FORMAT=json`;
    return cached("satellite", { id: data.noradId }, 3600, () => fetchJson(url, { timeoutMs: 12000 }));
  });

// ------------------------- wheretheiss: ISS position ---------------------
const IssInput = z.object({ id: z.string().regex(/^\d{1,6}$/).default("25544") });

export const getISSPosition = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => IssInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const url = `https://api.wheretheiss.at/v1/satellites/${data.id}`;
    return cached("iss-position", { id: data.id }, 30, () => fetchJson(url, { timeoutMs: 12000 }));
  });

// ---------------------- The Space Devs: launches --------------------------
// Free: URL only, no key required (15 req/hour/IP). Cache in Supabase via
// cached() so the page can refresh as often as it wants without hitting LL2.
const LL2_URL =
  "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=12&mode=detailed";
const SPACEX_UPCOMING = "https://api.spacexdata.com/v5/launches/upcoming";

async function fetchLaunchFeed(url: string, timeoutMs: number) {
  const raw = (process.env["LAUNCH_LIBRARY_KEY"] ?? "").trim();
  // Only use a token that looks like a real LL2 key; ignore junk/empty.
  const token = /^[a-f0-9]{20,}$/i.test(raw) ? raw : "";
  if (!token) return fetchJson(url, { timeoutMs });
  try {
    return await fetchJson(url, {
      timeoutMs,
      headers: { Authorization: `Token ${token}` },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/HTTP (401|403|429)/.test(msg)) throw err;
    return fetchJson(url, { timeoutMs });
  }
}

/** Optional SpaceX v5 list — no key. Used only if LL2 returns empty. */
async function fetchSpaceXUpcoming() {
  const rows = (await fetchJson(SPACEX_UPCOMING, { timeoutMs: 12000 })) as any[];
  if (!Array.isArray(rows)) return { count: 0, next: null, previous: null, results: [] };
  const results = rows.slice(0, 12).map((l) => ({
    id: l.id,
    name: l.name ?? "SpaceX mission",
    net: l.date_utc ?? l.date_local ?? null,
    window_start: l.date_utc ?? null,
    window_end: l.date_utc ?? null,
    status: {
      name: l.upcoming ? "Go" : l.success === false ? "Failure" : "Success",
    },
    launch_service_provider: { name: "SpaceX" },
    rocket: {
      configuration: {
        full_name: "Falcon 9 / Falcon Heavy",
        name: "Falcon",
      },
    },
    pad: {
      name: null,
      location: { name: l.launchpad ?? null },
    },
    mission: {
      name: l.name,
      description: l.details ?? null,
      type: null,
      orbit: { name: null },
    },
    image: l.links?.patch?.large ?? l.links?.patch?.small ?? null,
    webcast_live: Boolean(l.links?.webcast),
    vidURLs: l.links?.webcast
      ? [{ url: l.links.webcast, priority: 0 }]
      : l.links?.youtube_id
        ? [{ url: `https://www.youtube.com/watch?v=${l.links.youtube_id}`, priority: 0 }]
        : [],
    _source: "spacex",
  }));
  return { count: results.length, next: null, previous: null, results };
}

export const getLaunches = createServerFn({ method: "GET" }).handler(async () => {
  return cached("launches", {}, 3600, async () => {
    try {
      const ll = await fetchLaunchFeed(LL2_URL, 10000);
      const results = (ll as any)?.results;
      if (Array.isArray(results) && results.length > 0) return ll;
    } catch {
      /* fall through to SpaceX */
    }
    return fetchSpaceXUpcoming();
  });
});

// ------------------------- Open-Meteo: earth weather ----------------------
const WeatherInput = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const getEarthWeather = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => WeatherInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const current =
      "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,pressure_msl,is_day";
    const hourly =
      "temperature_2m,apparent_temperature,cloud_cover,precipitation_probability,precipitation,weather_code,wind_speed_10m,relative_humidity_2m,is_day";
    const daily =
      "sunrise,sunset,weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max";
    // forecast_days=2 → today + tomorrow in local timezone from Open-Meteo
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=\( {data.lat}&longitude= \){data.lon}` +
      `&current=\( {current}&hourly= \){hourly}&daily=${daily}&forecast_days=2&timezone=auto`;
    // 5 min TTL — homepage + conditions page share the same cache key shape
    return cached("weather-earth", { lat: data.lat, lon: data.lon }, 300, () =>
      fetchJson(url, { timeoutMs: 12000 }),
    );
  });
// ----------------------------- JPL: Horizons ------------------------------
// Fixed NAIF/SPICE ID lookup for the deep-space probes STELLUN tracks.
// COMMAND is never taken from the client, so this can never be used as an
// open relay to query arbitrary Horizons targets.
const PROBES: Record<string, string> = {
  voyager1: "-31",
  voyager2: "-32",
  newhorizons: "-98",
  parkersolarprobe: "-96",
  jwst: "-170",
  juno: "-61",
};
const ProbeInput = z.object({ probe: z.enum(Object.keys(PROBES) as [string, ...string[]]) });

export const getHorizons = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => ProbeInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const id = PROBES[data.probe]!;
    const now = new Date();
    const start = new Date(now.getTime() - 5 * 60000);
    const stop = new Date(now.getTime() + 15 * 60000);
    const q = (v: string) => `'${v}'`;
    const fmt = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");
    const params = new URLSearchParams();
    params.set("format", "text");
    params.set("COMMAND", q(id));
    params.set("OBJ_DATA", q("NO"));
    params.set("MAKE_EPHEM", q("YES"));
    params.set("EPHEM_TYPE", q("VECTORS"));
    params.set("CENTER", q("@399"));
    params.set("START_TIME", q(fmt(start)));
    params.set("STOP_TIME", q(fmt(stop)));
    params.set("STEP_SIZE", q("10m"));
    params.set("VEC_TABLE", q("3"));
    params.set("OUT_UNITS", q("KM-S"));
    params.set("CSV_FORMAT", q("YES"));
    const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
    return cached("horizons", { probe: data.probe }, 120, () => fetchText(url, { timeoutMs: 15000 }));
  });

// --------------------------- SatNOGS DB: profiles --------------------------
// Crowdsourced satellite metadata and radio transmitter records, keyed by
// NORAD catalog number. Entries are maintained by the SatNOGS observer
// community, so many small or debris objects have no record; the page treats
// a missing record as "no community profile" rather than an error.
const SatnogsInput = z.object({ noradId: z.string().regex(/^\d{1,6}$/) });

export const getSatnogsSatellite = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => SatnogsInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const url = `https://db.satnogs.org/api/satellites/?norad_cat_id=${data.noradId}&format=json`;
    return cached("satnogs-satellite", { id: data.noradId }, 21600, async () => {
      const res = await fetchJson<any>(url, { timeoutMs: 12000 });
      const rows = Array.isArray(res) ? res : (res?.results ?? []);
      return rows[0] ?? null;
    });
  });

export const getSatnogsTransmitters = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => SatnogsInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const url = `https://db.satnogs.org/api/transmitters/?satellite__norad_cat_id=${data.noradId}&format=json`;
    return cached("satnogs-transmitters", { id: data.noradId }, 21600, async () => {
      const res = await fetchJson<any>(url, { timeoutMs: 12000 });
      return Array.isArray(res) ? res : (res?.results ?? []);
    });
  });

// ----------------------- Spaceflight News API (live) ----------------------
// Combined live news fetch. Cached until the next UTC midnight to match the
// daily-update design.
export const getNewsLive = createServerFn({ method: "GET" }).handler(async () => {
  return cached("news-live", {}, 3600, async () => {
    const TYPES = ["articles", "blogs", "reports"] as const;
    const results = await Promise.all(
      TYPES.map(async (type) => {
        try {
          const res = await fetchJson<{ results: any[] }>(`https://api.spaceflightnewsapi.net/v4/${type}/?limit=10&ordering=-published_at`, { timeoutMs: 10000 });
          return res.results ?? [];
        } catch {
          return [];
        }
      })
    );
    const items = results.flat() as any[];
    return { items, generatedAt: new Date().toISOString() };
  });
});

// --------------------- Roman Space Telescope coverage ----------------------
// Mission coverage for the Roman page. Runs server side against the
// Spaceflight News API search endpoints so no browser calls the upstream feed,
// cached for an hour with the shared stale-on-error fallback.
export const getRomanNews = createServerFn({ method: "GET" }).handler(async () => {
  return cached("roman-news", {}, 3600, async () => {
    const TYPES = ["articles", "blogs", "reports"] as const;
    const results = await Promise.all(
      TYPES.map(async (type) => {
        try {
          const res = await fetchJson<{ results: any[] }>(
            `https://api.spaceflightnewsapi.net/v4/${type}/?search=roman%20space%20telescope&limit=12&ordering=-published_at`,
            { timeoutMs: 10000 }
          );
          return res.results ?? [];
        } catch {
          return [];
        }
      })
    );
    const seen = new Set<string>();
    const items = (results.flat() as any[])
      .filter((item) => {
        const text = `${item?.title ?? ""} ${item?.summary ?? ""}`.toLowerCase();
        // Guard against unrelated "Roman" matches such as Roman-era history
        // stories that share the word.
        return text.includes("roman space telescope") || text.includes("nancy grace roman");
      })
      .filter((item) => {
        const url = String(item?.url ?? "");
        if (!url || seen.has(url)) return false;
        seen.add(url);
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b?.published_at ?? 0).getTime() - new Date(a?.published_at ?? 0).getTime()
      )
      .slice(0, 9);
    return { items, generatedAt: new Date().toISOString() };
  });
});

// --------------------- MAST: archive observations by field ------------------
// Real archive records for a sky position, used by the Roman survey panel.
// Roman itself has published no science data during commissioning, so the query
// returns Hubble and Webb coverage of the same fields Roman will survey, which
// gives a genuine comparison instead of invented rows. Runs server side against
// the MAST portal cone search and is cached for six hours.
const ArchiveInput = z.object({
  raDeg: z.number().min(0).max(360),
  decDeg: z.number().min(-90).max(90),
});

export type ArchiveObservation = {
  collection: string;
  instrument: string;
  target: string;
  filters: string;
  raDeg: number | null;
  decDeg: number | null;
  startISO: string | null;
  exposureSeconds: number | null;
  productType: string;
};

// MJD to ISO. The archive publishes observation start times as Modified
// Julian Dates.
function mjdToISO(mjd: unknown): string | null {
  const n = Number(mjd);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = (n + 2400000.5 - 2440587.5) * 86400000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const getArchiveObservations = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => ArchiveInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    return cached(
      "mast-cone",
      { ra: data.raDeg, dec: data.decDeg },
      21600,
      async (): Promise<{ items: ArchiveObservation[] }> => {
        const request = {
          service: "Mast.Caom.Cone",
          params: { ra: data.raDeg, dec: data.decDeg, radius: 0.2 },
          format: "json",
          pagesize: 400,
          page: 1,
          removenullcolumns: true,
        };
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        let payload: { data?: any[] };
        try {
          const res = await fetch("https://mast.stsci.edu/api/v0/invoke", {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "STELLUN-SpaceIntelligence/1.0",
            },
            body: `request=${encodeURIComponent(JSON.stringify(request))}`,
          });
          if (!res.ok) throw new Error(`Upstream returned HTTP ${res.status}.`);
          payload = (await res.json()) as { data?: any[] };
        } finally {
          clearTimeout(timer);
        }

        const rows = Array.isArray(payload.data) ? payload.data : [];
        const items = rows
          .filter((r) => {
            const c = String(r?.obs_collection ?? "").toUpperCase();
            return c === "HST" || c === "JWST";
          })
          .map<ArchiveObservation>((r) => ({
            collection: String(r?.obs_collection ?? "").toUpperCase() === "HST" ? "Hubble" : "Webb",
            instrument: String(r?.instrument_name ?? "Unspecified"),
            target: String(r?.target_name ?? "Unspecified"),
            filters: String(r?.filters ?? "Unspecified"),
            raDeg: Number.isFinite(Number(r?.s_ra)) ? Number(r.s_ra) : null,
            decDeg: Number.isFinite(Number(r?.s_dec)) ? Number(r.s_dec) : null,
            startISO: mjdToISO(r?.t_min),
            exposureSeconds: Number.isFinite(Number(r?.t_exptime)) ? Number(r.t_exptime) : null,
            productType: String(r?.dataproduct_type ?? "unspecified"),
          }))
          .sort((a, b) => (b.startISO ?? "").localeCompare(a.startISO ?? ""))
          .slice(0, 25);

        return { items };
      }
    );
  });

// --------------------- The Space Devs: past launches archive -----------------
// Recently completed orbital launches, used by the Past launches archive.
// Cached for six hours since the record no longer changes once a flight flew,
// which also keeps this feed well inside the upstream request quota.
const LL2_PREVIOUS_URL =
  "https://ll.thespacedevs.com/2.2.0/launch/previous/?limit=24&mode=detailed";

export const getPastLaunches = createServerFn({ method: "GET" }).handler(async () => {
  return cached("launches-previous", {}, 21600, () => fetchLaunchFeed(LL2_PREVIOUS_URL, 12000));
});

// ---------------------- NASA: Mars surface image gallery ---------------------
// One normalized feed for every surface craft in the Mars Image Gallery.
// Perseverance and Curiosity come from the live raw image services at
// mars.nasa.gov; Ingenuity, Opportunity, and Spirit are no longer publishing
// raw frames, so their archived imagery comes from the NASA image library.
export type MarsFrame = {
  id: string;
  thumb: string;
  full: string;
  title: string;
  sol: number | null;
  earthDate: string | null;
  instrument: string | null;
  craft: string;
  link: string | null;
};

export type MarsGalleryPayload = {
  frames: MarsFrame[];
  totalImages: number | null;
  latestSol: number | null;
  service: "mars2020-raw" | "msl-raw" | "nasa-image-library";
  solRequested: number | null;
};

const GALLERY_CRAFT = ["perseverance", "curiosity", "ingenuity", "opportunity", "spirit"] as const;
const MarsGalleryInput = z.object({
  craft: z.enum(GALLERY_CRAFT).default("perseverance"),
  sol: z.number().int().min(0).max(20000).nullable().default(null),
  page: z.number().int().min(0).max(40).default(0),
});

const ARCHIVE_QUERY: Record<string, string> = {
  ingenuity: "Ingenuity Mars Helicopter flight",
  opportunity: "Opportunity rover Mars surface",
  spirit: "Spirit rover Mars Gusev",
};

function solCondition(sol: number | null, first: number): string {
  if (sol === null) return "";
  return `&condition_${first}=${sol}:sol:gte&condition_${first + 1}=${sol}:sol:lte`;
}

export const getMarsGallery = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => MarsGalleryInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { craft, sol, page } = data;
    // Historical sols never change, so they are cached for a day; the live
    // "latest frames" view refreshes every half hour.
    const ttl = sol === null ? 1800 : 86400;
    return cached<MarsGalleryPayload>("mars-gallery", { craft, sol, page }, ttl, async () => {
      if (craft === "perseverance") {
        const url =
          `https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json` +
          `&num=48&page=${page}&order=sol+desc&format=json${solCondition(sol, 2)}`;
        const raw = await fetchJson(url, { timeoutMs: 20000 });
        const images: any[] = Array.isArray(raw?.images) ? raw.images : [];
        return {
          frames: images.map((i) => ({
            id: String(i.imageid ?? i.date_taken_utc ?? Math.random()),
            thumb: i.image_files?.medium ?? i.image_files?.small ?? i.image_files?.large ?? i.image_files?.full_res ?? "",
            full: i.image_files?.full_res ?? i.image_files?.large ?? i.image_files?.medium ?? "",
            title: i.title || i.caption || "Perseverance raw frame",
            sol: typeof i.sol === "number" ? i.sol : null,
            earthDate: typeof i.date_taken_utc === "string" ? i.date_taken_utc.slice(0, 10) : null,
            instrument: i.camera?.instrument ?? null,
            craft: "perseverance",
            link: i.link ?? null,
          })).filter((f) => f.thumb),
          totalImages: typeof raw?.total_images === "number" ? raw.total_images : null,
          latestSol: images.length ? Number(images[0]?.sol ?? 0) : null,
          service: "mars2020-raw" as const,
          solRequested: sol,
        };
      }

      if (craft === "curiosity") {
        const url =
          `https://mars.nasa.gov/api/v1/raw_image_items/?page=${page}&per_page=48` +
          `&order=sol+desc&condition_1=msl:mission${solCondition(sol, 2)}`;
        const raw = await fetchJson(url, { timeoutMs: 20000 });
        const items: any[] = Array.isArray(raw?.items) ? raw.items : [];
        return {
          frames: items.map((i) => ({
            id: String(i.imageid ?? i.id),
            thumb: i.https_url ?? i.url ?? i.extended?.url_list?.split(",")[0] ?? "",
            full: i.url ?? "",
            title: String(i.title ?? i.imageid ?? "Curiosity raw frame"),
            sol: typeof i.sol === "number" ? i.sol : null,
            earthDate:
              typeof i.date_taken === "string"
                ? i.date_taken.slice(0, 10)
                : typeof i.date_received === "string"
                  ? i.date_received.slice(0, 10)
                  : null,
            instrument: i.instrument ?? null,
            craft: "curiosity",
            link: typeof i.link === "string" ? `https://mars.nasa.gov${i.link}` : (i.url ?? null),
          })).filter((f) => f.thumb),
          totalImages: typeof raw?.total === "number" ? raw.total : null,
          latestSol: items.length ? Number(items[0]?.sol ?? 0) : null,
          service: "msl-raw" as const,
          solRequested: sol,
        };
      }

      const q = ARCHIVE_QUERY[craft] ?? craft;
      const url =
        `https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}` +
        `&media_type=image&page_size=24&page=${page + 1}`;
      const raw = await fetchJson(url, { timeoutMs: 20000 });
      const items: any[] = Array.isArray(raw?.collection?.items) ? raw.collection.items : [];
      return {
        frames: items
          .map((i) => {
            const meta = i.data?.[0] ?? {};
            const thumb: string = i.links?.[0]?.href ?? "";
            return {
              id: String(meta.nasa_id ?? thumb),
              thumb,
              full: thumb.includes("~thumb") ? thumb.replace("~thumb", "~orig") : thumb,
              title: String(meta.title ?? "Archived frame"),
              sol: null,
              earthDate: typeof meta.date_created === "string" ? meta.date_created.slice(0, 10) : null,
              instrument: meta.center ? `${meta.center} archive` : null,
              craft,
              link: meta.nasa_id ? `https://images.nasa.gov/details-${meta.nasa_id}` : null,
            };
          })
          .filter((f) => f.thumb),
        totalImages: typeof raw?.collection?.metadata?.total_hits === "number"
          ? raw.collection.metadata.total_hits
          : null,
        latestSol: null,
        service: "nasa-image-library" as const,
        solRequested: sol,
      };
    });
  });

    
// ------------------------------- Space weather alerts ---------------------
export const getDONKI = createServerFn({ method: "GET" }).handler(async () => {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 7);
  const key = nasaKey();
  const startS = isoDate(start);
  const endS = isoDate(end);

  return cached("donki", { start: startS }, 14400, async () => {
    try {
      const url = `https://api.nasa.gov/DONKI/notifications?startDate=${startS}&endDate=${endS}&type=all&api_key=${encodeURIComponent(key)}`;
      const data = await fetchJson(url, { timeoutMs: 15000 });
      if (Array.isArray(data)) return data;
    } catch (e) {
      console.error("DONKI failed, NOAA fallback:", e);
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
  });
});

