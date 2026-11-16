import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      await assertAdmin(context as AdminContext);
      return { isAdmin: true };
    } catch {
      return { isAdmin: false };
    }
  });

/** Source API / pipeline — top level in admin UI. */
export type FeedApiSource =
  | "celestrak"
  | "wheretheiss"
  | "noaa"
  | "nasa"
  | "ll2"
  | "news"
  | "other";

/** Product category under each API (refresh unit). */
export type FeedCategory =
  | "celestrak-leo"
  | "celestrak-starlink"
  | "celestrak-meo"
  | "celestrak-geo"
  | "celestrak-eo"
  | "iss"
  | "noaa"
  | "nasa"
  | "ll2"
  | "news"
  | "other";

export type FeedHealth = {
  feed: string;
  label: string;
  category: FeedCategory;
  apiSource: FeedApiSource;
  ok: boolean;
  source: string | null;
  durationMs: number | null;
  error: string | null;
  cause: string | null;
  checkedAt: string;
  dataFetchedAt: string | null;
  dataAgeSec: number | null;
  okRate: number;
  runs: number;
  integrity: "fresh" | "cached" | "stale" | "down" | "unknown";
};

export type DiagnosticsSummary = {
  totalFeeds: number;
  healthy: number;
  problems: number;
  stale: number;
  down: number;
  checksLastHour: number;
  avgOkRate: number;
  avgDurationMs: number | null;
  strengthScore: number;
  integrityScore: number;
  qualityScore: number;
  overallScore: number;
};

export type ManualRefreshResult = {
  ok: boolean;
  feeds: number;
  failed: number;
  failedNames: string[];
  durationMs: number;
  message: string;
};

export type FeedMeta = {
  label: string;
  category: FeedCategory;
  apiSource: FeedApiSource;
  ttlSeconds: number;
  ageKind: "cache" | "catalog" | "launches_upcoming" | "launches_past" | "none";
  ageKey?: string;
};

