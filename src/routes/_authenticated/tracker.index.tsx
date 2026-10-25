import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { parseOMMArray, propagateSat, type TLE } from "@/lib/satellite";
import { satByIdQuery, satGroupQuery, type SatGroup } from "@/lib/sat-queries";
import { fmtNum, timeAgo } from "@/lib/format";
import { FreshnessBadge } from "@/components/site/freshness-badge";
import { FeedError, FeedLoading, EmptyState } from "@/components/site/data-state";
import { useFavorites } from "@/lib/favorites";
import { useObserverLocation } from "@/lib/location";
import { ObserverLocationControls, PassForecast } from "@/components/tracker/observer-location";
import { FavButton } from "@/components/tracker/fav-button";
import { ComparePanel } from "@/components/tracker/compare-panel";
import { FavoritesTransfer } from "@/components/tracker/favorites-transfer";
import { TIME_RATES, setSimRate, simNow, useSimRate } from "@/lib/sim-clock";
import { getISSPosition } from "@/lib/stellun-data.functions";
import { SceneSkeleton, SceneBootOverlay } from "@/components/site/page-skeleton";

// three.js is browser-only; the globe mounts after hydration.
const TrackerGlobe = lazy(() => import("@/components/tracker/tracker-globe"));

export const Route = createFileRoute("/_authenticated/tracker/")({
  head: () => ({
    meta: [
      { title: "Orbit Tracker - STELLUN" },
      {
        name: "description",
        content:
          "Real-time 3D tracking of the ISS and satellite constellations, propagated from live CelesTrak orbital elements on an interactive Earth globe.",
      },
      { property: "og:title", content: "Orbit Tracker - STELLUN" },
      {
        property: "og:description",
        content:
          "Real-time 3D tracking of the ISS and satellite constellations, propagated from live CelesTrak orbital elements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // The comparison lives in the URL so a comparison can be shared or
  // bookmarked and reopened exactly as it was left.
  validateSearch: (search: Record<string, unknown>): { compare?: string | undefined } => {
    const c = search["compare"];
    return {
      compare: typeof c === "string" && /^\d{1,6}(,\d{1,6}){0,19}$/.test(c) ? c : undefined,
    };
  },
  component: TrackerPage,
});



type RegimeId = "leo" | "meo" | "geo" | "sso" | "debris";

type GroupDef = { id: SatGroup; label: string; color: string; blurb: string };

type RegimeDef = {
  id: RegimeId;
  label: string;
  altScale: number;
  pointSize: number;
  groups: GroupDef[];
};

const REGIMES: RegimeDef[] = [
  {
    id: "leo",
    label: "LEO",
    altScale: 1,
    pointSize: 0.075,
    groups: [
      {
        id: "stations",
        label: "Space stations",
        color: "#ffd489",
        blurb: "Crewed outposts: the ISS, Tiangong, and company.",
      },
      {
        id: "starlink",
        label: "Starlink",
        color: "#9ee8c1",
        blurb: "SpaceX's broadband constellation, the largest fleet ever flown.",
      },
      {
        id: "iridium-NEXT",
        label: "Communications",
        color: "#e3b5f5",
        blurb: "Iridium's low-orbit voice and data relay network, 66 satellites strong.",
      },
      {
        id: "resource",
        label: "Earth observation",
        color: "#a8e6e1",
        blurb: "Landsat-class imagers mapping crops, coastlines, ice, and cities.",
      },
      {
        id: "weather",
        label: "Weather",
        color: "#f5c9a8",
        blurb: "Meteorological satellites watching clouds, storms, and climate.",
      },
      {
        id: "science",
        label: "Science",
        color: "#b8b5ff",
        blurb: "Research craft in Earth orbit: telescopes, experiments, and pathfinders.",
      },
      {
        id: "active",
        label: "Active satellites",
        color: "#9fc2f2",
        blurb: "A cross-section of the active catalog: imaging, science, and communications craft.",
      },
    ],
  },
  {
    id: "meo",
    label: "MEO",
    altScale: 0.35,
    pointSize: 0.13,
    groups: [
      {
        id: "gps-ops",
        label: "GPS",
        color: "#f2a9a9",
        blurb: "The US navigation constellation, orbiting twice a day at 20,200 km.",
      },
      {
        id: "galileo",
        label: "Galileo",
        color: "#a8d8ff",
        blurb: "The EU's civilian navigation constellation at 23,222 km.",
      },
      {
        id: "glo-ops",
        label: "GLONASS",
        color: "#c8b8e8",
        blurb: "Russia's navigation constellation at 19,100 km.",
      },
      {
        id: "beidou",
        label: "BeiDou",
        color: "#f5d9a0",
        blurb: "China's navigation system, a mix of MEO, IGSO, and GEO satellites.",
      },
    ],
  },
  {
    id: "geo",
    label: "GEO",
    altScale: 0.22,
    pointSize: 0.16,
    groups: [
      {
        id: "geo",
        label: "Geosynchronous",
        color: "#90e0d8",
        blurb:
          "Communications and weather satellites at 35,786 km above the equator, matching Earth's rotation. They appear nearly stationary over a fixed longitude.",
      },
    ],
  },
  {
    id: "sso",
    label: "SSO",
    altScale: 1,
    pointSize: 0.075,
    groups: [
      {
        id: "sso",
        label: "Polar sun-synchronous",
        color: "#b8e0ff",
        blurb:
          "Satellites in near-polar orbits (~98 deg inclination) that pass over any given latitude at the same local solar time, ensuring consistent lighting for imaging and weather observation.",
      },
    ],
  },
  {
    id: "debris",
    label: "Debris",
    altScale: 1,
    pointSize: 0.06,
    groups: [
      {
        id: "cosmos-2251-debris",
        label: "Cosmos 2251",
        color: "#e0a0a0",
        blurb:
          "Debris from the 2009 Iridium 33 and Cosmos 2251 collision at 789 km, the first major accidental fragmentation in orbit.",
      },
      {
        id: "iridium-33-debris",
        label: "Iridium 33",
        color: "#e0b8a0",
        blurb:
          "Debris from the 2009 collision between Iridium 33 and Cosmos 2251, the first major accidental fragmentation in orbit.",
      },
      {
        id: "19820",
        label: "Cosmos 1408",
        color: "#d4a8a8",
        blurb:
          "Debris from the November 2021 anti-satellite test that destroyed Cosmos 1408 at approximately 470 km altitude.",
      },
    ],
  },
];

const ALL_GROUPS: GroupDef[] = REGIMES.flatMap((r) => r.groups);
function findGroupDef(id: SatGroup): GroupDef | undefined {
  return ALL_GROUPS.find((g) => g.id === id);
}
function findRegimeDef(id: SatGroup): RegimeDef | undefined {
  return REGIMES.find((r) => r.groups.some((g) => g.id === id));
}

const ISS_NORAD = "25544";


function formatEpoch(jd: number): string {
  return timeAgo(new Date((jd - 2440587.5) * 86400000));
}

type IssFeed = { latitude?: number; longitude?: number; altitude?: number; velocity?: number; timestamp?: number };

function SatelliteDetail({ tle }: { tle: TLE }) {
  const [now, setNow] = useState<Date | null>(null);
  const rate = useSimRate();
  useEffect(() => {
    const tick = () => setNow(simNow());
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, []);
  const s = now ? propagateSat(tle, now) : null;
  const isIss = tle.noradId === ISS_NORAD;
  const live = useQuery({
    queryKey: ["iss-live"],
    queryFn: async () => {
      const r = (await getISSPosition({ data: {} })) as unknown as { data?: IssFeed } & IssFeed;
      return (r?.data ?? r) as IssFeed;
    },
    enabled: isIss,
    refetchInterval: 5000,
  });
  const f = isIss && rate === 1 ? live.data : undefined;
  return (
    <>
      <p className="detail-note live-row" style={{ marginTop: 0 }}>
        <span className="live-dot" aria-hidden />
        {rate === 1
          ? f
            ? "Live ISS telemetry, updated every 5 seconds"
            : "Live position, updated 4 times a second"
          : `Simulated time at ${rate}x: ${now ? now.toISOString().slice(11, 19) : "--"} UTC`}
      </p>
      {f && typeof f.latitude === "number" ? (
        <div className="side-item-meta">
          <span>
            Feed <b className="mono">{fmtNum(f.latitude, 2)}°, {fmtNum(f.longitude ?? 0, 2)}°</b>
          </span>
          <span>
            <b className="mono">{fmtNum(f.altitude ?? 0, 0)} km · {fmtNum(f.velocity ?? 0, 0)} km/h</b>
          </span>
        </div>
      ) : null}
      <div className="side-item-meta">
        <span>
          Lat <b className="mono">{s ? `${fmtNum(s.lat, 2)}°` : "--"}</b>
        </span>
        <span>
          Lon <b className="mono">{s ? `${fmtNum(s.lon, 2)}°` : "--"}</b>
        </span>
      </div>
      <div className="side-item-meta">
        <span>
          Altitude <b className="mono">{s ? `${fmtNum(s.alt, 0)} km` : "--"}</b>
        </span>
        <span>
          Speed <b className="mono">{s ? `${fmtNum(s.speed, 2)} km/s` : "--"}</b>
        </span>
      </div>
      <div className="side-item-meta">
        <span>
          Period <b className="mono">{fmtNum(tle.periodMin, 1)} min</b>
        </span>
        <span>
          NORAD <b className="mono">{tle.noradId}</b>
        </span>
      </div>
      <div className="side-item-meta">
        <span>
          Apogee <b className="mono">{fmtNum(tle.apogeeAlt, 0)} km</b>
        </span>
        <span>
          Perigee <b className="mono">{fmtNum(tle.perigeeAlt, 0)} km</b>
        </span>
      </div>
      <p className="detail-note">
        Orbit propagated from elements issued {formatEpoch(tle.epochJD)} using a Kepler
        solver with J2 secular corrections. Short-term accuracy is typically within a few
        kilometers.
      </p>
    </>
  );
}

function TrackerPage() {
  const [mounted, setMounted] = useState(false);
  const [group, setGroup] = useState<SatGroup>("stations");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const simRate = useSimRate();
  // Leaving the tracker returns the shared clock to real time.
  useEffect(() => () => setSimRate(1), []);
  const [filter, setFilter] = useState("");
  const [isFs, setIsFs] = useState(false);
  const [pseudoFs, setPseudoFs] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareNote, setCompareNote] = useState("");
  const shellRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLUListElement>(null);
  const favorites = useFavorites();
  const loc = useObserverLocation();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  useEffect(() => setMounted(true), []);

  // Restore a comparison from a shared link on first load.
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (!search.compare) return;
    setCompareMode(true);
    setCompareIds(search.compare.split(",").filter(Boolean).slice(0, 12));
    setCompareNote("Comparison restored from the shared link.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the previous group's data while a new group loads so the globe and
  // catalog never blank out between selections.
  // Poll every 60s so fresh catalog data is picked up within a minute of the
  // server cache refreshing. Identical payloads keep the same data reference
  // (structural sharing), so no re-parse or globe rebuild happens when
  // nothing changed. Positions are propagated client-side each frame.
  const query = useQuery({ ...satGroupQuery(group), placeholderData: keepPreviousData, refetchInterval: 60_000 });
  // The full scene skeleton shows only on first boot; once any catalog
  // response (success or failure) arrives, the real layout takes over.
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    if (mounted && !query.isPending) setBooted(true);
  }, [mounted, query.isPending]);
  const groupMeta = findGroupDef(group) ?? ALL_GROUPS[0]!;
  const regimeDef = findRegimeDef(group) ?? REGIMES[0]!;
  const currentRegime = regimeDef.id;

  const tles = useMemo(() => {
    if (!query.data?.data) return [];
    // Full CelesTrak group — no artificial display caps.
    return parseOMMArray(query.data.data);
  }, [query.data]);

  // Default the selection to the ISS whenever the group changes.
  useEffect(() => {
    const iss = tles.find((t) => t.noradId === ISS_NORAD);
    setSelectedId(iss ? ISS_NORAD : null);
  }, [tles]);

  const selected = useMemo(
    () => tles.find((t) => t.noradId === selectedId) ?? null,
    [tles, selectedId]
  );

  const comparisonQueries = useQueries({
    queries: compareIds.map((id) => ({
      ...satByIdQuery(id),
      enabled: !tles.some((t) => t.noradId === id),
    })),
  });
  const compareTles: TLE[] = compareIds
    .map((id, index) => tles.find((t) => t.noradId === id)
      ?? parseOMMArray(comparisonQueries[index]?.data?.data ?? []).find((t) => t.noradId === id))
    .filter((t): t is TLE => !!t);
  const sceneTles = [...tles, ...compareTles.filter((t) => !tles.some((item) => item.noradId === t.noradId))];

  const toggleCompare = (t: TLE) => {
    setCompareIds((prev) => {
      if (prev.includes(t.noradId)) {
        setCompareNote(`${t.name} removed from the comparison.`);
        return prev.filter((id) => id !== t.noradId);
      }
      if (prev.length >= 12) {
        setCompareNote("Compare limit is 12 objects. Remove one to add another.");
        return prev;
      }
      setCompareNote(`${t.name} added to the comparison.`);
      return [...prev, t.noradId];
    });
  };

  const handlePick = (t: TLE) => {
    if (compareMode) toggleCompare(t);
    else setSelectedId(t.noradId);
  };

  const exitCompare = () => {
    setCompareMode(false);
    setCompareIds([]);
    setCompareNote("Compare mode off.");
  };

  useEffect(() => {
    if (compareMode && compareIds.length >= 1) {
      const value = compareIds.join(",");
      if (search.compare !== value) {
        void navigate({ to: "/tracker", search: { compare: value }, replace: true });
      }
    } else if (!compareMode && search.compare) {
      void navigate({ to: "/tracker", search: {}, replace: true });
    }
  }, [compareMode, compareIds, search.compare, navigate]);

  const frameAltKm = useMemo(() => {
    if (selected) return (selected.apogeeAlt + selected.perigeeAlt) / 2;
    if (tles.length === 0) return null;
    let max = 0;
    for (const t of tles) {
      const m = (t.apogeeAlt + t.perigeeAlt) / 2;
      if (m > max) max = m;
    }
    return max;
  }, [selected, tles]);

  const copyCompareLink = async () => {
    if (compareIds.length === 0) return;
    const url = `${window.location.origin}/tracker?compare=${compareIds.join(",")}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCompareNote("Comparison link copied to the clipboard.");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCompareNote("Copy was blocked by the browser. The address bar already holds this comparison link.");
    }
  };

  // Arrow-key navigation for the catalog list.
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

  const visibleCatalog = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const list = f ? tles.filter((t) => t.name.toLowerCase().includes(f)) : tles;
    return list.slice(0, 12);
  }, [tles, filter]);

  const catalogNote = filter.trim()
    ? `${visibleCatalog.length} of ${fmtNum(tles.length)}`
    : tles.length > 12
      ? `${fmtNum(tles.length)} on globe · first 12 listed`
      : `${tles.length} objects`;

  const failed = query.isError || (query.isSuccess && !query.data.data);

  const hud = (
              <div className={`scene-hud${expanded ? "" : " scene-hud-docked"}`} role="toolbar" aria-label="Tracker controls">
                <div className="scene-hud-group" role="group" aria-label="Satellite groups">
                  <div className="regime-tabs" role="tablist" aria-label="Orbital regime">
                    {REGIMES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        role="tab"
                        aria-selected={currentRegime === r.id}
                        className={`regime-tab ${currentRegime === r.id ? "regime-tab-active" : ""}`}
                        onClick={() => {
                          const first = r.groups[0]!;
                          setGroup(first.id);
                          setFilter("");
                          setCompareIds([]);
                        }}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <div className="chip-row" role="group" aria-label={`Satellite groups in ${regimeDef.label}`}>
                    {regimeDef.groups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className={`chip ${group === g.id ? "chip-active" : ""}`}
                        aria-pressed={group === g.id}
                        onClick={() => {
                          setGroup(g.id);
                          setFilter("");
                          setCompareIds([]);
                        }}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className={`chip ${autoRotate ? "chip-active" : ""}`}
                  aria-pressed={autoRotate}
                  aria-label="Toggle globe rotation"
                  onClick={() => setAutoRotate((v) => !v)}
                >
                  Rotate
                </button>
                <button
                  type="button"
                  className={`chip ${compareMode ? "chip-active" : ""}`}
                  aria-pressed={compareMode}
                  aria-label="Toggle satellite compare mode"
                  onClick={() => {
                    if (compareMode) {
                      exitCompare();
                    } else {
                      setCompareMode(true);
                      setCompareNote("Compare mode on. Pick objects to compare them side by side.");
                    }
                  }}
                >
                  Compare
                </button>
                <div className="chip-row" role="group" aria-label="Time speed">
                  {TIME_RATES.map((r) => (
                    <button
                      key={r.rate}
                      type="button"
                      className={`chip ${simRate === r.rate ? "chip-active" : ""}`}
                      aria-pressed={simRate === r.rate}
                      title={r.hint}
                      onClick={() => setSimRate(r.rate)}
                    >
                      {r.label} <span className="chip-sub">{r.hint}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="chip"
                  aria-label="Reset the globe zoom and angle"
                  onClick={() => setResetKey((k) => k + 1)}
                >
                  Reset zoom
                </button>
                <span className="scene-hud-spacer" />
                <button
                  type="button"
                  className={`chip ${expanded ? "chip-active" : ""}`}
                  aria-pressed={expanded}
                  aria-label={expanded ? "Exit fullscreen tracker view" : "Expand the tracker to fill the screen"}
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
          <span className="eyebrow">CelesTrak orbital elements</span>
          <h1>Orbit Tracker</h1>
          <p className="tagline">
            <p className="tagline">
            Satellites are positioned from published orbital elements (CelesTrak and
            related sources), propagated in real time with a Kepler solver corrected for Earth's
            oblateness.<br/>Click a satellite for details, favorites, or comparison.
          </p>
          </p>
        </div>
      </section>

      <section>
        <div className="container">
          {!booted ? (
            <SceneSkeleton label="Acquiring orbital elements" chips={8} />
          ) : (
          <div className="scene-layout">
            <div className="scene-main">
            <div
              ref={shellRef}
              className={`scene-shell${pseudoFs ? " scene-shell-pseudo" : ""}`}
              role="region"
              aria-label="Interactive 3D globe showing live satellite positions"
            >
              {mounted && tles.length > 0 ? (
                <Suspense fallback={<SceneBootOverlay label="Loading the 3D engine" />}>
                  <TrackerGlobe
                    tles={sceneTles}
                    color={groupMeta.color}
                    selected={selected}
                    autoRotate={autoRotate}
                    resetKey={resetKey}
                    observer={loc.location}
                    highlightIds={compareMode ? compareIds : []}
                    frameAltKm={frameAltKm}
                    altitudeScale={regimeDef.altScale}
                    pointSize={regimeDef.pointSize}
                    onSelect={(t) => {
                      if (!t) return;
                      handlePick(tles.find((x) => x.noradId === t.noradId) ?? t);
                    }}
                  />
                </Suspense>
              ) : null}

              {expanded ? hud : null}

              {tles.length > 0 && (
                <div className="scene-corner">
                  <span className="scene-pill">
                    <span className="legend-dot" style={{ background: groupMeta.color }} />
                    {fmtNum(tles.length)} tracked
                  </span>
                </div>
              )}

              {tles.length > 0 && (
                <div className="scene-hint">
                  {compareMode
                    ? "Click satellites to add or remove them from the comparison (highlighted in 3D)"
                    : "Drag to rotate · scroll to zoom · click a satellite"}
                </div>
              )}

              <p className="sr-only" role="status">
                {compareNote}
              </p>

              {!mounted || query.isPending ? (
                <div className="scene-overlay">
                  <FeedLoading label="Acquiring orbital elements" />
                </div>
              ) : failed ? (
                <div className="scene-overlay">
                  <FeedError
                    compact
                    title="Satellite tracking is temporarily unavailable"
                    source="the CelesTrak orbital element catalog"
                    onRetry={() => query.refetch()}
                    retrying={query.isRefetching}
                  />
                </div>
              ) : tles.length === 0 ? (
                <div className="scene-overlay">
                  <EmptyState
                    title="No satellites returned for this group"
                    message="The catalog returned no entries for this selection. Try another group."
                  />
                </div>
              ) : null}
            </div>
            {!expanded ? hud : null}
            </div>

            <aside className="scene-side">
              {compareMode ? (
                <div className="glass glass-card side-card" aria-label="Comparison selection">
                  <div className="side-item-top">
                    <h3>Compare objects</h3>
                  </div>
                  <p className="detail-note">Select up to 12 objects from the globe or catalog.</p>
                  <ul className="side-list">
                    {compareTles.map((t) => (
                      <li className="side-item-row" key={t.noradId}>
                        <span className="side-item-name">{t.name}</span>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleCompare(t)} aria-label={`Remove ${t.name} from selection`}>Remove</button>
                      </li>
                    ))}
                  </ul>
                  <div className="compare-actions">
                    {compareIds.length >= 1 ? (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => void copyCompareLink()}
                      >
                        {copied ? "Link copied" : "Copy share link"}
                      </button>
                    ) : null}
                    <button type="button" className="btn btn-sm" onClick={exitCompare}>
                      Exit compare mode
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass glass-card side-card">
                  <div className="side-item-top">
                    <h3 aria-live="polite">{selected ? selected.name : "Live constellation"}</h3>
                    <span className="side-item-actions">
                      {selected ? (
                        <FavButton
                          isFav={favorites.isFavorite(selected.noradId)}
                          name={selected.name}
                          onToggle={() =>
                            favorites.toggle({ noradId: selected.noradId, name: selected.name })
                          }
                        />
                      ) : null}
                      {query.data ? <FreshnessBadge res={query.data} /> : null}
                    </span>
                  </div>
                  {selected ? (
                    <>
                      <SatelliteDetail key={selected.noradId} tle={selected} />
                      <div className="side-title" style={{ marginTop: 14 }}>
                        Next passes from your location
                      </div>
                      <PassForecast tle={selected} location={loc.location} />
                      <Link
                        to="/tracker/$noradId"
                        params={{ noradId: selected.noradId }}
                        className="detail-link"
                      >
                        View full object details
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="detail-note" style={{ marginTop: 0 }}>
                        {groupMeta.blurb}
                      </p>
                      <div className="side-item-meta">
                        <span>
                          Tracked <b className="mono">{fmtNum(tles.length)}</b>
                        </span>
                        <span>
                          Group <b className="mono">{groupMeta.label}</b>
                        </span>
                      </div>
                      <p className="detail-note">
                        Select any point on the globe for live position, altitude, and
                        velocity.
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="glass glass-card side-card">
                <div className="side-item-top">
                  <h3>Your location</h3>
                </div>
                <ObserverLocationControls loc={loc} />
              </div>

              {tles.length > 0 && (
                <div className="glass glass-card side-card">
                  <div className="side-item-top">
                    <h3>Catalog</h3>
                    <span className="mono" style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
                      {catalogNote}
                    </span>
                  </div>

                  <div className="fav-block">
                    <div className="side-title">Saved objects</div>
                    <FavoritesTransfer
                      favorites={favorites.favorites}
                      onImport={favorites.importMany}
                    />
                    {favorites.favorites.length > 0 ? (
                      <ul className="side-list" aria-label="Saved objects">
                        {favorites.favorites.map((f) => {
                          const inCatalog = tles.find((t) => t.noradId === f.noradId) ?? null;
                          return (
                            <li key={f.noradId}>
                              <div className="side-item-row">
                                {inCatalog ? (
                                  <button
                                    type="button"
                                    className={`side-item ${!compareMode && selectedId === f.noradId ? "side-item-active" : ""}`}
                                    onClick={() => handlePick(inCatalog)}
                                  >
                                    <span className="side-item-name">
                                      <span>{f.name}</span>
                                    </span>
                                    <span className="side-item-meta">
                                      <span>
                                        Alt{" "}
                                        <b className="mono">
                                          {fmtNum((inCatalog.apogeeAlt + inCatalog.perigeeAlt) / 2, 0)} km
                                        </b>
                                      </span>
                                      <span>
                                        Period <b className="mono">{fmtNum(inCatalog.periodMin, 0)} min</b>
                                      </span>
                                    </span>
                                  </button>
                                ) : (
                                  <Link
                                    to="/tracker/$noradId"
                                    params={{ noradId: f.noradId }}
                                    className="side-item"
                                  >
                                    <span className="side-item-name">
                                      <span>{f.name}</span>
                                    </span>
                                    <span className="side-item-meta">
                                      <span>Open full details</span>
                                    </span>
                                  </Link>
                                )}
                                <FavButton
                                  isFav
                                  name={f.name}
                                  onToggle={() => favorites.toggle({ noradId: f.noradId, name: f.name })}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="detail-note">
                        No saved objects yet. Select the star on any object to keep it
                        here, or import a previously exported list.
                      </p>
                    )}
                  </div>

                  <input
                    type="search"
                    className="catalog-search"
                    placeholder={`Search ${fmtNum(tles.length)} objects`}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    aria-label="Search satellites in this group"
                  />
                  {visibleCatalog.length > 0 ? (
                    <ul
                      ref={catalogRef}
                      className="side-list"
                      style={{ maxHeight: 260, overflowY: "auto" }}
                      aria-label="Satellite catalog"
                      onKeyDown={onCatalogKeyDown}
                    >
                      {visibleCatalog.map((t) => {
                        const inCompare = compareIds.includes(t.noradId);
                        return (
                          <li key={t.noradId}>
                            <div className="side-item-row">
                              <button
                                type="button"
                                data-catalog-item
                                className={`side-item ${!compareMode && selectedId === t.noradId ? "side-item-active" : ""} ${inCompare ? "side-item-compare" : ""}`}
                                aria-current={!compareMode && selectedId === t.noradId ? "true" : undefined}
                                onClick={() => handlePick(t)}
                              >
                                <span className="side-item-name">
                                  {inCompare ? (
                                    <span className="compare-badge" aria-hidden="true">
                                      {compareIds.indexOf(t.noradId) + 1}
                                    </span>
                                  ) : null}
                                  <span>{t.name}</span>
                                </span>
                                <span className="side-item-meta">
                                  <span>
                                    Alt <b className="mono">{fmtNum((t.apogeeAlt + t.perigeeAlt) / 2, 0)} km</b>
                                  </span>
                                  <span>
                                    Period <b className="mono">{fmtNum(t.periodMin, 0)} min</b>
                                  </span>
                                </span>
                              </button>
                              <FavButton
                                isFav={favorites.isFavorite(t.noradId)}
                                name={t.name}
                                onToggle={() => favorites.toggle({ noradId: t.noradId, name: t.name })}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="detail-note">No objects in this group match that search.</p>
                  )}
                </div>
              )}
            </aside>
          </div>
          )}

          {compareMode ? <ComparePanel items={compareTles} onRemove={(id) => setCompareIds((prev) => prev.filter((x) => x !== id))} /> : null}

          <p className="scaffold-note" style={{ marginTop: 18 }}>
            Elements source: CelesTrak, refreshed regularly. Positions are computed, not
            streamed, so short-term accuracy depends on element age; the readout above
            shows how recently the current set was issued.
          </p>
        </div>
      </section>
    </main>
  );
}
