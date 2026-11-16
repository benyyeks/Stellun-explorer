// Server-only read-through cache for upstream API responses (public.api_cache).
// Writes MUST succeed before we report source: "fresh".

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

/** Deterministic cache key — string concat so paste cannot break ${} templates. */
export function cacheKey(endpoint: string, params: unknown): string {
  const json = JSON.stringify(params ?? {});
  let h = 5381;
  for (let i = 0; i < json.length; i++) {
    h = (h * 33) ^ json.charCodeAt(i);
  }
  return endpoint + ":" + (h >>> 0).toString(36);
}

async function readCache<T>(key: string, ttlSeconds: number) {
  const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabase
    .from("api_cache")
    .select("payload,fetched_at,ttl_seconds")
    .eq("cache_key", key)
    .maybeSingle();

  if (error) {
    console.error("api_cache read failed for " + key + ":", error.message);
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
    throw new Error("api_cache write failed for " + endpoint + ": " + error.message);
  }
  return fetchedAt;
}

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
      console.error("upstream or write failed for " + endpoint + "; serving stale:", err);
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