/** Aligned with feed-registry.server.ts listRegisteredFeeds(). */
export const FEED_META: Record<string, FeedMeta> = {
  "iss-position": {
    label: "ISS live position",
    category: "iss",
    apiSource: "wheretheiss",
    ttlSeconds: 30,
    ageKind: "cache",
    ageKey: "iss-position",
  },
  "satellites-stations": {
    label: "Space stations",
    category: "celestrak-leo",
    apiSource: "celestrak",
    ttlSeconds: 10800,
    ageKind: "catalog",
    ageKey: "stations",
  },
  "satellites-iridium": {
    label: "Iridium",
    category: "celestrak-leo",
    apiSource: "celestrak",
    ttlSeconds: 14400,
    ageKind: "catalog",
    ageKey: "iridium",
  },
  "satellites-starlink": {
    label: "Starlink catalog",
    category: "celestrak-starlink",
    apiSource: "celestrak",
    ttlSeconds: 21600,
    ageKind: "catalog",
    ageKey: "starlink",
  },
  "satellites-active": {
    label: "Active satellites",
    category: "celestrak-leo",
    apiSource: "celestrak",
    ttlSeconds: 21600,
    ageKind: "catalog",
    ageKey: "active",
  },
  "satellites-geo": {
    label: "Geosynchronous (GEO)",
    category: "celestrak-geo",
    apiSource: "celestrak",
    ttlSeconds: 21600,
    ageKind: "catalog",
    ageKey: "geo",
  },
  "satellites-gps-ops": {
    label: "GPS (MEO)",
    category: "celestrak-meo",
    apiSource: "celestrak",
    ttlSeconds: 14400,
    ageKind: "catalog",
    ageKey: "gps-ops",
  },
  "satellites-weather": {
    label: "Weather satellites",
    category: "celestrak-eo",
    apiSource: "celestrak",
    ttlSeconds: 14400,
    ageKind: "catalog",
    ageKey: "weather",
  },
  "satellites-science": {
    label: "Science satellites",
    category: "celestrak-eo",
    apiSource: "celestrak",
    ttlSeconds: 14400,
    ageKind: "catalog",
    ageKey: "science",
  },
  "satellites-resource": {
    label: "Earth observation",
    category: "celestrak-eo",
    apiSource: "celestrak",
    ttlSeconds: 14400,
    ageKind: "catalog",
    ageKey: "resource",
  },
  "satellites-sso": {
    label: "Sun-synchronous (SSO)",
    category: "celestrak-eo",
    apiSource: "celestrak",
    ttlSeconds: 14400,
    ageKind: "catalog",
    ageKey: "sso",
  },
  "kp-index": {
    label: "Planetary K-index",
    category: "noaa",
    apiSource: "noaa",
    ttlSeconds: 600,
    ageKind: "cache",
    ageKey: "kp-index",
  },
  "solar-wind": {
    label: "Solar wind",
    category: "noaa",
    apiSource: "noaa",
    ttlSeconds: 600,
    ageKind: "cache",
    ageKey: "solar-wind-v2",
  },
  "xray-flux": {
    label: "GOES X-ray flux",
    category: "noaa",
    apiSource: "noaa",
    ttlSeconds: 600,
    ageKind: "cache",
    ageKey: "xray-flux",
  },
  "space-weather-alerts": {
    label: "DONKI alerts",
    category: "nasa",
    apiSource: "nasa",
    ttlSeconds: 14400,
    ageKind: "cache",
    ageKey: "donki",
  },
  launches: {
    label: "Upcoming launches",
    category: "ll2",
    apiSource: "ll2",
    ttlSeconds: 7200,
    ageKind: "launches_upcoming",
  },
  "past-launches": {
    label: "Past launches",
    category: "ll2",
    apiSource: "ll2",
    ttlSeconds: 43200,
    ageKind: "launches_past",
  },
  "mars-perseverance": {
    label: "Mars Perseverance imagery",
    category: "nasa",
    apiSource: "nasa",
    ttlSeconds: 7200,
    ageKind: "cache",
    ageKey: "mars-imagery",
  },
  asteroids: {
    label: "Near-Earth objects",
    category: "nasa",
    apiSource: "nasa",
    ttlSeconds: 43200,
    ageKind: "cache",
    ageKey: "neo",
  },
  "picture-of-the-day": {
    label: "Astronomy Picture of the Day",
    category: "nasa",
    apiSource: "nasa",
    ttlSeconds: 21600,
    ageKind: "cache",
    ageKey: "apod",
  },
  "space-news": {
    label: "Space news",
    category: "news",
    apiSource: "news",
    ttlSeconds: 21600,
    ageKind: "none",
  },
};

export const CATEGORY_META: Record<
  FeedCategory,
  { label: string; apiSource: FeedApiSource; description: string }
> = {
  "celestrak-leo": {
    label: "LEO · stations & ops",
    apiSource: "celestrak",
    description: "Stations, Iridium, active catalog (CelesTrak).",
  },
  "celestrak-starlink": {
    label: "Starlink",
    apiSource: "celestrak",
    description: "Heavy catalog — refresh alone when possible.",
  },
  "celestrak-meo": {
    label: "MEO · navigation",
    apiSource: "celestrak",
    description: "GPS and other navigation constellations.",
  },
  "celestrak-geo": {
    label: "GEO",
    apiSource: "celestrak",
    description: "Geosynchronous catalog — heavy.",
  },
  "celestrak-eo": {
    label: "EO · weather · science · SSO",
    apiSource: "celestrak",
    description: "Earth observation, weather, science, sun-synchronous.",
  },
  iss: {
    label: "ISS live",
    apiSource: "wheretheiss",
    description: "Where is the ISS — high cadence.",
  },
  noaa: {
    label: "NOAA space weather",
    apiSource: "noaa",
    description: "Kp, solar wind, X-ray flux.",
  },
  nasa: {
    label: "NASA",
    apiSource: "nasa",
    description: "APOD, NEO, DONKI, Mars imagery.",
  },
  ll2: {
    label: "Launch Library",
    apiSource: "ll2",
    description: "Prefer GitHub LL2 seed; admin checks cache age.",
  },
  news: {
    label: "News",
    apiSource: "news",
    description: "SNAPI / NASA news pipeline.",
  },
  other: {
    label: "Other",
    apiSource: "other",
    description: "Uncategorized registry feeds.",
  },
};

