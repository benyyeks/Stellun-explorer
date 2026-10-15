import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PLANET_ELEMENTS,
  PLANET_ORDER,
  heliocentricEcliptic,
  julianDateUTC,
  planetEquatorial,
  type PlanetKey,
} from "@/lib/astronomy";
import {
  PROBE_ANCHORS,
  probeFallbackDistanceAU,
  type ProbeKey,
} from "@/lib/satellite";
import { AU_KM } from "@/lib/astronomy";
import { fmtNum, lightTimeFromAU, lightTimeFromKm, utcDateStr } from "@/lib/format";
import { horizonsProbeQuery } from "@/lib/horizons-queries";
import { useNow } from "@/hooks/use-now";
import { FreshnessBadge } from "@/components/site/freshness-badge";
import type { SceneSelection } from "@/components/deepspace/solar-system";
import { SceneSkeleton, SceneBootOverlay } from "@/components/site/page-skeleton";

const SolarSystemScene = lazy(() => import("@/components/deepspace/solar-system"));

export const Route = createFileRoute("/_authenticated/deepspace/")({
  head: () => ({
    meta: [
      { title: "Deep Space - STELLUN" },
      {
        name: "description",
        content:
          "A to-scale 3D model of the solar system with true planetary positions from JPL elements and live deep-space probe distances from JPL Horizons.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Deep Space - STELLUN" },
      {
        property: "og:description",
        content:
          "A to-scale 3D model of the solar system with true planetary positions and live probe distances from JPL Horizons.",
      },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeepSpacePage,
});

const PROBE_KEYS = Object.keys(PROBE_ANCHORS) as ProbeKey[];

export function selectionId(sel: SceneSelection): string {
  if (sel.kind === "sun") return "sun";
  return sel.key;
}

function focusKey(sel: SceneSelection): string {
  if (sel.kind === "sun") return "sun";
  if (sel.kind === "planet") return sel.key;
  return `probe:${sel.key}`;
}

export function objectDisplayName(sel: SceneSelection): string {
  if (sel.kind === "sun") return "The Sun";
  if (sel.kind === "planet")
    return sel.key.charAt(0).toUpperCase() + sel.key.slice(1);
  return PROBE_ANCHORS[sel.key].name;
}

function fmtRA(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function fmtDec(deg: number): string {
  return `${deg >= 0 ? "+" : ""}${fmtNum(deg, 1)} deg`;
}

function jdToUTCDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

// ---------------------------------------------------------------------------
// Detail rows
// ---------------------------------------------------------------------------
function SunCard({ onFocus }: { onFocus: () => void }) {
  return (
    <>
      <div className="detail-rows">
        <div className="detail-row">
          <span>Apparent size from Earth</span>
          <b className="mono">0.53 deg</b>
        </div>
        <div className="detail-row">
          <span>Light travel time</span>
          <b className="mono">8 min 19 s</b>
        </div>
        <div className="detail-row">
          <span>Model scale</span>
          <b className="mono">149.6M km = 1 AU</b>
        </div>
      </div>
      <p className="detail-note">
        Planet sizes in this model are exaggerated for visibility. Distances and
        orbital positions are to scale.
      </p>
      <div className="compare-actions" style={{ marginTop: 10 }}>
        <button type="button" className="btn btn-sm" onClick={onFocus}>
          Focus in the 3D model
        </button>
      </div>
    </>
  );
}

function PlanetDetail({
  pk,
  jd,
  onFocus,
}: {
  pk: PlanetKey;
  jd: number;
  onFocus: () => void;
}) {
  const P = PLANET_ELEMENTS[pk];
  const helio = heliocentricEcliptic(pk, jd);
  const earth = heliocentricEcliptic("earth", jd);
  const dEarth =
    pk === "earth"
      ? 0
      : Math.sqrt(
          (helio.x - earth.x) ** 2 + (helio.y - earth.y) ** 2 + (helio.z - earth.z) ** 2
        );
  const eq = planetEquatorial(pk, jd);
  return (
    <>
      <div className="side-item-meta">
        <span>
          From Sun <b className="mono">{fmtNum(helio.r, 3)} AU</b>
        </span>
        <span>
          Period{" "}
          <b className="mono">
            {helio.periodDays > 800
              ? `${fmtNum(helio.periodDays / 365.25, 2)} yr`
              : `${fmtNum(helio.periodDays, 1)} d`}
          </b>
        </span>
      </div>
      {pk !== "earth" && (
        <div className="side-item-meta">
          <span>
            From Earth <b className="mono">{fmtNum(dEarth, 3)} AU</b>
          </span>
          <span>
            Light time <b className="mono">{lightTimeFromAU(dEarth)}</b>
          </span>
        </div>
      )}
      <div className="side-item-meta">
        <span>
          RA <b className="mono">{fmtRA(eq.ra / 15)}</b>
        </span>
        <span>
          Dec <b className="mono">{fmtDec(eq.dec)}</b>
        </span>
      </div>
      <div className="side-item-meta">
        <span>
          Radius <b className="mono">{fmtNum(P.radiusKm, 0)} km</b>
        </span>
        <span>
          Semi-major axis <b className="mono">{fmtNum(helio.a, 3)} AU</b>
        </span>
      </div>
      <div className="compare-actions" style={{ marginTop: 10 }}>
        <button type="button" className="btn btn-sm" onClick={onFocus}>
          Focus in the 3D model
        </button>
      </div>
    </>
  );
}

function ProbeDetail({ k }: { k: ProbeKey }) {
  const q = useQuery(horizonsProbeQuery(k));
  const anchor = PROBE_ANCHORS[k];
  const live = q.data?.telemetry ?? null;
  const fallbackAU = probeFallbackDistanceAU(k, new Date());
  const distKm = live ? live.distanceKm : fallbackAU ? fallbackAU * AU_KM : null;

  return (
    <>
      {q.data ? (
        <div className="side-item-meta">
          <span>
            Telemetry <FreshnessBadge res={q.data} />
          </span>
          {live ? (
            <span>
              Range <b className="mono">{live.rangeAU.toFixed(4)} AU</b>
            </span>
          ) : null}
        </div>
      ) : null}
      {!live && (
        <p className="detail-note" style={{ marginTop: 0 }}>
          Live telemetry temporarily unavailable. Distance shown is a labeled estimate.
        </p>
      )}
      <div className="side-item-meta">
        <span>
          From Earth{" "}
          <b className="mono">
            {distKm ? `${fmtNum(distKm / 1e6, 2)}M km${live ? "" : " (est.)"}` : "--"}
          </b>
        </span>
        <span>
          {live ? "Speed rel. Earth " : "Cruise speed "}
          <b className="mono">
            {live
              ? `${fmtNum(live.speedKmS, 2)} km/s`
              : anchor.kind === "recession"
                ? `~${anchor.speedKmS} km/s (est.)`
                : "--"}
          </b>
        </span>
      </div>
      <div className="side-item-meta">
        <span>
          One-way light time{" "}
          <b className="mono">{distKm ? lightTimeFromKm(distKm) : "--"}</b>
        </span>
        <span>
          Launched{" "}
          <b className="mono">
            {new Date(anchor.launched).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            })}
          </b>
        </span>
      </div>
      <p className="detail-note">{anchor.note}</p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function DeepSpacePage() {
  const [mounted, setMounted] = useState(false);
  // Set on the first animation tick: the scene has booted and produced a frame.
  const [sceneReady, setSceneReady] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(3); // days per second
  const [sel, setSel] = useState<SceneSelection>({ kind: "planet", key: "earth" });
  const [focus, setFocus] = useState<{ key: string | null; nonce: number }>({
    key: "earth",
    nonce: 0,
  });
  const [simJd, setSimJd] = useState<number | null>(null);
  const [clockReset, setClockReset] = useState<number>(0);
  const [isFs, setIsFs] = useState(false);
  const [pseudoFs, setPseudoFs] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLUListElement>(null);
  useEffect(() => setMounted(true), []);

  const now = useNow(60_000);
  const jd = julianDateUTC(now ?? new Date());

  // Keep Voyager 1 telemetry warm so the detail card reflects live data quickly.
  useQuery(horizonsProbeQuery("voyager1"));

  const requestFocus = () => {
    setFocus((f) => ({ key: focusKey(sel), nonce: f.nonce + 1 }));
  };

  // Fullscreen: use the Fullscreen API where available (with a landscape
  // orientation lock on touch devices); fall back to a fixed-position
  // pseudo-fullscreen on browsers that lack element fullscreen (iOS Safari).
  useEffect(() => {
    const onChange = () => {
      const active = document.fullscreenElement === shellRef.current;
      setIsFs(active);
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const orientation = screen.orientation as unknown as
        | { lock?: (o: string) => Promise<void>; unlock?: () => void }
        | undefined;
      if (active && coarse) {
        orientation?.lock?.("landscape").catch(() => {
          /* orientation lock requires support + user gesture */
        });
      } else {
        orientation?.unlock?.();
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!pseudoFs) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setPseudoFs(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [pseudoFs]);

  const expanded = isFs || pseudoFs;

  const toggleFullscreen = async () => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    if (pseudoFs) {
      setPseudoFs(false);
      return;
    }
    if (typeof el.requestFullscreen === "function") {
      try {
        await el.requestFullscreen();
        return;
      } catch {
        /* fall through to pseudo-fullscreen */
      }
    }
    setPseudoFs(true);
  };

  // Arrow-key navigation for the object catalog.
  const onCatalogKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const items = Array.from(
      catalogRef.current?.querySelectorAll<HTMLElement>("[data-catalog-item]") ?? []
    );
    if (items.length === 0) return;
    e.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next: number;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if (e.key === "ArrowDown") next = current < 0 ? 0 : (current + 1) % items.length;
    else next = current <= 0 ? items.length - 1 : current - 1;
    items[next]?.focus();
  };

  const hud = (
              <div className={`scene-hud${expanded ? "" : " scene-hud-docked"}`} role="toolbar" aria-label="Deep space controls">
                <div className="chip-row" role="group" aria-label="Time controls">
                  <button
                    type="button"
                    className="chip"
                    aria-label={playing ? "Pause the simulation" : "Play the simulation"}
                    aria-pressed={playing}
                    onClick={() => setPlaying((p) => !p)}
                  >
                    {playing ? "Pause" : "Play"}
                  </button>
                  {[1, 3, 10, 30].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`chip ${speed === s ? "chip-active" : ""}`}
                      aria-pressed={speed === s}
                      aria-label={`Set simulation speed to ${s} days per second`}
                      onClick={() => setSpeed(s)}
                    >
                      {s} d/s
                    </button>
                  ))}
                  <button
                    type="button"
                    className="chip"
                    aria-label="Reset the simulated date and time to now"
                    onClick={() => setClockReset((n) => n + 1)}
                  >
                    Now
                  </button>
                </div>
                <button
                  type="button"
                  className="chip"
                  aria-label="Reset the camera to the overview position"
                  onClick={() => setFocus((f) => ({ key: null, nonce: f.nonce + 1 }))}
                >
                  Reset view
                </button>
                <span className="scene-hud-spacer" />
                <span className="scene-pill" aria-label="Current simulated date">
                  <span className="mono">
                    {simJd ? utcDateStr(jdToUTCDate(simJd)) : utcDateStr(jdToUTCDate(jd))}
                  </span>
                </span>
                <button
                  type="button"
                  className={`chip ${expanded ? "chip-active" : ""}`}
                  aria-pressed={expanded}
                  aria-label={
                    expanded
                      ? "Exit fullscreen solar system view"
                      : "Expand the solar system to fill the screen"
                  }
                  onClick={toggleFullscreen}
                >
                  {expanded ? "Exit fullscreen" : "Fullscreen"}
                </button>
              </div>
  );

  return (
    <main className="page-main">
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">JPL planetary elements · Horizons telemetry</span>
          <h1>Deep Space</h1>
          <p className="tagline">
            A to-scale model of the solar system. Planets sit at their true positions from
            JPL orbital elements, and deep-space probes report live distances from JPL
            Horizons. Press play to watch the system move, click any body for a summary,
            or open its full profile.
          </p>
        </div>
      </section>

      <section>
        <div className="container">
          {!mounted ? (
            <SceneSkeleton label="Preparing the solar system model" chips={5} />
          ) : (
          <div className="scene-layout">
            <div className="scene-main">
            <div
              ref={shellRef}
              className={`scene-shell${pseudoFs ? " scene-shell-pseudo" : ""}`}
              role="region"
              aria-label="Interactive 3D model of the solar system"
            >
              {mounted ? (
                <Suspense fallback={<SceneBootOverlay label="Loading the 3D engine" />}>
                  <SolarSystemScene
                    playing={playing}
                    daysPerSecond={speed}
                    selected={sel}
                    focusRequest={focus}
                    resetClockNonce={clockReset}
                    onSelect={(s) => {
                      if (s) setSel(s);
                    }}
                    onTick={(jdNow) => {
                      setSimJd(jdNow);
                      setSceneReady(true);
                    }}
                  />
                </Suspense>
              ) : null}

              {expanded ? hud : null}

              <div className="scene-hint">
                Drag to orbit · scroll to zoom · click a planet or probe
              </div>

              {!sceneReady ? (
                <SceneBootOverlay label="Preparing the solar system model" />
              ) : null}
            </div>
            {!expanded ? hud : null}
            </div>

            <aside className="scene-side">
              <div className="glass glass-card side-card">
                <div className="side-item-top">
                  <h3 aria-live="polite">{objectDisplayName(sel)}</h3>
                </div>
                {sel.kind === "sun" && <SunCard onFocus={requestFocus} />}
                {sel.kind === "planet" && (
                  <PlanetDetail pk={sel.key} jd={jd} onFocus={requestFocus} />
                )}
                {sel.kind === "probe" && <ProbeDetail k={sel.key} />}
                {sel.kind === "probe" && sel.key === "roman" ? (
                  // Roman has a dedicated mission page, so the full record for it
                  // lives there rather than in the generic object template.
                  <Link to="/roman" className="detail-link">
                    View the full Roman mission page
                  </Link>
                ) : (
                  <Link
                    to="/deepspace/$objectId"
                    params={{ objectId: selectionId(sel) }}
                    className="detail-link"
                  >
                    View full object details
                  </Link>
                )}
              </div>

              <div className="glass glass-card side-card">
                <div className="side-item-top">
                  <h3>Catalog</h3>
                </div>
                <ul
                  className="side-list"
                  ref={catalogRef}
                  onKeyDown={onCatalogKeyDown}
                  role="listbox"
                  aria-label="Solar system objects. Use the arrow keys to move through the list."
                >
                  <li className="side-title" aria-hidden="true">
                    Planets
                  </li>
                  {PLANET_ORDER.map((pk) => {
                    const P = PLANET_ELEMENTS[pk];
                    const active = sel.kind === "planet" && sel.key === pk;
                    return (
                      <li key={pk}>
                        <button
                          type="button"
                          data-catalog-item
                          role="option"
                          aria-selected={active}
                          className={`side-item ${active ? "side-item-active" : ""}`}
                          onClick={() => setSel({ kind: "planet", key: pk })}
                        >
                          <span className="side-item-name">
                            <span className="legend-dot" style={{ background: P.color }} />
                            <span>{pk.charAt(0).toUpperCase() + pk.slice(1)}</span>
                          </span>
                          <span className="side-item-meta">
                            <span>
                              Orbit <b className="mono">{fmtNum(P.a[0], 2)} AU</b>
                            </span>
                            <span>
                              Radius <b className="mono">{fmtNum(P.radiusKm, 0)} km</b>
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  <li className="side-title" style={{ marginTop: 10 }} aria-hidden="true">
                    Deep space probes
                  </li>
                  {PROBE_KEYS.map((k) => {
                    const p = PROBE_ANCHORS[k];
                    const active = sel.kind === "probe" && sel.key === k;
                    return (
                      <li key={k}>
                        <button
                          type="button"
                          data-catalog-item
                          role="option"
                          aria-selected={active}
                          className={`side-item ${active ? "side-item-active" : ""}`}
                          onClick={() => setSel({ kind: "probe", key: k })}
                        >
                          <span className="side-item-name">
                            <span>{p.name}</span>
                          </span>
                          <span className="side-item-meta">
                            <span>
                              Launched{" "}
                              <b className="mono">
                                {new Date(p.launched).toLocaleDateString("en-US", {
                                  month: "short",
                                  year: "numeric",
                                  timeZone: "UTC",
                                })}
                              </b>
                            </span>
                            <span>
                              {p.kind === "l2"
                                ? "Sun-Earth L2"
                                : p.kind === "jupiter-orbit"
                                  ? "At Jupiter"
                                  : p.kind === "orbit-sun"
                                    ? "Solar orbit"
                                    : "Interstellar"}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="glass glass-card">
            <h2 className="section-title" style={{ marginTop: 0 }}>
              How this model works
            </h2>
            <p>
              The eight planets are placed at their true positions for the simulated date,
              computed from Keplerian elements published by NASA JPL. Orbital distances are
              to scale; the bodies themselves are enlarged so they remain visible across
              billions of kilometers. Probe distances come from live JPL Horizons queries
              where available, with clearly labeled physics-based estimates otherwise.
            </p>
            <p style={{ marginBottom: 0 }}>
              Every body and probe in the catalog has a full profile page with live
              telemetry, orbital elements, and sky coordinates. Select an object and choose
              "View full object details".
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
