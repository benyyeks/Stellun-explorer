// Interactive 2D Mars map: fixed viewport + magnifier zoom (content scales
// inside a clipped frame), pan, fullscreen, site pins, simplified traverse
// lines, mission highlight cards.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KIND_LABEL,
  MARS_SITES,
  STATUS_COLOR,
  lonToEast,
  type MarsSite,
  type MarsSiteStatus,
} from "@/lib/mars-sites";
import { MARS_TRAVERSES } from "@/lib/mars-traverses";

type FilterStatus = "all" | MarsSiteStatus;

const BASE_CANDIDATES = [
  "/textures/mars-mdim.jpg",
  "/textures/mars-mdim.webp",
  "/textures/mars-mdim.jpeg",
];

const MIN_SCALE = 1;
const MAX_SCALE = 12;

function project(lat: number, lonE: number): { x: number; y: number } {
  const lon = lonToEast(lonE);
  const x = ((lon + 180) % 360) / 360;
  const y = (90 - lat) / 180;
  return { x, y };
}

function pointsToSvgPath(
  points: [number, number][],
  width: number,
  height: number
): string {
  if (points.length < 2) return "";
  return points
    .map(([lat, lon], i) => {
      const { x, y } = project(lat, lon);
      const px = x * width;
      const py = y * height;
      return `${i === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`;
    })
    .join(" ");
}

