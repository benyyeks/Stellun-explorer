// Server-only: full CelesTrak group → Supabase satellite_catalog in batches.
// No object cap. Tracker reads rows; refresh is cron/admin only.

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

const BATCH = 450;

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

/** All OMM records for a group (full catalog, no slice). */
export async function readCatalogPayloads(group: string): Promise<{
  rows: Record<string, unknown>[];
  fetchedAt: string | null;
}> {
  const sb = await admin();
  const { data, error } = await sb
    .from("satellite_catalog")
    .select("payload, fetched_at")
    .eq("group_id", group);

  if (error) throw new Error(error.message);
  const list = data ?? [];
  let fetchedAt: string | null = null;
  for (const r of list) {
    const fa = r.fetched_at as string;
    if (!fetchedAt || fa > fetchedAt) fetchedAt = fa;
  }
  return {
    rows: list.map((r) => r.payload as Record<string, unknown>),
    fetchedAt,
  };
}

async function setStatus(
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
 * Download full CelesTrak group and upsert every object in batches.
 * Keeps previous rows until the new generation is fully written, then
 * deletes rows with an older fetched_at.
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
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      raw = await fetchJson(celestrakUrl(group), { timeoutMs });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
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

  const generation = new Date().toISOString();
  const sb = await admin();
  let written = 0;

  for (let i = 0; i < records.length; i += BATCH) {
    const chunk = records.slice(i, i + BATCH) as Record<string, unknown>[];
    const rows = chunk
      .map((rec) => {
        const norad = rec["NORAD_CAT_ID"];
        if (norad === undefined || norad === null) return null;
        return {
          group_id: group,
          norad_id: String(norad),
          payload: rec,
          fetched_at: generation,
        };
      })
      .filter(Boolean);

    if (rows.length === 0) continue;

    const { error } = await sb.from("satellite_catalog").upsert(rows as any[], {
      onConflict: "group_id,norad_id",
    });
    if (error) {
      await setStatus(group, {
        status: "error",
        error: error.message.slice(0, 400),
        loaded_count: written,
        expected_total: records.length,
        finished_at: new Date().toISOString(),
      });
      throw new Error(error.message);
    }

    written += rows.length;
    await setStatus(group, {
      status: "loading",
      loaded_count: written,
      expected_total: records.length,
      started_at: started,
      error: null,
    });
  }

  // Drop previous generation for this group only
  await sb
    .from("satellite_catalog")
    .delete()
    .eq("group_id", group)
    .lt("fetched_at", generation);

  await setStatus(group, {
    status: "ready",
    loaded_count: written,
    expected_total: records.length,
    error: null,
    started_at: started,
    finished_at: new Date().toISOString(),
  });

  return { source: "fresh", count: written };
}