export const CATEGORY_ORDER: FeedCategory[] = [
  "iss",
  "celestrak-leo",
  "celestrak-starlink",
  "celestrak-meo",
  "celestrak-geo",
  "celestrak-eo",
  "noaa",
  "nasa",
  "ll2",
  "news",
  "other",
];

export const API_SOURCE_ORDER: FeedApiSource[] = [
  "wheretheiss",
  "celestrak",
  "noaa",
  "nasa",
  "ll2",
  "news",
  "other",
];

export const API_SOURCE_LABEL: Record<FeedApiSource, string> = {
  celestrak: "CelesTrak",
  wheretheiss: "Where is the ISS",
  noaa: "NOAA",
  nasa: "NASA",
  ll2: "Launch Library 2 (GitHub seed)",
  news: "News APIs",
  other: "Other",
};

function metaFor(feed: string): FeedMeta {
  return (
    FEED_META[feed] ?? {
      label: feed,
      category: "other" as const,
      apiSource: "other" as const,
      ttlSeconds: 3600,
      ageKind: "none" as const,
    }
  );
}

export function feedsInCategory(category: FeedCategory, registry: string[]): string[] {
  return registry.filter((name) => metaFor(name).category === category);
}

function diagnoseFromEvent(
  ok: boolean,
  source: string | null,
  error: string | null,
): { cause: string | null; integrity: FeedHealth["integrity"] } {
  if (ok && source === "fresh") return { cause: null, integrity: "fresh" };
  if (ok && (source === "cache" || source === "github-seed" || source === "skipped")) {
    return {
      cause: "Valid data in store; upstream not required this cycle.",
      integrity: "cached",
    };
  }
  if (source === "stale" || (error && /last saved copy/i.test(error))) {
    return {
      cause: "Upstream failed or timed out. STELLUN may still show the last saved copy.",
      integrity: "stale",
    };
  }
  if (!ok) {
    const msg = (error ?? "").toLowerCase();
    if (/timeout|abort|aborted/.test(msg)) {
      return { cause: "Request timed out or was aborted.", integrity: "down" };
    }
    if (/HTTP 429|rate/i.test(error ?? "")) {
      return { cause: "Upstream rate limit (HTTP 429).", integrity: "down" };
    }
    if (/HTTP 401|HTTP 403|unauthorized|forbidden/i.test(error ?? "")) {
      return { cause: "Auth or permission failure on upstream.", integrity: "down" };
    }
    if (/HTTP 5\d\d/.test(error ?? "")) {
      return { cause: "Upstream server error (5xx).", integrity: "down" };
    }
    return { cause: error, integrity: "down" };
  }
  return { cause: error, integrity: "unknown" };
}

function integrityFromDataAge(
  ageSec: number | null,
  ttlSeconds: number,
): { ok: boolean; integrity: FeedHealth["integrity"]; cause: string | null } {
  if (ageSec == null || !Number.isFinite(ageSec)) {
    return {
      ok: false,
      integrity: "unknown",
      cause: "No data row found in Supabase for this feed yet.",
    };
  }
  if (ageSec <= ttlSeconds) {
    return {
      ok: true,
      integrity: ageSec <= Math.max(60, ttlSeconds * 0.35) ? "fresh" : "cached",
      cause: null,
    };
  }
  if (ageSec <= ttlSeconds * 3) {
    return {
      ok: false,
      integrity: "stale",
      cause:
        "Data is " +
        Math.round(ageSec / 3600) +
        "h old (TTL " +
        Math.round(ttlSeconds / 60) +
        "m). Refresh this category or feed.",
    };
  }
  return {
    ok: false,
    integrity: "down",
    cause:
      "Data is " +
      Math.round(ageSec / 3600) +
      "h old — well past expected refresh window.",
  };
}

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

const ADMIN_EMAILS = ["benyyeks@gmail.com"];

type AdminContext = {
  supabase: any;
  userId: string;
  claims?: { email?: string; user_metadata?: { email?: string } };
};

