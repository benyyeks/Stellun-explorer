// Server-only: full CelesTrak group → one Supabase blob write (CF subrequest-safe).

import { fetchJson } from "@/lib/stellun-fetch.server";

export type CatalogStatus = "idle" | "loading" | "ready" | "error";

export type CatalogStatusRow = {
  group_id: string;
  status: CatalogStatus;
  loaded_count: number;
  expected_total: number | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
};

const HEAVY = new Set([
  "starlink",
  "active",
  "geo",
  "cosmos-2251-debris",
  "iridium-33-debris",
]);

export function isHeavySatGroup(group: string): boolean {
  return HEAVY.has(group);
}

function celestrakUrl(group: string): string {
  return `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=json`;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getCatalogStatus(group: string): Promise<CatalogStatusRow | null> {
  const sb = await admin();
  const { data } = await sb
    .from("satellite_catalog_status")
    .select("*")
    .eq("group_id", group)
    .maybeSingle();
  return (data as CatalogStatusRow | null) ?? null;
}

/** Full OMM array for a group (no cap). */
export async function readCatalogPayloads(group: string): Promise<{
  rows: Record<string, unknown>[];
  fetchedAt: string | null;
}> {
  const sb = await admin();
  const { data, error } = await sb
    .from("satellite_catalog_blob")
    .select("payload, fetched_at, object_count")
    .eq("group_id", group)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.payload) return { rows: [], fetchedAt: null };

  const rows = Array.isArray(data.payload)
    ? (data.payload as Record<string, unknown>[])
    : [];
  return { rows, fetchedAt: (data.fetched_at as string) ?? null };
}

async function setStatus(
  group: string,
  patch: Partial<{
    status: CatalogStatus;
    loaded_count: number;
    expected_total: number | null;
    error: string | null;
    started_at: string | null;
    finished_at: string | null;
  }>,
) {
  const sb = await admin();
  const row = {
    group_id: group,
    status: patch.status ?? "idle",
    loaded_count: patch.loaded_count ?? 0,
    expected_total: patch.expected_total ?? null,
    error: patch.error ?? null,
    started_at: patch.started_at ?? null,
    finished_at: patch.finished_at ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from("satellite_catalog_status").upsert(row as any, {
    onConflict: "group_id",
  });
  if (error) throw new Error(`catalog status upsert failed: ${error.message}`);
}

/**
 * Download full group once, write ONE blob + status.
 * \~3–5 Worker subrequests total (not hundreds).
 */
export async function refreshSatelliteGroup(
  group: string,
  opts?: { force?: boolean },
): Promise<{ source: string; count: number }> {
  const existing = await getCatalogStatus(group);
  if (
    !opts?.force &&
    existing?.status === "ready" &&
    existing.finished_at &&
    Date.now() - new Date(existing.finished_at).getTime() < 6 * 3600_000
  ) {
    return { source: "cache", count: existing.loaded_count };
  }

  const started = new Date().toISOString();
  await setStatus(group, {
    status: "loading",
    error: null,
    started_at: started,
    finished_at: null,
    loaded_count: existing?.loaded_count ?? 0,
  });

  const timeoutMs = isHeavySatGroup(group) ? 55_000 : 25_000;
  let raw: unknown;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      raw = await fetchJson(celestrakUrl(group), { timeoutMs });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }

  if (lastErr) {
    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
    await setStatus(group, {
      status: existing?.loaded_count ? "ready" : "error",
      error: msg.slice(0, 400),
      loaded_count: existing?.loaded_count ?? 0,
      finished_at: new Date().toISOString(),
    });
    throw lastErr instanceof Error ? lastErr : new Error(msg);
  }

  const records = Array.isArray(raw) ? raw : [];
  if (records.length === 0) {
    await setStatus(group, {
      status: existing?.loaded_count ? "ready" : "error",
      error: "CelesTrak returned an empty list",
      loaded_count: existing?.loaded_count ?? 0,
      finished_at: new Date().toISOString(),
    });
    throw new Error(`CelesTrak empty for group ${group}`);
  }

  const sb = await admin();
  const fetchedAt = new Date().toISOString();
  const { error: blobErr } = await sb.from("satellite_catalog_blob").upsert(
    {
      group_id: group,
      payload: records,
      object_count: records.length,
      fetched_at: fetchedAt,
    } as any,
    { onConflict: "group_id" },
  );
  if (blobErr) {
    await setStatus(group, {
      status: "error",
      error: blobErr.message.slice(0, 400),
      loaded_count: existing?.loaded_count ?? 0,
      finished_at: new Date().toISOString(),
    });
    throw new Error(blobErr.message);
  }

  await setStatus(group, {
    status: "ready",
    loaded_count: records.length,
    expected_total: records.length,
    error: null,
    started_at: started,
    finished_at: fetchedAt,
  });

  return { source: "fresh", count: records.length };
                    }