export function MarsSurfaceMap() {
  const shellRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>("perseverance");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [showFailed, setShowFailed] = useState(true);
  const [showEnded, setShowEnded] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showTracks, setShowTracks] = useState(true);
  const [baseSrc, setBaseSrc] = useState(BASE_CANDIDATES[0]!);
  const [baseFailed, setBaseFailed] = useState(false);
  const [vpSize, setVpSize] = useState({ w: 800, h: 400 });

  // Fixed-frame view: scale + pan in content coordinates
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const [isFs, setIsFs] = useState(false);

  const sites = useMemo(() => {
    return MARS_SITES.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (!showFailed && s.status === "failed") return false;
      if (!showEnded && (s.status === "ended" || s.status === "inactive")) return false;
      return true;
    });
  }, [filter, showFailed, showEnded]);

  const selected =
    sites.find((s) => s.id === selectedId) ??
    MARS_SITES.find((s) => s.id === selectedId) ??
    null;

  const visibleTraverses = useMemo(() => {
    if (!showTracks) return [];
    const ids = new Set(sites.map((s) => s.id));
    // Always show track for selected even if filtered out of pins
    if (selectedId) ids.add(selectedId);
    return MARS_TRAVERSES.filter((t) => ids.has(t.siteId));
  }, [showTracks, sites, selectedId]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setVpSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setVpSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const clampPan = useCallback(
    (nextScale: number, nextTx: number, nextTy: number) => {
      const w = vpSize.w;
      const h = vpSize.h;
      // Content size at this scale
      const cw = w * nextScale;
      const ch = h * nextScale;
      // Keep map covering the frame (no empty margins when zoomed)
      const minTx = Math.min(0, w - cw);
      const minTy = Math.min(0, h - ch);
      return {
        tx: Math.max(minTx, Math.min(0, nextTx)),
        ty: Math.max(minTy, Math.min(0, nextTy)),
      };
    },
    [vpSize.w, vpSize.h]
  );

  const resetView = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  /** Magnifier zoom toward a point in viewport coordinates (client relative). */
  const zoomAt = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = clientX != null ? clientX - rect.left : rect.width / 2;
      const cy = clientY != null ? clientY - rect.top : rect.height / 2;
      setScale((prev) => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * factor));
        // Point under cursor in content space before zoom
        const contentX = (cx - tx) / prev;
        const contentY = (cy - ty) / prev;
        // After zoom, keep that content point under the cursor
        let nextTx = cx - contentX * next;
        let nextTy = cy - contentY * next;
        const clamped = clampPan(next, nextTx, nextTy);
        setTx(clamped.tx);
        setTy(clamped.ty);
        return next;
      });
    },
    [tx, ty, clampPan]
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1 / 1.12 : 1.12;
      zoomAt(factor, e.clientX, e.clientY);
    },
    [zoomAt]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = { x: e.clientX, y: e.clientY, tx, ty };
    },
    [tx, ty]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current) return;
      const nextTx = drag.current.tx + (e.clientX - drag.current.x);
      const nextTy = drag.current.ty + (e.clientY - drag.current.y);
      const c = clampPan(scale, nextTx, nextTy);
      setTx(c.tx);
      setTy(c.ty);
    },
    [scale, clampPan]
  );

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  const toggleFullscreen = async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const focusSite = (site: MarsSite) => {
    setSelectedId(site.id);
    const { x, y } = project(site.lat, site.lonE);
    const w = vpSize.w || viewportRef.current?.clientWidth || 800;
    const h = vpSize.h || viewportRef.current?.clientHeight || 400;
    const nextScale = Math.max(scale, 3);
    // Center the site in the fixed frame
    let nextTx = w / 2 - x * w * nextScale;
    let nextTy = h / 2 - y * h * nextScale;
    const c = clampPan(nextScale, nextTx, nextTy);
    setScale(nextScale);
    setTx(c.tx);
    setTy(c.ty);
  };

  const onBaseError = () => {
    const idx = BASE_CANDIDATES.indexOf(baseSrc);
    if (idx >= 0 && idx < BASE_CANDIDATES.length - 1) {
      setBaseSrc(BASE_CANDIDATES[idx + 1]!);
      return;
    }
    setBaseFailed(true);
  };

  const w = vpSize.w;
  const h = vpSize.h;

  return (
    <div className="mars-map glass glass-card scaffold-card" ref={shellRef}>
      <div className="mars-map-head">
        <h2 style={{ margin: 0 }}>Surface map — landers, rovers &amp; tracks</h2>
        <p className="text-muted" style={{ margin: "6px 0 0", fontSize: "0.9rem" }}>
          Fixed map frame with magnifier zoom. Drag to pan, scroll or use buttons to zoom into the
          surface. Colored lines show simplified rover tracks from landing toward later positions.
        </p>
      </div>

      {/* Fixed frame — does not resize with zoom; content transforms inside */}
      <div
        className={`mars-map-viewport${isFs ? " is-fs" : ""}`}
        ref={viewportRef}
        onWheel={onWheel}
        role="img"
        aria-label="Interactive Mars surface map"
      >
        <div
          className="mars-map-stage"
          style={{
            width: w,
            height: h,
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {!baseFailed ? (
            <img
              className="mars-map-base-img"
              src={baseSrc}
              alt="Mars global mosaic (NASA / JPL / USGS)"
              draggable={false}
              onError={onBaseError}
            />
          ) : (
            <div className="mars-map-base-fallback" aria-hidden="true" />
          )}
          <div className="mars-map-grid" aria-hidden="true" />

          {/* Traverse paths */}
          {w > 0 && h > 0 && (
            <svg
              className="mars-map-tracks"
              width={w}
              height={h}
              viewBox={`0 0 ${w} ${h}`}
              aria-hidden="true"
            >
              {visibleTraverses.map((t) => {
                const d = pointsToSvgPath(t.points, w, h);
                if (!d) return null;
                const active = t.siteId === selectedId;
                return (
                  <path
                    key={t.siteId}
                    d={d}
                    fill="none"
                    stroke={t.color}
                    strokeWidth={active ? 2.5 / scale : 1.6 / scale}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={active ? 0.95 : 0.7}
                  />
                );
              })}
            </svg>
          )}

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
                  width: `${Math.max(8, 11 / Math.sqrt(scale))}px`,
                  height: `${Math.max(8, 11 / Math.sqrt(scale))}px`,
                }}
                title={`${s.name} · ${s.status}`}
                aria-label={`${s.name}, ${s.status}`}
                aria-pressed={isSel}
                onClick={(e) => {
                  e.stopPropagation();
                  focusSite(s);
                }}
              />
            );
          })}

          {showLabels &&
            sites.map((s) => {
              const { x, y } = project(s.lat, s.lonE);
              const isSel = s.id === selectedId;
              if (!isSel && scale < 1.5 && s.status !== "active") return null;
              return (
                <span
                  key={`lbl-${s.id}`}
                  className={`mars-map-label${isSel ? " selected" : ""}`}
                  style={{
                    left: `${x * 100}%`,
                    top: `${y * 100}%`,
                    fontSize: `${Math.max(0.55, 0.68 / Math.sqrt(scale))}rem`,
                  }}
                >
                  {s.name}
                </span>
              );
            })}
        </div>
      </div>

      <div className="mars-map-controls tracker-controls">
        <div className="mars-map-toolbar">
          <button type="button" className="btn btn-sm" onClick={() => zoomAt(1.25)}>
            Zoom in
          </button>
          <button type="button" className="btn btn-sm" onClick={() => zoomAt(1 / 1.25)}>
            Zoom out
          </button>
          <button type="button" className="btn btn-sm" onClick={resetView}>
            Reset view
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void toggleFullscreen()}>
            {isFs ? "Exit full screen" : "Full screen"}
          </button>
          <span className="mono mars-map-zoom-readout">{Math.round(scale * 100)}%</span>
          <label className="mars-map-toggle">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            Labels
          </label>
          <label className="mars-map-toggle">
            <input
              type="checkbox"
              checked={showTracks}
              onChange={(e) => setShowTracks(e.target.checked)}
            />
            Rover tracks
          </label>
        </div>

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

        <div className="mars-map-legend" aria-label="Legend">
          <span>
            <i className="mars-leg-dot" style={{ background: STATUS_COLOR.active }} /> Active
          </span>
          <span>
            <i className="mars-leg-dot" style={{ background: STATUS_COLOR.ended }} /> Ended
          </span>
          <span>
            <i className="mars-leg-dot" style={{ background: STATUS_COLOR.inactive }} /> Inactive
          </span>
          <span>
            <i className="mars-leg-dot" style={{ background: STATUS_COLOR.failed }} /> Failed
          </span>
          <span>
            <i className="mars-leg-line" /> Rover track
          </span>
        </div>
      </div>

      {selected && <SiteDetail site={selected} onFocus={() => focusSite(selected)} />}

      <p className="scaffold-note" style={{ marginTop: 12 }}>
        Base mosaic: Viking MDIM family (NASA / JPL / USGS), public domain. Tracks on this global
        chart are simplified paths for orientation; they are not full sol-by-sol odometry. For live
        Curiosity and Perseverance positions and full drive history, use the NASA map links in each
        site card. Place the mosaic at{" "}
        <code className="mono">public/textures/mars-mdim.jpg</code>.
      </p>
    </div>
  );
}