async function resolveEmail(context: AdminContext): Promise<string> {
  const fromClaims = String(context.claims?.email ?? "")
    .toLowerCase()
    .trim();
  if (fromClaims) return fromClaims;
  try {
    const { data } = await context.supabase.auth.getUser();
    return String(data?.user?.email ?? "")
      .toLowerCase()
      .trim();
  } catch {
    return "";
  }
}

async function assertAdmin(context: AdminContext) {
  const email = await resolveEmail(context);
  if (!ADMIN_EMAILS.includes(email)) throw new Error("Forbidden");
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (isAdmin !== true) throw new Error("Forbidden");
}

export const runFeedRefresh = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        feed: z.string().min(1).max(80).optional(),
        category: z
          .enum([
            "celestrak-leo",
            "celestrak-starlink",
            "celestrak-meo",
            "celestrak-geo",
            "celestrak-eo",
            "iss",
            "noaa",
            "nasa",
            "ll2",
            "news",
            "other",
          ])
          .optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ context, data }): Promise<ManualRefreshResult> => {
    await assertAdmin(context);
    const t0 = Date.now();
    try {
      const { runRefreshCycle, listRegisteredFeeds } = await import(
        "@/lib/feed-registry.server"
      );

      let targets: string[] | null = null;
      if (data.feed) {
        targets = [data.feed];
      } else if (data.category) {
        targets = feedsInCategory(data.category, listRegisteredFeeds());
        if (targets.length === 0) {
          return {
            ok: false,
            feeds: 0,
            failed: 0,
            failedNames: [],
            durationMs: Date.now() - t0,
            message: 'No registered feeds in category "' + data.category + '".',
          };
        }
      }

      const allResults: Array<{
        feed: string;
        ok: boolean;
        source: string;
        duration_ms: number;
        error: string | null;
      }> = [];

      if (targets) {
        for (const name of targets) {
          const part = await runRefreshCycle({ force: true, only: name });
          allResults.push(...part);
        }
      } else {
        const part = await runRefreshCycle({ force: true });
        allResults.push(...part);
      }

      const failed = allResults.filter((r) => !r.ok);
      const failedNames = failed.map((r) => r.feed);
      const durationMs = Date.now() - t0;

      if (failed.length === 0) {
        return {
          ok: true,
          feeds: allResults.length,
          failed: 0,
          failedNames: [],
          durationMs,
          message: data.feed
            ? "Refreshed " + data.feed + " successfully in " + durationMs + " ms."
            : data.category
              ? 'Category "' +
                data.category +
                '": ' +
                allResults.length +
                " feed(s) OK in " +
                durationMs +
                " ms."
              : "All " + allResults.length + " feeds checked successfully in " + durationMs + " ms.",
        };
      }

      const detail = failed
        .map((r) => r.feed + ": " + (r.error ?? r.source ?? "failed"))
        .join(" | ")
        .slice(0, 400);

      return {
        ok: false,
        feeds: allResults.length,
        failed: failed.length,
        failedNames,
        durationMs,
        message: data.feed
          ? "Refresh of " + data.feed + " failed. " + detail
          : data.category
            ? 'Category "' +
              data.category +
              '": ' +
              failed.length +
              "/" +
              allResults.length +
              " failed. " +
              detail
            : failed.length +
              " of " +
              allResults.length +
              " feeds still have problems. " +
              detail,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        feeds: 0,
        failed: 0,
        failedNames: [],
        durationMs: Date.now() - t0,
        message: "Refresh could not complete: " + msg.slice(0, 240),
      };
    }
  });

