// Server-only read-through cache for upstream API responses, backed by the
// public.api_cache table. Used by every STELLUN data page to avoid
// re-fetching the same upstream payload on every request, and to fall back
// to a slightly stale copy if the upstream source is temporarily down.
//
// All cache writes go through the service-role client (RLS is bypassed),
// loaded inside the handler so the server-only module never reaches the
// client bundle.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type CacheResult<T> = {
  data: T;
  source: "fresh" | "stale" | "cache";
  fetchedAt: string;
  isStale: boolean;
};

function publishableClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Deterministic cache key from an endpoint name and a stable JSON of params.
export function cacheKey(endpoint: string, params: unknown): string {
  const json = JSON.stringify(params ?? {});
  let h = 5381;
  for (let i = 0; i < json.length; i++) {
    h = (h * 33) ^ json.charCodeAt(i);
  }
  return `${endpoint}:${(h >>> 0).toString(36)}`;
}

async function readCache<T>(key: string, ttlSeconds: number) {
  const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");
  const { data } = await supabase
    .from("api_cache")
    .select("payload,fetched_at,ttl_seconds")
    .eq("cache_key", key)
    .maybeSingle();
  if (!data) return null;
  const fetchedAt = new Date(data.fetched_at).getTime();
  const ageSec = (Date.now() - fetchedAt) / 1000;
  return {
    payload: data.payload as T,
    fetchedAt: data.fetched_at,
    isStale: ageSec > (data.ttl_seconds ?? ttlSeconds),
  };
}

async function writeCache(key: string, endpoint: string, payload: unknown, ttlSeconds: number) {
  try {
    const admin = await adminClient();
    await admin.from("api_cache").upsert(
      {
        cache_key: key,
        endpoint,
        payload: JSON.parse(JSON.stringify(payload)),
        fetched_at: new Date().toISOString(),
        ttl_seconds: ttlSeconds,
      },
      { onConflict: "cache_key" },
    );
  } catch (err) {
    console.error(`api_cache write failed for ${endpoint}:`, err);
  }
}

/**
 * Read-through cache with stale-on-error fallback.
 * Pass opts.force = true (admin refresh) to ignore TTL and re-hit upstream.
 */
export async function cached<T>(
  endpoint: string,
  params: unknown,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  opts?: { force?: boolean },
): Promise<CacheResult<T>> {
  const key = cacheKey(endpoint, params);
  const cachedRow = await readCache<T>(key, ttlSeconds);

  // Fresh cache hit — skip when admin force-refresh is on
  if (!opts?.force && cachedRow && !cachedRow.isStale) {
    return {
      data: cachedRow.payload,
      source: "cache",
      fetchedAt: cachedRow.fetchedAt,
      isStale: false,
    };
  }

  try {
    const fresh = await fetcher();
    void writeCache(key, endpoint, fresh, ttlSeconds);
    return {
      data: fresh,
      source: "fresh",
      fetchedAt: new Date().toISOString(),
      isStale: false,
    };
  } catch (err) {
    if (cachedRow) {
      console.error(`upstream ${endpoint} failed; serving stale cache:`, err);
      return {
        data: cachedRow.payload,
        source: "stale",
        fetchedAt: cachedRow.fetchedAt,
        isStale: true,
      };
    }
    throw err;
  }
}
/**
 * READ-ONLY: serve Supabase api_cache only. Never calls upstream.
 * Use for user-facing pages (launches, etc.).
 * Writers: cron + admin via cached() / feed-registry only.
 */
export async function readCachedOnly<T>(
  endpoint: string,
  params: unknown,
  ttlSeconds: number,
  empty: T,
): Promise<CacheResult<T>> {
  const key = cacheKey(endpoint, params);
  const cachedRow = await readCache<T>(key, ttlSeconds);

  if (cachedRow) {
    return {
      data: cachedRow.payload,
      source: cachedRow.isStale ? "stale" : "cache",
      fetchedAt: cachedRow.fetchedAt,
      isStale: cachedRow.isStale,
    };
  }

  // No row yet — do NOT call LL2/SpaceX/etc. Admin/cron must fill the cache.
  return {
    data: empty,
    source: "cache",
    fetchedAt: new Date(0).toISOString(),
    isStale: true,
  };
}
