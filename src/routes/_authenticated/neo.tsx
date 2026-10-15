import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getNEO } from "@/lib/orbitex-data.functions";
import { fmtNum, safeText } from "@/lib/format";
import { FreshnessBadge } from "@/components/site/freshness-badge";
import { FeedError, EmptyState } from "@/components/site/data-state";
import { ExportButtons } from "@/components/site/export-buttons";
import { PageHeroSkeleton, StatGridSkeleton, TableSkeleton } from "@/components/site/page-skeleton";

export const Route = createFileRoute("/_authenticated/neo")({
  head: () => ({
    meta: [
      { title: "Asteroid Watch - STELLUN" },
      {
        name: "description",
        content:
          "Near-Earth objects making close approaches this week: size, velocity, and miss distance in lunar distances, from NASA's NeoWs feed.",
      },
      { property: "og:title", content: "Asteroid Watch - STELLUN" },
      {
        property: "og:description",
        content: "This week's near-Earth asteroid approaches with verified size, speed, and miss distance from NASA NeoWs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(neoQueryOptions).catch(() => null);
  },
  staleTime: 60_000,
  pendingMs: 0,
  pendingComponent: NeoSkeleton,
  errorComponent: NeoError,
  component: NeoPage,
});

function NeoSkeleton() {
  return (
    <main className="page-main">
      <section>
        <div className="container" role="status" aria-busy="true" aria-label="Loading asteroid watch">
          <span className="sr-only">Loading asteroid watch</span>
          <PageHeroSkeleton />
          <StatGridSkeleton count={4} />
          <TableSkeleton rows={8} />
        </div>
      </section>
    </main>
  );
}

const neoQueryOptions = queryOptions({
  queryKey: ["orbitex", "neo-week"],
  queryFn: () => getNEO(),
  retry: false,
  staleTime: 600_000,
});

const LUNAR_DISTANCE_KM = 384400;

type NeoRow = {
  id: string;
  name: string;
  approachLabel: string;
  approachTs: number;
  diaMinM: number;
  diaMaxM: number;
  velKmS: number;
  missKm: number;
  missLD: number;
  hazardous: boolean;
};

// NASA NeoWs feed: near_earth_objects is keyed by ISO date, each entry an
// array of objects with close_approach_data[0] holding the approach in range.
function parseNeo(raw: unknown): NeoRow[] {
  const grouped = (raw as any)?.near_earth_objects;
  if (!grouped || typeof grouped !== "object") return [];
  const rows: NeoRow[] = [];
  for (const key of Object.keys(grouped)) {
    const list = grouped[key];
    if (!Array.isArray(list)) continue;
    for (const obj of list as any[]) {
      const ca = Array.isArray(obj?.close_approach_data) ? obj.close_approach_data[0] : null;
      if (!ca) continue;
      const diaKm = obj?.estimated_diameter?.kilometers;
      const missKm = Number(ca?.miss_distance?.kilometers);
      const velKmS = Number(ca?.relative_velocity?.kilometers_per_second);
      if (!Number.isFinite(missKm)) continue;
      const label = String(ca?.close_approach_date_full ?? key);
      rows.push({
        id: String(obj?.id ?? `${key}-${rows.length}`),
        name: safeText(String(obj?.name ?? "Unknown object"), 60),
        approachLabel: label,
        approachTs: Date.parse(String(ca?.close_approach_date ?? key)) || 0,
        diaMinM: Number(diaKm?.estimated_diameter_min) * 1000 || 0,
        diaMaxM: Number(diaKm?.estimated_diameter_max) * 1000 || 0,
        velKmS: Number.isFinite(velKmS) ? velKmS : 0,
        missKm,
        missLD: missKm / LUNAR_DISTANCE_KM,
        hazardous: Boolean(obj?.is_potentially_hazardous_asteroid),
      });
    }
  }
  return rows;
}

type SortKey = "approach" | "size" | "velocity" | "miss";

const SORTERS: Record<SortKey, (a: NeoRow, b: NeoRow) => number> = {
  approach: (a, b) => a.approachTs - b.approachTs,
  size: (a, b) => a.diaMaxM - b.diaMaxM,
  velocity: (a, b) => a.velKmS - b.velKmS,
  miss: (a, b) => a.missLD - b.missLD,
};

function formatDiameter(minM: number, maxM: number): string {
  if (!minM && !maxM) return "--";
  const fmt = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);
  return `${fmt(minM)} - ${fmt(maxM)}`;
}

function NeoError({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <main className="page-main">
      <section>
        <div className="container">
          <FeedError
            title="Asteroid watch is temporarily unavailable"
            source="NASA's Near Earth Object Web Service"
            onRetry={() => {
              router.invalidate();
              reset();
            }}
          />
        </div>
      </section>
    </main>
  );
}

function NeoPage() {
  const neo = useSuspenseQuery(neoQueryOptions).data;
  const rows = useMemo(() => parseNeo(neo?.data), [neo]);

  const [sortKey, setSortKey] = useState<SortKey>("approach");
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    const sorter = SORTERS[sortKey];
    return rows.slice().sort((a, b) => (sortAsc ? sorter(a, b) : sorter(b, a)));
  }, [rows, sortKey, sortAsc]);

  const stats = useMemo(() => {
    if (!rows.length) return null;
    const closest = rows.reduce((m, r) => (r.missLD < m.missLD ? r : m), rows[0]!);
    const fastest = rows.reduce((m, r) => (r.velKmS > m.velKmS ? r : m), rows[0]!);
    const largest = rows.reduce((m, r) => (r.diaMaxM > m.diaMaxM ? r : m), rows[0]!);
    return { closest, fastest, largest, hazardCount: rows.filter((r) => r.hazardous).length };
  }, [rows]);

  const maxLD = useMemo(() => Math.min(40, Math.max(1, ...rows.map((r) => r.missLD))), [rows]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortMark = (key: SortKey) => (key === sortKey ? (sortAsc ? " ↑" : " ↓") : "");

  return (
    <main className="page-main">
      <section>
        <div className="container">
          <div className="page-hero">
            <span className="eyebrow">NASA NeoWs</span>
            <h1>Asteroid watch</h1>
            <p className="tagline">
              Every near-Earth object with a known close approach in the next 7 days, from
              NASA's Near Earth Object Web Service. Distances are given in lunar distances
              (LD), where 1 LD is the distance from Earth to the Moon, about 384,400 km.
            </p>
          </div>

          <div className="freshness-row">
            <FreshnessBadge res={neo} />
            <span className="freshness-note">
              Sizes are telescope estimates and carry real uncertainty; read them as ranges.
            </span>
          </div>

          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Approaches this week</div>
              <div className="stat-value">{rows.length}</div>
              <div className="stat-unit">tracked objects</div>
              <div className="stat-note">
                {stats ? `${stats.hazardCount} flagged potentially hazardous` : ""}
              </div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Closest approach</div>
              <div className="stat-value">{stats ? stats.closest.missLD.toFixed(1) : "--"}</div>
              <div className="stat-unit">lunar distances</div>
              <div className="stat-note">{stats ? safeText(stats.closest.name, 40) : ""}</div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Fastest object</div>
              <div className="stat-value">{stats ? stats.fastest.velKmS.toFixed(1) : "--"}</div>
              <div className="stat-unit">km/s relative</div>
              <div className="stat-note">{stats ? safeText(stats.fastest.name, 40) : ""}</div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Largest object</div>
              <div className="stat-value">
                {stats ? (stats.largest.diaMaxM >= 1000 ? (stats.largest.diaMaxM / 1000).toFixed(2) : Math.round(stats.largest.diaMaxM)) : "--"}
              </div>
              <div className="stat-unit">{stats ? (stats.largest.diaMaxM >= 1000 ? "km max estimate" : "m max estimate") : ""}</div>
              <div className="stat-note">{stats ? safeText(stats.largest.name, 40) : ""}</div>
            </div>
          </div>

          <div className="glass glass-card scaffold-card">
            <div className="panel-head">
              <div>
                <h2>Close approach table</h2>
                <p>
                  Click a column header to sort. The bar shows miss distance relative to {maxLD.toFixed(0)} LD.
                </p>
              </div>
              <ExportButtons
                rows={sorted}
                columns={[
                  { key: "name", label: "Object", value: (r: NeoRow) => r.name },
                  { key: "approach", label: "Close approach (UTC)", value: (r: NeoRow) => r.approachLabel },
                  { key: "dia_min_m", label: "Diameter minimum (m)", value: (r: NeoRow) => r.diaMinM },
                  { key: "dia_max_m", label: "Diameter maximum (m)", value: (r: NeoRow) => r.diaMaxM },
                  { key: "velocity_km_s", label: "Relative velocity (km/s)", value: (r: NeoRow) => r.velKmS },
                  { key: "miss_ld", label: "Miss distance (lunar distances)", value: (r: NeoRow) => r.missLD },
                  { key: "miss_km", label: "Miss distance (km)", value: (r: NeoRow) => r.missKm },
                  { key: "hazardous", label: "Potentially hazardous", value: (r: NeoRow) => (r.hazardous ? "yes" : "no") },
                ]}
                meta={{
                  dataset: "Near-Earth object close approaches, next 7 days",
                  source: "NASA Near Earth Object Web Service",
                  retrievedAt: neo.fetchedAt,
                }}
              />
            </div>
            {sorted.length === 0 ? (
              <EmptyState
                title="No close approaches in this window"
                message="No cataloged objects are approaching within the next 7 days. The table fills automatically as new approaches are confirmed."
              />
            ) : (
              <div className="source-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Object</th>
                      <th className="sortable-th" onClick={() => toggleSort("approach")}>
                        Approach (UTC){sortMark("approach")}
                      </th>
                      <th className="sortable-th" onClick={() => toggleSort("size")}>
                        Diameter{sortMark("size")}
                      </th>
                      <th className="sortable-th" onClick={() => toggleSort("velocity")}>
                        Velocity{sortMark("velocity")}
                      </th>
                      <th className="sortable-th" onClick={() => toggleSort("miss")}>
                        Miss distance{sortMark("miss")}
                      </th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r) => (
                      <tr key={r.id}>
                        <td className="mono" style={{ fontSize: "0.84rem" }}>{r.name}</td>
                        <td className="mono" style={{ fontSize: "0.84rem" }}>{r.approachLabel}</td>
                        <td className="mono" style={{ fontSize: "0.84rem" }}>{formatDiameter(r.diaMinM, r.diaMaxM)}</td>
                        <td className="mono">{r.velKmS ? `${r.velKmS.toFixed(1)} km/s` : "--"}</td>
                        <td>
                          <div className="mono" style={{ fontSize: "0.84rem", marginBottom: 6 }}>
                            {r.missLD.toFixed(1)} LD · {fmtNum(r.missKm, 0)} km
                          </div>
                          <div className="ld-bar">
                            <div
                              className={`ld-fill ${r.hazardous ? "ld-hazard" : ""}`}
                              style={{ width: `${Math.min(100, (r.missLD / maxLD) * 100)}%` }}
                            />
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${r.hazardous ? "badge-danger" : "badge-muted"}`}>
                            {r.hazardous ? "Potentially hazardous" : "Nominal"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="scaffold-note">
              Potentially hazardous is NASA's official designation: an object whose orbit can
              bring it within 0.05 AU of Earth and which is large enough to cause significant
              damage if it ever impacted. It does not mean an impact is expected. None of the
              objects above pose a known impact threat; their orbits are well determined.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