export const getDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data: events, error } = await context.supabase
      .from("diagnostics_events")
      .select("feed,ok,source,duration_ms,error,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) throw new Error("Could not load diagnostics");

    const { listRegisteredFeeds } = await import("@/lib/feed-registry.server");
    const registry = listRegisteredFeeds();

    const { data: cacheRows } = await context.supabase
      .from("api_cache")
      .select("endpoint,fetched_at,cache_key")
      .order("fetched_at", { ascending: false })
      .limit(800);

    const newestByEndpoint = new Map<string, string>();
    for (const row of cacheRows ?? []) {
      const ep = String(row.endpoint ?? "");
      const key = String(row.cache_key ?? "");
      if (!ep || key.includes("toString") || key.includes("{endpoint}")) continue;
      const fa = String(row.fetched_at ?? "");
      const prev = newestByEndpoint.get(ep);
      if (!prev || new Date(fa).getTime() > new Date(prev).getTime()) {
        newestByEndpoint.set(ep, fa);
      }
    }

    const { data: catalogRows } = await context.supabase
      .from("satellite_catalog_status")
      .select("group_id,finished_at,updated_at,status,loaded_count,error");

    const catalogByGroup = new Map<
      string,
      { finished_at: string | null; error: string | null; loaded_count: number | null }
    >();
    for (const row of catalogRows ?? []) {
      catalogByGroup.set(String(row.group_id), {
        finished_at: row.finished_at ?? row.updated_at ?? null,
        error: row.error ?? null,
        loaded_count: row.loaded_count ?? null,
      });
    }

    const { data: launchUpcoming } = await context.supabase
      .from("launches")
      .select("updated_at")
      .eq("kind", "upcoming")
      .order("updated_at", { ascending: false })
      .limit(1);
    const { data: launchPast } = await context.supabase
      .from("launches")
      .select("updated_at")
      .eq("kind", "past")
      .order("updated_at", { ascending: false })
      .limit(1);

    const launchesUpcomingAt = launchUpcoming?.[0]?.updated_at
      ? String(launchUpcoming[0].updated_at)
      : null;
    const launchesPastAt = launchPast?.[0]?.updated_at
      ? String(launchPast[0].updated_at)
      : null;

    function resolveDataFetchedAt(feed: string): string | null {
      const m = metaFor(feed);
      if (m.ageKind === "cache" && m.ageKey) {
        return (
          newestByEndpoint.get(m.ageKey) ??
          (m.ageKey === "solar-wind-v2" ? newestByEndpoint.get("solar-wind") : null) ??
          null
        );
      }
      if (m.ageKind === "catalog" && m.ageKey) {
        const c = catalogByGroup.get(m.ageKey);
        return c?.finished_at ?? null;
      }
      if (m.ageKind === "launches_upcoming") {
        return launchesUpcomingAt ?? newestByEndpoint.get("launches") ?? null;
      }
      if (m.ageKind === "launches_past") {
        return launchesPastAt ?? newestByEndpoint.get("launches-previous") ?? null;
      }
      return null;
    }

    const byFeed = new Map<string, FeedHealth>();
    const counts = new Map<string, { ok: number; all: number }>();
    const eventApplied = new Set<string>();
    const now = Date.now();

    for (const name of registry) {
      const m = metaFor(name);
      const dataFetchedAt = resolveDataFetchedAt(name);
      const dataMs = dataFetchedAt ? new Date(dataFetchedAt).getTime() : NaN;
      const dataAgeSec = Number.isFinite(dataMs) ? (now - dataMs) / 1000 : null;
      const fromData = integrityFromDataAge(dataAgeSec, m.ttlSeconds);

      byFeed.set(name, {
        feed: name,
        label: m.label,
        category: m.category,
        apiSource: m.apiSource,
        ok: fromData.ok,
        source: dataFetchedAt ? "supabase" : null,
        durationMs: null,
        error: null,
        cause: fromData.cause,
        checkedAt: dataFetchedAt ?? "",
        dataFetchedAt,
        dataAgeSec,
        okRate: 0,
        runs: 0,
        integrity: fromData.integrity,
      });
    }

    for (const r of events ?? []) {
      if (r.feed === "_diagnostics_write") continue;

      const c = counts.get(r.feed) ?? { ok: 0, all: 0 };
      c.all += 1;
      if (r.ok) c.ok += 1;
      counts.set(r.feed, c);

      if (!byFeed.has(r.feed)) {
        const m = metaFor(r.feed);
        byFeed.set(r.feed, {
          feed: r.feed,
          label: m.label,
          category: m.category,
          apiSource: m.apiSource,
          ok: r.ok,
          source: r.source,
          durationMs: r.duration_ms,
          error: r.error,
          cause: null,
          checkedAt: r.created_at,
          dataFetchedAt: null,
          dataAgeSec: null,
          okRate: 0,
          runs: 0,
          integrity: "unknown",
        });
      }

      if (eventApplied.has(r.feed)) continue;
      eventApplied.add(r.feed);

      const cur = byFeed.get(r.feed)!;
      const fromEvent = diagnoseFromEvent(r.ok, r.source, r.error);
      const dataHealthy =
        cur.dataAgeSec != null &&
        (cur.integrity === "fresh" || cur.integrity === "cached");

      if (dataHealthy && !r.ok) {
        byFeed.set(r.feed, {
          ...cur,
          source: r.source ?? cur.source,
          durationMs: r.duration_ms,
          error: r.error,
          cause:
            (cur.cause ? cur.cause + " " : "") +
            "Last Worker attempt failed (" +
            (r.error ?? r.source) +
            "); data in Supabase is still within window.",
          checkedAt: r.created_at,
        });
      } else if (!dataHealthy) {
        byFeed.set(r.feed, {
          ...cur,
          ok: r.ok,
          source: r.source,
          durationMs: r.duration_ms,
          error: r.error,
          cause: fromEvent.cause ?? cur.cause,
          checkedAt: r.created_at,
          integrity: fromEvent.integrity,
        });
      } else {
        byFeed.set(r.feed, {
          ...cur,
          source: r.source ?? cur.source,
          durationMs: r.duration_ms,
          checkedAt: r.created_at || cur.checkedAt,
        });
      }
    }

    for (const [feed, c] of counts) {
      const cur = byFeed.get(feed);
      if (!cur) continue;
      byFeed.set(feed, {
        ...cur,
        runs: c.all,
        okRate: c.all ? c.ok / c.all : 0,
      });
    }

    const feeds: FeedHealth[] = [...byFeed.values()].sort((a, b) => {
      if (a.apiSource !== b.apiSource) {
        return (
          API_SOURCE_ORDER.indexOf(a.apiSource) - API_SOURCE_ORDER.indexOf(b.apiSource)
        );
      }
      if (a.category !== b.category) {
        return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
      }
      return a.label.localeCompare(b.label);
    });

    const totalFeeds = feeds.length;
    const healthy = feeds.filter((f) => f.ok).length;
    const problems = totalFeeds - healthy;
    const stale = feeds.filter((f) => f.integrity === "stale").length;
    const down = feeds.filter((f) => f.integrity === "down").length;
    const checksLastHour = feeds.reduce((s, f) => s + f.runs, 0);
    const avgOkRate = totalFeeds
      ? feeds.reduce((s, f) => s + f.okRate, 0) / totalFeeds
      : 0;
    const durations = feeds
      .map((f) => f.durationMs)
      .filter((n): n is number => typeof n === "number");
    const avgDurationMs = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    const serving = feeds.filter(
      (f) => f.integrity !== "down" && f.integrity !== "unknown",
    ).length;
    const strengthScore = totalFeeds ? clampScore((serving / totalFeeds) * 100) : 0;
    const integrityWeights = {
      fresh: 1,
      cached: 0.9,
      stale: 0.45,
      down: 0,
      unknown: 0.25,
    };
    const integrityScore = totalFeeds
      ? clampScore(
          (feeds.reduce((s, f) => s + (integrityWeights[f.integrity] ?? 0), 0) /
            totalFeeds) *
            100,
        )
      : 0;
    const qualityScore = clampScore(totalFeeds ? (healthy / totalFeeds) * 100 : 0);
    const overallScore = clampScore(
      strengthScore * 0.35 + integrityScore * 0.35 + qualityScore * 0.3,
    );

    const summary: DiagnosticsSummary = {
      totalFeeds,
      healthy,
      problems,
      stale,
      down,
      checksLastHour,
      avgOkRate,
      avgDurationMs,
      strengthScore,
      integrityScore,
      qualityScore,
      overallScore,
    };

    const { data: quotaRows } = await context.supabase
      .from("api_quota")
      .select("provider,rate_limit,remaining,checked_at");
    const quota = (quotaRows ?? []).map(
      (q: {
        provider: string;
        rate_limit: number | null;
        remaining: number | null;
        checked_at: string | null;
      }) => ({
        provider: q.provider,
        rateLimit: q.rate_limit,
        remaining: q.remaining,
        checkedAt: q.checked_at,
      }),
    );

    const problemFeeds = feeds.filter(
      (f) => !f.ok || f.integrity === "stale" || f.integrity === "down",
    );

    return {
      feeds,
      problemFeeds,
      summary,
      quota,
      categories: CATEGORY_ORDER.map((id) => ({
        id,
        ...CATEGORY_META[id],
        feedIds: feedsInCategory(id, registry),
      })),
      lastCycle: events?.[0]?.created_at ?? null,
      serverTime: new Date().toISOString(),
    };
  });

