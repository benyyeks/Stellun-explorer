// Interactive 2D Mars surface map: landing sites, status, and detail panel.
// Equirectangular projection over a simple shaded globe texture (CSS/SVG).
// Controls sit under the viewport, matching Tracker / Deep Space patterns.
import { useMemo, useState } from "react";
import {
  MARS_SITES,
  STATUS_COLOR,
  lonToEast,
  type MarsSite,
  type MarsSiteStatus,
} from "@/lib/mars-sites";

type FilterStatus = "all" | MarsSiteStatus;

function project(lat: number, lonE: number): { x: number; y: number } {
  const lon = lonToEast(lonE);
  // 0°E at center of map (NASA-style Mars maps often use this).
  const x = ((lon + 180) % 360) / 360;
  const y = (90 - lat) / 180;
  return { x, y };
}

export function MarsSurfaceMap() {
  const [selectedId, setSelectedId] = useState<string | null>("perseverance");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [showFailed, setShowFailed] = useState(true);
  const [showEnded, setShowEnded] = useState(true);

  const sites = useMemo(() => {
    return MARS_SITES.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (!showFailed && s.status === "failed") return false;
      if (!showEnded && (s.status === "ended" || s.status === "inactive")) return false;
      return true;
    });
  }, [filter, showFailed, showEnded]);

  const selected = sites.find((s) => s.id === selectedId) ?? MARS_SITES.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="mars-map glass glass-card scaffold-card">
      <div className="mars-map-head">
        <h2 style={{ margin: 0 }}>Surface map</h2>
        <p className="text-muted" style={{ margin: "6px 0 0", fontSize: "0.9rem" }}>
          Landing sites and surface assets on an equirectangular Mars chart. Coordinates are
          planetocentric latitude and east longitude from published mission data.
        </p>
      </div>

      <div className="mars-map-viewport" role="img" aria-label="Mars surface map with landing sites">
        <div className="mars-map-base">
          {/* Simple banded terrain suggestion — no external image dependency */}
          <div className="mars-map-bands" aria-hidden="true" />
          <div className="mars-map-grid" aria-hidden="true" />
          {sites.map((s) => {
            const { x, y } = project(s.lat, s.lonE);
            const isSel = s.id === selectedId;
            return (
              <button
                key={s.id}
                type="button"
                className={`mars-map-pin${isSel ? " selected" : ""}`}
                style={{
                  left: `${x * 100}%`,
                  top: `${y * 100}%`,
                  borderColor: STATUS_COLOR[s.status],
                  background: STATUS_COLOR[s.status],
                }}
                title={s.name}
                aria-label={`${s.name}, ${s.status}`}
                aria-pressed={isSel}
                onClick={() => setSelectedId(s.id)}
              />
            );
          })}
        </div>
      </div>

      <div className="mars-map-controls tracker-controls">
        <div className="chip-row" role="group" aria-label="Filter by status">
          {(
            [
              ["all", "All sites"],
              ["active", "Active"],
              ["ended", "Ended"],
              ["inactive", "Inactive"],
              ["failed", "Failed"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`chip${filter === id ? " chip-active" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mars-map-toggles">
          <label className="mars-map-toggle">
            <input type="checkbox" checked={showFailed} onChange={(e) => setShowFailed(e.target.checked)} />
            Show failed landings
          </label>
          <label className="mars-map-toggle">
            <input type="checkbox" checked={showEnded} onChange={(e) => setShowEnded(e.target.checked)} />
            Show ended / inactive
          </label>
        </div>
      </div>

      {selected && <SiteDetail site={selected} />}

      <p className="scaffold-note" style={{ marginTop: 12 }}>
        Pins mark published landing coordinates. Rover paths are summarized as traverse length where
        known; full GPS-grade tracks belong to mission archives (NASA PDS / agency portals), not this
        overview map.
      </p>
    </div>
  );
}

function SiteDetail({ site }: { site: MarsSite }) {
  return (
    <div className="mars-map-detail">
      <div className="mars-map-detail-head">
        <h3 style={{ margin: 0 }}>{site.name}</h3>
        <span
          className="badge"
          style={{ borderColor: STATUS_COLOR[site.status], color: STATUS_COLOR[site.status] }}
        >
          {site.status}
        </span>
      </div>
      <p className="text-muted" style={{ margin: "6px 0 0", fontSize: "0.88rem" }}>
        {site.mission} · {site.agency} · {site.kind} · {site.region}
      </p>
      <p className="mono" style={{ fontSize: "0.82rem", margin: "8px 0" }}>
        {site.lat.toFixed(2)}°{site.lat >= 0 ? "N" : "S"}, {lonToEast(site.lonE).toFixed(2)}°E · landed{" "}
        {site.landed}
        {site.traverseKm != null ? ` · ~${site.traverseKm} km traverse` : ""}
      </p>
      <p style={{ margin: "0 0 10px", lineHeight: 1.5 }}>{site.note}</p>
      {site.url && (
        <a href={site.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
          Official mission page
        </a>
      )}
    </div>
  );
}
