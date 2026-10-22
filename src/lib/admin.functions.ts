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

export type FeedCategory =
  | "orbital"
  | "navigation"
  | "debris"
  | "space-weather"
  | "missions"
  | "other";

export type FeedHealth = {
  feed: string;
  label: string;
  category: FeedCategory;
  ok: boolean;
  source: string | null;
  durationMs: number | null;
  error: string | null;
  cause: string | null;
  checkedAt: string;
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

const FEED_META: Record<string, { label: string; category: FeedCategory }> = {
  "iss-position": { label: "ISS live position", category: "orbital" },
  "satellites-stations": { label: "Space stations (CelesTrak)", category: "orbital" },
  "satellites-starlink": { label: "Starlink catalog", category: "orbital" },
  "satellites-active": { label: "Active satellites catalog", category: "orbital" },
  "satellites-geo": { label: "Geosynchronous catalog", category: "orbital" },
  "satellites-iridium-NEXT": { label: "Iridium NEXT", category: "orbital" },
  "satellites-resource": { label: "Earth observation", category: "orbital" },
  "satellites-weather": { label: "Weather satellites", category: "orbital" },
  "satellites-science": { label: "Science satellites", category: "orbital" },
  "satellites-sso": { label: "Sun-synchronous (SSO)", category: "orbital" },
  "satellites-gps-ops": { label: "GPS", category: "navigation" },
  "satellites-galileo": { label: "Galileo", category: "navigation" },
  "satellites-glo-ops": { label: "GLONASS", category: "navigation" },
  "satellites-beidou": { label: "BeiDou", category: "navigation" },
  "satellites-cosmos-2251-debris": { label: "Cosmos 2251 debris", category: "debris" },
  "satellites-iridium-33-debris": { label: "Iridium 33 debris", category: "debris" },
  "satellites-19820": { label: "Cosmos 1408 debris", category: "debris" },
  "kp-index": { label: "Planetary K-index", category: "space-weather" },
  "solar-wind": { label: "Solar wind (plasma + mag)", category: "space-weather" },
  "xray-flux": { label: "GOES X-ray flux", category: "space-weather" },
  "space-weather-alerts": { label: "DONKI alerts", category: "space-weather" },
  launches: { label: "Upcoming launches", category: "missions" },
  "past-launches": { label: "Recent launches", category: "missions" },
  "mars-perseverance": { label: "Mars Perseverance imagery", category: "missions" },
  asteroids: { label: "Near-Earth objects", category: "missions" },
  "picture-of-the-day": { label: "Astronomy Picture of the Day", category: "missions" },
};

function metaFor(feed: string) {
  return FEED_META[feed] ?? { label: feed, category: "other" as const };
}

function diagnoseCause(
  ok: boolean,
  source: string | null,
  error: string | null,
): { cause: string | null; integrity: FeedHealth["integrity"] } {
  if (ok && source === "fresh") {
    return { cause: null, integrity: "fresh" };
  }
  if (ok && source === "cache") {
    return {
      cause: "Serving a valid cached copy within its TTL. Upstream was not contacted this cycle.",
      integrity: "cached",
    };
  }
  if (source === "stale" || (error && /last saved copy/i.test(error))) {
    return {
      cause:
        "Upstream source failed or timed out. STELLUN is showing the last saved copy so the page still works. Check CelesTrak, NOAA, NASA, or Launch Library reachability.",
      integrity: "stale",
    };
  }
  if (!ok) {
    const msg = (error ?? "").toLowerCase();
    if (/timeout|abort|aborted/.test(msg)) {
      return {
        cause:
          "Request timed out. Heavy catalogs (Starlink, active, GEO, debris) need a long window; the upstream may be slow or rate-limiting.",
        integrity: "down",
      };
    }
    if (/HTTP 429|rate/i.test(error ?? "")) {
      return {
        cause: "Upstream rate limit (HTTP 429). Reduce refresh pressure or wait for the quota window to reset.",
        integrity: "down",
      };
    }
    if (/HTTP 401|HTTP 403|unauthorized|forbidden/i.test(error ?? "")) {
      return {
        cause: "Auth or permission failure. Check API keys (NASA, Launch Library) in server environment variables.",
        integrity: "down",
      };
    }
    if (/HTTP 5\d\d/.test(error ?? "")) {
      return {
        cause: "Upstream server error. The provider is failing; retry later. Cached data is not available for this feed yet.",
        integrity: "down",
      };
    }
    if (/ENOTFOUND|ECONNREFUSED|network|fetch failed/i.test(error ?? "")) {
      return {
        cause: "Network failure reaching the upstream host. DNS, firewall, or provider outage.",
        integrity: "down",
      };
    }
    if (!error) {
      return {
        cause: "Feed reported a problem with no error detail. Inspect server logs for this feed name.",
        integrity: "down",
      };
    }
    return { cause: error, integrity: "down" };
  }
  return { cause: error, integrity: "unknown" };
}

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Only this account may use admin APIs. Role alone is not enough. */
const ADMIN_EMAILS = ["benyyeks@gmail.com"];

type AdminContext = {
  supabase: any;
  userId: string;
  claims?: { email?: string; user_metadata?: { email?: string } };
};

async function resolveEmail(context: AdminContext): Promise<string> {
  const fromClaims = String(
    context.claims?.email ?? "",
  ).toLowerCase().trim();
  if (fromClaims) return fromClaims;
  try {
    const { data } = await context.supabase.auth.getUser();
    return String(data?.user?.email ?? "").toLowerCase().trim();
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

/**
 * Manual full-cycle refresh for admins. Runs the same registry as the
 * scheduler, immediately. Each feed still goes through cached(): upstream is
 * contacted when the cache row is past TTL or missing. Use when feeds are down.
 */
export const runFeedRefresh = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManualRefreshResult> => {
    await assertAdmin(context);
    const t0 = Date.now();
    try {
      const { runRefreshCycle } = await import("@/lib/feed-registry.server");
      const results = await runRefreshCycle({ force: true });
      const failed = results.filter((r) => !r.ok);
      const failedNames = failed.map((r) => r.feed);
      const durationMs = Date.now() - t0;
      if (failed.length === 0) {
        return {
          ok: true,
          feeds: results.length,
          failed: 0,
          failedNames: [],
          durationMs,
          message: `All ${results.length} feeds checked successfully in ${durationMs} ms.`,
        };
      }
      return {
        ok: false,
        feeds: results.length,
        failed: failed.length,
        failedNames,
        durationMs,
        message: `${failed.length} of ${results.length} feeds still have problems after this run.`,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        feeds: 0,
        failed: 0,
        failedNames: [],
        durationMs: Date.now() - t0,
        message: `Refresh could not complete: ${msg.slice(0, 240)}`,
      };
    }
  });

export const getDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const since = new Date(Date.now() - 3600_000).toISOString();
    const { data, error } = await context.supabase
      .from("diagnostics_events")
      .select("feed,ok,source,duration_ms,error,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) throw new Error("Could not load diagnostics");

    const byFeed = new Map<string, FeedHealth>();
    const counts = new Map<string, { ok: number; all: number }>();

    for (const r of data ?? []) {
      const c = counts.get(r.feed) ?? { ok: 0, all: 0 };
      c.all++;
      if (r.ok) c.ok++;
      counts.set(r.feed, c);

      if (!byFeed.has(r.feed)) {
        const m = metaFor(r.feed);
        const { cause, integrity } = diagnoseCause(r.ok, r.source, r.error);
        byFeed.set(r.feed, {
          feed: r.feed,
          label: m.label,
          category: m.category,
          ok: r.ok,
          source: r.source,
          durationMs: r.duration_ms,
          error: r.error,
          cause,
          checkedAt: r.created_at,
          okRate: 0,
          runs: 0,
          integrity,
        });
      }
    }

    const feeds: FeedHealth[] = [...byFeed.values()]
      .map((f) => {
        const c = counts.get(f.feed) ?? { ok: 0, all: 0 };
        return {
          ...f,
          runs: c.all,
          okRate: c.all ? c.ok / c.all : 0,
        };
      })
      .sort((a, b) => {
        if (a.ok !== b.ok) return a.ok ? 1 : -1;
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.label.localeCompare(b.label);
      });

    const totalFeeds = feeds.length;
    const healthy = feeds.filter((f) => f.ok).length;
    const problems = totalFeeds - healthy;
    const stale = feeds.filter((f) => f.integrity === "stale").length;
    const down = feeds.filter((f) => f.integrity === "down").length;
    const checksLastHour = feeds.reduce((s, f) => s + f.runs, 0);
    const avgOkRate = totalFeeds ? feeds.reduce((s, f) => s + f.okRate, 0) / totalFeeds : 0;
    const durations = feeds.map((f) => f.durationMs).filter((n): n is number => typeof n === "number");
    const avgDurationMs = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    const serving = feeds.filter((f) => f.integrity !== "down" && f.integrity !== "unknown").length;
    const strengthScore = totalFeeds ? clampScore((serving / totalFeeds) * 100) : 0;
    const integrityWeights = { fresh: 1, cached: 0.9, stale: 0.45, down: 0, unknown: 0.2 };
    const integrityScore = totalFeeds
      ? clampScore(
          (feeds.reduce((s, f) => s + (integrityWeights[f.integrity] ?? 0), 0) / totalFeeds) * 100,
        )
      : 0;
    const qualityScore = clampScore(avgOkRate * 100);
    const overallScore = clampScore(strengthScore * 0.35 + integrityScore * 0.35 + qualityScore * 0.3);

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
    const quota = (quotaRows ?? []).map((q) => ({
      provider: q.provider,
      rateLimit: q.rate_limit,
      remaining: q.remaining,
      checkedAt: q.checked_at,
    }));

    const problemFeeds = feeds.filter((f) => !f.ok || f.integrity === "stale" || f.integrity === "down");

    return {
      feeds,
      problemFeeds,
      summary,
      quota,
      lastCycle: data?.[0]?.created_at ?? null,
      serverTime: new Date().toISOString(),
    };
  });



// -------------------- Suggestions & client/server error inbox --------------------

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
      items: (data ?? []).map((r: {
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
      })) as SuggestionRow[],
    };
  });

export const setSuggestionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["new", "read", "done"]) }).parse(data),
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
      items: (data ?? []).map((r: {
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
      })) as ErrorEventRow[],
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

/** Any signed-in user can send a suggestion. */
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

/** Signed-in client error reports (sanitized, short). */
export const reportClientError = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        source: z.string().max(32).default("client"),
        message: z.string().trim().min(1).max(500),
        path: z.string().max(300).optional(),
        detail: z.string().max(1500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("site_error_events").insert({
      source: data.source || "client",
      message: data.message,
      path: data.path || null,
      detail: data.detail || null,
      user_id: context.userId,
      resolved: false,
    });
    if (error) throw new Error("Could not record error");
    return { ok: true };
  });