function SiteDetail({ site, onFocus }: { site: MarsSite; onFocus: () => void }) {
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
        <span className="badge">{KIND_LABEL[site.kind]}</span>
      </div>
      <p className="text-muted" style={{ margin: "6px 0 0", fontSize: "0.88rem" }}>
        {site.mission} · {site.agency} · {site.region}
      </p>
      <p className="mono" style={{ fontSize: "0.82rem", margin: "8px 0" }}>
        {Math.abs(site.lat).toFixed(2)}°{site.lat >= 0 ? "N" : "S"}, {lonToEast(site.lonE).toFixed(2)}
        °E · landed {site.landed}
        {site.traverseKm != null ? ` · ~${site.traverseKm} km traverse` : ""}
      </p>
      <p style={{ margin: "0 0 10px", lineHeight: 1.5 }}>{site.note}</p>
      {site.discoveries && site.discoveries.length > 0 ? (
        <div className="mars-map-missions">
          <div className="stat-label" style={{ marginBottom: 6 }}>
            Mission highlights
          </div>
          <ul className="mars-map-discoveries">
            {site.discoveries.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mars-map-detail-actions">
        <button type="button" className="btn btn-sm" onClick={onFocus}>
          Center on map
        </button>
        {site.url ? (
          <a href={site.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
            Official mission page
          </a>
        ) : null}
        {site.nasaMapUrl ? (
          <a
            href={site.nasaMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
          >
            NASA live track &amp; position
          </a>
        ) : null}
      </div>
    </div>
  );
}
