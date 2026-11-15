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
// Server-only read-through cache for upstream API responses (public.api_cache).
// Writes MUST succeed before we report source: "fresh". Cron/admin depend on that.

import type { Database } from "@/integrations/supabase/types";

export type CacheResult<T> = {
  data: T;
  source: "fresh" | "stale" | "cache";
  fetchedAt: string;
  isStale: boolean;
  writeOk?: boolean;
};

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Deterministic cache key from endpoint + params (must match writers and readers). */
export function cacheKey(endpoint: string, params: unknown): string {
  const json = JSON.stringify(params ?? {});
  let h = 5381;
  for (let i = 0; i < json.length; i++) {
    h = (h * 33) ^ json.charCodeAt(i);
  }
  return `\( {endpoint}: \){(h >>> 0).toString(36)}`;
}

async function readCache<T>(key: string, ttlSeconds: number) {
  const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabase
    .from("api_cache")
    .select("payload,fetched_at,ttl_seconds")
    .eq("cache_key", key)
    .maybeSingle();

  if (error) {
    console.error(`api_cache read failed for ${key}:`, error.message);
    return null;
  }
  if (!data) return null;

  const fetchedAt = new Date(data.fetched_at).getTime();
  if (!Number.isFinite(fetchedAt)) return null;

  const ageSec = (Date.now() - fetchedAt) / 1000;
  return {
    payload: data.payload as T,
    fetchedAt: data.fetched_at as string,
    isStale: ageSec > (data.ttl_seconds ?? ttlSeconds),
  };
}

/**
 * Persist payload. Throws if Supabase returns an error so cron goes red.
 * Returns the exact fetched_at written to the DB.
 */
async function writeCache(
  key: string,
  endpoint: string,
  payload: unknown,
  ttlSeconds: number,
): Promise<string> {
  const admin = await adminClient();
  const fetchedAt = new Date().toISOString();
  const { error } = await admin.from("api_cache").upsert(
    {
      cache_key: key,
      endpoint,
      payload: JSON.parse(JSON.stringify(payload)),
      fetched_at: fetchedAt,
      ttl_seconds: ttlSeconds,
    },
    { onConflict: "cache_key" },
  );

  if (error) {
    throw new Error(`api_cache write failed for ${endpoint}: ${error.message}`);
  }
  return fetchedAt;
}

/**
 * Read-through cache. source "fresh" only after a successful DB write.
 * force: ignore TTL and re-hit upstream (admin / ISS cron).
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

  if (!opts?.force && cachedRow && !cachedRow.isStale) {
    return {
      data: cachedRow.payload,
      source: "cache",
      fetchedAt: cachedRow.fetchedAt,
      isStale: false,
      writeOk: true,
    };
  }

  try {
    const fresh = await fetcher();
    const fetchedAt = await writeCache(key, endpoint, fresh, ttlSeconds);
    return {
      data: fresh,
      source: "fresh",
      fetchedAt,
      isStale: false,
      writeOk: true,
    };
  } catch (err) {
    if (cachedRow) {
      console.error(`upstream or write failed for ${endpoint}; serving stale:`, err);
      return {
        data: cachedRow.payload,
        source: "stale",
        fetchedAt: cachedRow.fetchedAt,
        isStale: true,
        writeOk: false,
      };
    }
    throw err;
  }
}

/**
 * User path: Supabase only. Never calls upstream.
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
      writeOk: true,
    };
  }

  return {
    data: empty,
    source: "cache",
    fetchedAt: "",
    isStale: true,
    writeOk: false,
  };
}