export type SuggestionRow = {
  id: string;
  createdAt: string;
  type: string;
  message: string;
  name: string | null;
  email: string | null;
  status: string;
};

export type ErrorEventRow = {
  id: string;
  createdAt: string;
  source: string;
  message: string;
  path: string | null;
  detail: string | null;
  resolved: boolean;
};

export const getSuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as AdminContext);
    const { data, error } = await context.supabase
      .from("site_suggestions")
      .select("id,created_at,type,message,name,email,status")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Could not load suggestions");
    return {
      items: (data ?? []).map(
        (r: {
          id: string;
          created_at: string;
          type: string;
          message: string;
          name: string | null;
          email: string | null;
          status: string;
        }) => ({
          id: r.id,
          createdAt: r.created_at,
          type: r.type,
          message: r.message,
          name: r.name,
          email: r.email,
          status: r.status,
        }),
      ) as SuggestionRow[],
    };
  });

export const setSuggestionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["new", "read", "done"]) })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as AdminContext);
    const { error } = await context.supabase
      .from("site_suggestions")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error("Could not update suggestion");
    return { ok: true };
  });

export const getErrorEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as AdminContext);
    const { data, error } = await context.supabase
      .from("site_error_events")
      .select("id,created_at,source,message,path,detail,resolved")
      .order("created_at", { ascending: false })
      .limit(150);
    if (error) throw new Error("Could not load error events");
    return {
      items: (data ?? []).map(
        (r: {
          id: string;
          created_at: string;
          source: string;
          message: string;
          path: string | null;
          detail: string | null;
          resolved: boolean;
        }) => ({
          id: r.id,
          createdAt: r.created_at,
          source: r.source,
          message: r.message,
          path: r.path,
          detail: r.detail,
          resolved: !!r.resolved,
        }),
      ) as ErrorEventRow[],
    };
  });

export const setErrorResolved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), resolved: z.boolean() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as AdminContext);
    const { error } = await context.supabase
      .from("site_error_events")
      .update({ resolved: data.resolved })
      .eq("id", data.id);
    if (error) throw new Error("Could not update error event");
    return { ok: true };
  });

export const submitSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        type: z.enum(["suggestion", "bug", "data", "other"]).default("suggestion"),
        message: z.string().trim().min(8).max(4000),
        name: z.string().trim().max(120).optional(),
        email: z.string().trim().email().max(200).optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const row = {
      type: data.type,
      message: data.message,
      name: data.name || null,
      email: data.email || null,
      user_id: context.userId,
      status: "new",
    };
    const { error } = await context.supabase.from("site_suggestions").insert(row);
    if (error) throw new Error("Could not save suggestion");
    try {
      const { sendFeedbackEmail } = await import("@/lib/feedback-mail.server");
      await sendFeedbackEmail({
        name: row.name ?? "STELLUN user",
        email: row.email ?? "",
        type: row.type,
        message: row.message,
      });
    } catch {
      /* ignore */
    }
    return { ok: true };
  });

export const reportClientError = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        message: z.string().trim().min(1).max(500),
        path: z.string().trim().max(300).optional(),
        detail: z.string().trim().max(2000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    try {
      await context.supabase.from("site_error_events").insert({
        source: "client",
        message: data.message,
        path: data.path ?? null,
        detail: data.detail ?? null,
        resolved: false,
        user_id: context.userId,
      });
    } catch {
      /* ignore */
    }
    return { ok: true };
  });
