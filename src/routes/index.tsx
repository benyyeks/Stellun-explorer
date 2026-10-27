import { useAuth } from "@/hooks/use-auth";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import {
  getLatestNews,
  getCompetitions,
  submitFeedback,
  type NewsItem,
  type CompetitionItem,
} from "@/lib/news.functions";
import { getLaunches, getNEO, getEarthWeather, getAPOD } from "@/lib/stellun-data.functions";
import { timeAgo, safeText, plainText, pad2, utcDateStr } from "@/lib/format";
import {
  heliocentricEcliptic,
  julianDateUTC,
  PLANET_ELEMENTS,
  PLANET_ORDER,
  type PlanetKey,
} from "@/lib/astronomy";
import { EmptyState } from "@/components/site/data-state";
import { SkeletonImage } from "@/components/site/skeleton-image";
import { LandingSkeleton } from "@/components/site/page-skeleton";

const newsQueryOptions = queryOptions({
  queryKey: ["stellun", "news", "latest"],
  queryFn: () => getLatestNews(),
});

const competitionsQueryOptions = queryOptions({
  queryKey: ["stellun", "competitions"],
  queryFn: () => getCompetitions(),
});

const apodQueryOptions = queryOptions({
  queryKey: ["stellun", "apod"],
  queryFn: () => getAPOD(),
  staleTime: 60 * 60_000,
});

type ApodPayload = {
  title?: string;
  explanation?: string;
  hdurl?: string | null;
  url?: string | null;
  date?: string | null;
  copyright?: string;
  media_type?: string;
};

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.allSettled([
      context.queryClient.ensureQueryData(newsQueryOptions),
      context.queryClient.ensureQueryData(competitionsQueryOptions),
      context.queryClient.ensureQueryData(apodQueryOptions),
    ]);
    return {};
  },
  head: () => ({
    meta: [
      { title: "STELLUN · Space intelligence dashboard" },
      {
        name: "description",
        content:
          "Independent space dashboard: orbit tracking, sky conditions, space weather, launches, missions, and study tools. Not affiliated with NASA, NOAA, or ESA.",
      },
      { property: "og:title", content: "STELLUN · Space intelligence dashboard" },
      {
        property: "og:description",
        content:
          "Live orbital context, sky tonight, space weather, launches, and mission intelligence — educational tools from public science feeds.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://stellun-explorer.noreplyobitex.workers.dev/",
      },
      { property: "og:title", content: "STELLUN · Space intelligence dashboard" },
{
  property: "og:description",
  content:
    "Orbit tracking, sky conditions, space weather, launches, and missions — educational space tools.",
},
{ property: "og:type", content: "website" },
{ property: "og:url", content: "https://stellun-explorer.noreplyobitex.workers.dev/" },
{ property: "og:image", content: "https://stellun-explorer.noreplyobitex.workers.dev/og-image.png" },
{ property: "og:image:width", content: "1200" },
{ property: "og:image:height", content: "630" },
{ name: "twitter:card", content: "summary_large_image" },
{ name: "twitter:title", content: "STELLUN · Space intelligence dashboard" },
{
  name: "twitter:description",
  content:
    "Orbit tracking, sky conditions, space weather, launches, and missions — educational space tools.",
},
{ name: "twitter:image", content: "https://stellun-explorer.noreplyobitex.workers.dev/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "STELLUN · Space intelligence dashboard" },
      {
        name: "twitter:description",
        content:
          "Orbit tracking, sky conditions, space weather, launches, and missions — educational space tools.",
      },
    ],
  }),
  staleTime: 60_000,
  pendingMs: 0,
  pendingComponent: LandingSkeleton,
  component: LandingPage,
});

// ----------------------------- Explore cards ------------------------------
type ExploreCard = { to: string; icon: string; title: string; blurb: string };
const EXPLORE: ExploreCard[] = [
  { to: "/tracker", icon: "tracker", title: "Orbit Tracker", blurb: "Live 3D globe with satellites propagated from real NORAD element sets." },
  { to: "/deepspace", icon: "deepspace", title: "Deep Space", blurb: "Real planetary orbits and live distance tracking for active probes." },
  { to: "/sky", icon: "sky", title: "Sky Tonight", blurb: "Moon phase, visible planets, and rise/set times for your location." },
  { to: "/mars", icon: "mars", title: "Mars", blurb: "Latest raw imagery from Curiosity and Perseverance." },
  { to: "/roman", icon: "roman", title: "Roman Space Telescope", blurb: "Mission timeline, survey footprint, instrument simulator, and flight hardware." },
  { to: "/weather", icon: "weather", title: "Space Weather", blurb: "Geomagnetic index, solar wind, and aurora outlook from NOAA SWPC." },
  { to: "/neo", icon: "neo", title: "Asteroid Watch", blurb: "Upcoming close approaches, ranked by miss distance." },
  { to: "/launches", icon: "launches", title: "Launches", blurb: "Upcoming orbital launches worldwide with live countdowns." },
  { to: "/intelligence", icon: "intelligence", title: "Mission Intelligence", blurb: "Mission profiles, agencies, and flight context in one place." },
  { to: "/study-desk", icon: "study", title: "Study Desk", blurb: "Named workspaces, reading lists, and study plans for aerospace learning." },
  { to: "/ask", icon: "ask", title: "Stellun AI", blurb: "A grounded assistant that answers from this session's live data." },
];

const ICONS: Record<string, React.ReactNode> = {
  tracker: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="7.2" /><ellipse cx="12" cy="12" rx="7.2" ry="2.8" transform="rotate(28 12 12)" /></svg>
  ),
  deepspace: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="9" cy="15" r="2.4" /><circle cx="17" cy="7" r="1.3" fill="currentColor" stroke="none" /><path d="M4 19 C 8 10, 16 14, 20 5" /></svg>
  ),
  sky: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M17.5 15.5A7 7 0 1 1 8.7 4.2a5.6 5.6 0 0 0 8.8 11.3Z" /></svg>
  ),
  mars: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="10.5" cy="13.5" r="6" /><path d="M15 9l5-5M20 4h-4.5M20 4v4.5" /></svg>
  ),
  roman: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l4-9h4l4 9z" /><path d="M8.5 15v4h7v-4" /><path d="M12 6V3" /></svg>
  ),
  weather: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="3.6" /><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M5.6 18.4l1.7-1.7M16.7 7.3l1.7-1.7" /></svg>
  ),
  neo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 5l3 1.5L14 5l3 3-1 3.3 2 2.7-2.5 2L15 19l-3.3-1L9 19l-.5-3-2.5-2 2-2.7L7 8z" /></svg>
  ),
  launches: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c2.5 2 4 5.3 4 9l-4 3-4-3c0-3.7 1.5-7 4-9Z" /><path d="M8.5 14L6 15.5 6.5 12M15.5 14l2.5 1.5-.5-3.5M10.5 17.5L9 20M13.5 17.5L15 20" /></svg>
  ),
  ask: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H8l-4 4V5Z" /><path d="M9 10h6M9 13h4" /></svg>
  ),
  intelligence: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
    </svg>
  ),
  study: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h7a3 3 0 0 1 3 3v11a2.5 2.5 0 0 0-2.5-2.5H4V5Z" />
      <path d="M20 5h-7a3 3 0 0 0-3 3v11a2.5 2.5 0 0 1 2.5-2.5H20V5Z" />
    </svg>
  ),
};

// --------------------------- Hero orbit diagram ----------------------------
// Top-down heliocentric map of all eight planets. Positions are computed in
// the browser from JPL Keplerian elements for the current instant and
// recomputed every minute, so the diagram always shows the real configuration
// of the solar system on the current Earth day. A square-root radial scale
// keeps Mercury and Neptune readable in the same frame.
const ORBIT_R_MAX = 94;
const NEPTUNE_SQRT_A = Math.sqrt(PLANET_ELEMENTS.neptune.a[0]);

function orbitRadius(au: number): number {
  return (Math.sqrt(Math.max(au, 0.05)) / NEPTUNE_SQRT_A) * ORBIT_R_MAX;
}

// Orbit outline for one planet. Each orbit is a true ellipse: the radius at a
// given true anomaly comes from the conic equation using the planet's real
// semi-major axis and eccentricity, and the ellipse is rotated so its
// perihelion points the right way. The same square-root radial scale as the
// planet markers is applied, so a marker always sits on its own path.
function orbitPath(key: PlanetKey): string {
  const el = PLANET_ELEMENTS[key];
  const a = el.a[0];
  const e = el.e[0];
  const longPeri = el.peri[0] * DEG_TO_RAD;
  const steps = 120;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const nu = (i / steps) * Math.PI * 2;
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
    const lon = nu + longPeri;
    const rho = orbitRadius(r);
    const x = 100 + rho * Math.cos(lon);
    const y = 100 - rho * Math.sin(lon);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return `${d}Z`;
}

const DEG_TO_RAD = Math.PI / 180;

const PLANET_DOT_R: Record<PlanetKey, number> = {
  mercury: 1.9,
  venus: 2.4,
  earth: 2.7,
  mars: 2.2,
  jupiter: 4.3,
  saturn: 3.8,
  uranus: 3.1,
  neptune: 3.0,
};

const PLANET_NAMES: Record<PlanetKey, string> = {
  mercury: "Mercury",
  venus: "Venus",
  earth: "Earth",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
};

// True-color palette for the hero diagram (approx. NASA true-color imagery),
// so planets are told apart by color alone, no labels needed.
const HERO_PLANET_COLORS: Record<PlanetKey, string> = {
  mercury: "#a89a8c",
  venus: "#e0b56e",
  earth: "#3f8fe0",
  mars: "#c1440e",
  jupiter: "#d1a876",
  saturn: "#e0c689",
  uranus: "#8fd1d8",
  neptune: "#4a67d6",
};

type HeroPlanet = {
  key: PlanetKey;
  x: number;
  y: number;
  dotR: number;
  color: string;
  distAU: number;
};

function computeHeroPlanets(now: Date): HeroPlanet[] {
  const jd = julianDateUTC(now);
  return PLANET_ORDER.map((key) => {
    const h = heliocentricEcliptic(key, jd);
    const rho = orbitRadius(h.r);
    const lon = Math.atan2(h.y, h.x);
    return {
      key,
      x: 100 + rho * Math.cos(lon),
      y: 100 - rho * Math.sin(lon),
      dotR: PLANET_DOT_R[key],
      color: HERO_PLANET_COLORS[key],
      distAU: h.r,
    };
  });
}

function HeroOrbit() {
  const [planets, setPlanets] = useState<HeroPlanet[] | null>(null);
  const [stamp, setStamp] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setPlanets(computeHeroPlanets(now));
      setStamp(utcDateStr(now));
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hero-orbit" aria-hidden="true">
      <svg viewBox="0 0 200 200">
        {PLANET_ORDER.map((key) => (
          <path
            key={key}
            className={`ring${key === "earth" ? " ring-accent" : ""}`}
            d={orbitPath(key)}
            fill="none"
          />
        ))}
        <circle className="sun-halo" cx={100} cy={100} r="11" />
        <circle className="sun" cx={100} cy={100} r="6" />
        {planets?.map((p) => (
          <circle key={p.key} className="planet" cx={p.x} cy={p.y} r={p.dotR} fill={p.color}>
            <title>{`${PLANET_NAMES[p.key]} - ${p.distAU.toFixed(2)} AU from the Sun`}</title>
          </circle>
        ))}
      </svg>
      <div className="hero-orbit-caption mono">
        {stamp ? `Planetary positions for ${stamp}` : "Computing planetary positions"}
      </div>
    </div>
  );
}

// ------------------------------ UTC clock ----------------------------------
function useUtcClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return "-- : -- : -- UTC";
  return `${pad2(now.getUTCHours())}:${pad2(now.getUTCMinutes())}:${pad2(now.getUTCSeconds())} UTC`;
}

// --------------------------- Overview strip --------------------------------
type LaunchBrief = { name: string; net: string | null; image: string | null; provider: string };

function parseLaunchBriefs(payload: unknown): LaunchBrief[] {
  const results = (payload as { results?: unknown[] } | null)?.results;
  if (!Array.isArray(results)) return [];
  return results
    .map((raw) => {
      const l = raw as Record<string, unknown>;
      const name = typeof l["name"] === "string" ? l["name"] : "";
      if (!name) return null;
      const net = typeof l["net"] === "string" ? l["net"] : null;
      const image = typeof l["image"] === "string" ? l["image"] : null;
      const provider =
        (l["launch_service_provider"] as { name?: string } | null)?.name ?? "";
      return { name, net, image, provider };
    })
    .filter((l): l is LaunchBrief => l !== null);
}

function OverviewStrip() {
  const launchesQ = useQuery({
    queryKey: ["stellun", "launches", "overview"],
    queryFn: () => getLaunches(),
    staleTime: 5 * 60_000,
  });
  const neoQ = useQuery({
    queryKey: ["stellun", "neo", "overview"],
    queryFn: () => getNEO(),
    staleTime: 60 * 60_000,
  });

  const nextLaunch = useMemo(() => {
    const briefs = parseLaunchBriefs(launchesQ.data?.data);
    return briefs[0]?.name.split("|")[0]?.trim().slice(0, 22) ?? null;
  }, [launchesQ.data]);

  const neoCount = useMemo(() => {
    const d = neoQ.data?.data as { element_count?: number; near_earth_objects?: Record<string, unknown[]> } | undefined;
    if (!d) return null;
    if (typeof d.element_count === "number") return d.element_count;
    if (d.near_earth_objects) return Object.values(d.near_earth_objects).flat().length;
    return null;
  }, [neoQ.data]);

  return (
    <div className="overview-strip glass">
      <div className="overview-item">
        <span className="overview-value">9</span>
        <span className="overview-label">Live data sources</span>
      </div>
      <div className="overview-item">
        <span className="overview-value">{EXPLORE.length}</span>
        <span className="overview-label">Tools in one platform</span>
      </div>
      <div className="overview-item">
        <span className="overview-value">{nextLaunch ?? "--"}</span>
        <span className="overview-label">Next launch</span>
      </div>
      <div className="overview-item">
        <span className="overview-value">{neoCount ?? "--"}</span>
        <span className="overview-label">Near-Earth objects tracked this week</span>
      </div>
    </div>
  );
}

// ----------------------------- Weather widget -------------------------------
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Depositing rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Light showers", 81: "Showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm with hail",
};

function observingNote(cloudCover: number | null, isDay: boolean): string {
  if (cloudCover === null) return "";
  if (isDay) {
    if (cloudCover < 30) return "Clear conditions now (daytime).";
    if (cloudCover < 70) return "Partly cloudy right now.";
    return "Cloudy right now.";
  }
  if (cloudCover < 20) return "Excellent for stargazing tonight.";
  if (cloudCover < 50) return "Some breaks in the cloud for stargazing.";
  if (cloudCover < 80) return "Mostly cloudy — stargazing will be difficult.";
  return "Overcast — poor for stargazing tonight.";
}

type CurrentWeather = {
  temperature_2m?: number;
  apparent_temperature?: number;
  relative_humidity_2m?: number;
  cloud_cover?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  is_day?: number; // 1 = day, 0 = night
};

type WeatherState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ok"; current: CurrentWeather }
  | { status: "error"; message: string };

function WeatherWidget() {
  const fetchWeather = useServerFn(getEarthWeather);
  const [state, setState] = useState<WeatherState>({ status: "idle" });
  const coordsRef = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (state.status !== "ok" || !coordsRef.current) return;
    const id = setInterval(async () => {
      const c = coordsRef.current;
      if (!c) return;
      try {
        const res = await fetchWeather({ data: c });
        const current = (res?.data as { current?: CurrentWeather } | undefined)?.current;
        if (current) setState({ status: "ok", current });
      } catch {
        /* keep last reading */
      }
    }, 5 * 60_000);
    return () => clearInterval(id);
  }, [fetchWeather, state.status]);

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({
        status: "error",
        message: "Location is not available in this browser.",
      });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        coordsRef.current = coords;
        try {
          const res = await fetchWeather({ data: coords });
          const current = (res?.data as { current?: CurrentWeather } | undefined)?.current;
          if (current) {
            setState({ status: "ok", current });
          } else {
            setState({
              status: "error",
              message: "Weather came back empty. Try again in a moment.",
            });
          }
        } catch {
          setState({
            status: "error",
            message: "Could not load weather for that location.",
          });
        }
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. You can enable it in browser settings."
            : err.code === err.TIMEOUT
              ? "Location request timed out. Try again."
              : "Could not read your location.";
        setState({ status: "error", message });
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  };

  const reset = () => {
    coordsRef.current = null;
    setState({ status: "idle" });
  };

  if (state.status === "ok") {
    const c = state.current;
    const isDay = c.is_day !== 0;
    const note = observingNote(c.cloud_cover ?? null, isDay);

    return (
      <div className="glass glass-card weather-widget weather-widget-live">
        <div className="weather-live-head">
          <div>
            <span className="eyebrow">Local conditions</span>
            <h3>Now at your location</h3>
            <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
              Current reading · {isDay ? "Daytime" : "Night"} · Open-Meteo
            </p>
          </div>
          <div className="weather-live-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={requestLocation}>
              Refresh
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
              Clear
            </button>
          </div>
        </div>

        <div className="weather-live-body">
          <div className="weather-live-temp">
            <span className="weather-live-deg">{Math.round(c.temperature_2m ?? 0)}</span>
            <span className="weather-live-unit">°C</span>
          </div>
          <div className="weather-live-summary">
            <strong>
              {WMO_DESCRIPTIONS[c.weather_code ?? -1] ?? "Current conditions"}
            </strong>
            <span>{Math.round(c.cloud_cover ?? 0)}% cloud cover</span>
            {note ? <span className="text-accent">{note}</span> : null}
          </div>
        </div>

        <div className="weather-live-metrics">
          <div>
            <span className="weather-metric-label">Feels like</span>
            <span className="weather-metric-value">
              {Math.round(c.apparent_temperature ?? 0)}°C
            </span>
          </div>
          <div>
            <span className="weather-metric-label">Wind</span>
            <span className="weather-metric-value">
              {Math.round(c.wind_speed_10m ?? 0)} km/h
            </span>
          </div>
          <div>
            <span className="weather-metric-label">Humidity</span>
            <span className="weather-metric-value">
              {Math.round(c.relative_humidity_2m ?? 0)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass glass-card weather-widget">
      <div className="weather-request">
        <div>
          <span className="eyebrow">Local conditions</span>
          <h3>Sky conditions near you</h3>
          <p className="text-muted" style={{ marginBottom: 0 }}>
            Current temperature and cloud cover for observing plans—not a full
            multi-day forecast. Location stays on your device until you allow it.
          </p>
          {state.status === "error" ? (
            <p className="weather-error" role="alert">
              {state.message}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={requestLocation}
          disabled={state.status === "locating"}
        >
          {state.status === "locating" ? "Locating…" : "Use my location"}
        </button>
      </div>
    </div>
  );
}

// --------------------------------- News -------------------------------------
function normalizeType(type: string): string {
  return type.endsWith("s") ? type.slice(0, -1) : type;
}

function newsTypeLabel(type: string): string {
  const t = normalizeType(type);
  return t === "article" ? "Article" : t === "blog" ? "Blog / Vlog" : t === "report" ? "Report" : "News";
}

function NewsCard({ item }: { item: NewsItem }) {
  const published = item.published_at ? new Date(item.published_at) : null;
  return (
    <a className="news-card interactive" href={item.url} target="_blank" rel="noopener noreferrer">
      <SkeletonImage src={item.image_url} className="news-img" />
      <div className="news-body">
        <span className="badge badge-accent">{newsTypeLabel(item.content_type)}</span>
        <h3>{safeText(item.title, 110)}</h3>
        {item.summary ? <p>{plainText(item.summary, 140)}</p> : null}
        <div className="news-foot">
          <span>{safeText(item.news_site, 30)}</span>
          {published ? <span> · {timeAgo(published)}</span> : null}
        </div>
      </div>
    </a>
  );
}

function LaunchCard({ launch }: { launch: LaunchBrief }) {
  const when = launch.net
    ? new Date(launch.net).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
      }) + " UTC"
    : "Date TBD";
  return (
    <Link className="news-card launch-card interactive" to="/launches">
      <SkeletonImage src={launch.image} className="news-img" />
      <div className="news-body">
        <span className="badge badge-warning">Launch</span>
        <h3>{safeText(launch.name, 90)}</h3>
        <div className="launch-when">{when}</div>
        <div className="news-foot">
          <span>{safeText(launch.provider, 30)}</span>
        </div>
      </div>
    </Link>
  );
}

const NEWS_FILTERS = [
  { key: "", label: "All" },
  { key: "article", label: "Articles" },
  { key: "blog", label: "Blogs & vlogs" },
  { key: "report", label: "Reports" },
  { key: "launch", label: "Launches" },
];

function NewsSection() {
  const { data: newsResult } = useSuspenseQuery(newsQueryOptions);
  const launchesQ = useQuery({
    queryKey: ["stellun", "launches", "overview"],
    queryFn: () => getLaunches(),
    staleTime: 5 * 60_000,
  });
  const [filter, setFilter] = useState("");

  const newsItems = useMemo(() => newsResult.items ?? [], [newsResult]);
  const launches = useMemo(() => parseLaunchBriefs(launchesQ.data?.data), [launchesQ.data]);

  const visibleNews = useMemo(() => {
    if (!filter || filter === "launch") return newsItems;
    return newsItems.filter((n) => normalizeType(n.content_type) === filter);
  }, [newsItems, filter]);

  return (
    <section id="news">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Updated daily</span>
          <h2>Space news &amp; launches</h2>
        </div>
        <div className="news-filters" role="tablist" aria-label="News category">
          {NEWS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={`glass-pill news-filter${filter === f.key ? " active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filter === "launch" ? (
          launches.length > 0 ? (
            <div className="news-grid">
              {launches.slice(0, 9).map((l) => (
                <LaunchCard key={l.name + (l.net ?? "")} launch={l} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No launches currently listed"
              message="The worldwide schedule has no confirmed orbital launches in the coming window. New missions appear as they are announced."
            />
          )
        ) : visibleNews.length > 0 ? (
          <div className="news-grid">
            {!filter && launches[0] ? <LaunchCard key={launches[0].name} launch={launches[0]} /> : null}
            {visibleNews.slice(0, 12).map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
            {!filter && launches[1] ? <LaunchCard key={launches[1].name} launch={launches[1]} /> : null}
          </div>
        ) : newsResult.error ? (
          <EmptyState
            title="News is temporarily unavailable"
            message="The news desk could not be reached. Stories return automatically, so please check back shortly."
          />
        ) : (
          <EmptyState
            title="Nothing in this category right now"
            message="Try another category, or check back after the next daily update."
          />
        )}
      </div>
    </section>
  );
}

// ------------------------------ Competitions ---------------------------------

function deadlineEndMs(deadline: string | null): number | null {
  if (!deadline) return null;
  // End of deadline day UTC
  const t = Date.parse(deadline + "T23:59:59.000Z");
  return Number.isFinite(t) ? t : null;
}

function useCountdown(deadline: string | null) {
  const end = deadlineEndMs(deadline);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (end == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [end]);
  if (end == null) return { expired: false, label: "See site for dates" };
  const ms = end - now;
  if (ms <= 0) return { expired: true, label: "Closed" };
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const label =
    d > 0
      ? `${d}d ${h}h ${m}m`
      : h > 0
        ? `${h}h ${m}m ${sec}s`
        : `${m}m ${sec}s`;
  return { expired: false, label };
}

function CompetitionCountdown({ deadline }: { deadline: string | null }) {
  const { expired, label } = useCountdown(deadline);
  return (
    <span className={`comp-countdown${expired ? " is-expired" : ""}`}>
      {expired ? "Closed" : `Closes in ${label}`}
    </span>
  );
}

function CompetitionCard({
  comp,
  onOpen,
}: {
  comp: CompetitionItem;
  onOpen: (c: CompetitionItem) => void;
}) {
  const { expired } = useCountdown(comp.deadline);
  if (expired) return null;

  return (
    <button
      type="button"
      className="glass glass-card competition-card-v2 interactive"
      onClick={() => onOpen(comp)}
    >
      <div className="comp-media">
        {comp.image_url ? (
          <img src={comp.image_url} alt="" loading="lazy" />
        ) : (
          <div className="comp-media-fallback" aria-hidden />
        )}
        {comp.category ? (
          <span className="comp-cat">{safeText(comp.category, 24)}</span>
        ) : null}
      </div>
      <div className="comp-body">
        <h3>{safeText(comp.name, 90)}</h3>
        <div className="competition-org">
          {safeText(comp.organizer ?? "", 70)}
          {comp.region ? ` · ${safeText(comp.region, 40)}` : ""}
        </div>
        <p>{safeText(comp.summary ?? comp.description ?? "", 140)}</p>
        <div className="comp-foot">
          <CompetitionCountdown deadline={comp.deadline} />
          <span className="comp-open-hint">Details</span>
        </div>
      </div>
    </button>
  );
}

function CompetitionModal({
  comp,
  onClose,
}: {
  comp: CompetitionItem;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="comp-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="glass glass-card comp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comp-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="comp-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {comp.image_url ? (
          <div className="comp-modal-hero">
            <img src={comp.image_url} alt="" />
          </div>
        ) : null}
        <div className="comp-modal-body">
          {comp.category ? <span className="badge badge-accent">{comp.category}</span> : null}
          <h2 id="comp-modal-title">{comp.name}</h2>
          <p className="competition-org">
            {comp.organizer}
            {comp.region ? ` · ${comp.region}` : ""}
          </p>
          <CompetitionCountdown deadline={comp.deadline} />
          <p className="comp-modal-desc">{comp.description ?? comp.summary}</p>
          <dl className="comp-meta">
            {comp.eligibility ? (
              <>
                <dt>Eligibility</dt>
                <dd>{comp.eligibility}</dd>
              </>
            ) : null}
            {comp.prizes ? (
              <>
                <dt>Recognition / prizes</dt>
                <dd>{comp.prizes}</dd>
              </>
            ) : null}
            {comp.fee ? (
              <>
                <dt>Cost</dt>
                <dd>{comp.fee}</dd>
              </>
            ) : null}
            {comp.deadline ? (
              <>
                <dt>Application deadline</dt>
                <dd>
                  {new Date(comp.deadline + "T12:00:00Z").toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </>
            ) : null}
          </dl>
          <a
            className="btn btn-primary"
            href={comp.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Apply / official site
          </a>
        </div>
      </div>
    </div>
  );
}

function CompetitionsSection() {
  const { data } = useSuspenseQuery(competitionsQueryOptions);
  const [filter, setFilter] = useState<string>("All");
  const [region, setRegion] = useState<string>("All");
  const [selected, setSelected] = useState<CompetitionItem | null>(null);
  const [, setTick] = useState(0);

  // Re-render once a minute so expired cards drop without a full reload
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const raw = data.items ?? [];
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of raw) if (c.category) set.add(c.category);
    return ["All", ...Array.from(set).sort()];
  }, [raw]);
  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const c of raw) if (c.region) set.add(c.region);
    return ["All", ...Array.from(set).sort()];
  }, [raw]);

  const items = useMemo(() => {
    const now = Date.now();
    return raw.filter((c) => {
      const end = deadlineEndMs(c.deadline);
      if (end != null && end <= now) return false;
      if (filter !== "All" && c.category !== filter) return false;
      if (region !== "All" && c.region !== region) return false;
      return true;
    });
  }, [raw, filter, region]);

  if (!raw.length) return null;

  return (
    <section className="tight" id="competitions">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Get involved</span>
          <h2>STEM competitions &amp; hackathons</h2>
          <p className="section-lead">
            Open windows across aerospace, robotics, coding, and science. Cards disappear
            automatically when the application deadline passes.
          </p>
        </div>

        <div className="comp-filters" role="toolbar" aria-label="Filter competitions">
          <div className="comp-filter-row">
            <span className="comp-filter-label">Field</span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`comp-chip${filter === cat ? " is-active" : ""}`}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="comp-filter-row">
            <span className="comp-filter-label">Region</span>
            {regions.map((r) => (
              <button
                key={r}
                type="button"
                className={`comp-chip${region === r ? " is-active" : ""}`}
                onClick={() => setRegion(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-muted">No open competitions match these filters right now.</p>
        ) : (
          <div className="competition-grid-v2">
            {items.map((c) => (
              <CompetitionCard key={c.id} comp={c} onOpen={setSelected} />
            ))}
          </div>
        )}
      </div>
      {selected ? (
        <CompetitionModal comp={selected} onClose={() => setSelected(null)} />
      ) : null}
    </section>
  );
}
// ------------------------------ Feedback form --------------------------------
type FormStatus = { kind: "success" | "error"; message: string } | null;

function FeedbackSection() {
  const submit = useServerFn(submitFeedback);
  const [status, setStatus] = useState<FormStatus>(null);
  const [sending, setSending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const fd = new FormData(e.currentTarget);
    setSending(true);
    setStatus(null);
    try {
      const res = await submit({
        data: {
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          type: String(fd.get("type") ?? "suggestion") as "suggestion" | "bug" | "data" | "other",
          message: String(fd.get("message") ?? ""),
          company: String(fd.get("company") ?? ""),
        },
      });
      if (res.ok) {
        setStatus({ kind: "success", message: "Thank you. Your message has been sent to the team." });
        formRef.current?.reset();
      } else {
        setStatus({ kind: "error", message: res.error ?? "Your message could not be sent. Please try again." });
      }
    } catch {
      setStatus({ kind: "error", message: "Your message could not be sent. Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="tight">
      <div className="container">
        <div className="glass glass-card suggestion-form-wrap">
          <span className="eyebrow">Help shape STELLUN</span>
          <h2>Suggestions &amp; feedback</h2>
          <p className="text-muted">
            Found something wrong, or want a feature added? Tell us directly, it goes
            straight to the team building this.
          </p>
          <form ref={formRef} className="suggestion-form" onSubmit={onSubmit}>
            <p className="hp-field" aria-hidden="true">
              <label>
                Leave this empty: <input name="company" tabIndex={-1} autoComplete="off" />
              </label>
            </p>
            <div className="form-row">
              <label htmlFor="fb-name">Name <span className="text-faint">(optional)</span></label>
              <input type="text" id="fb-name" name="name" maxLength={80} autoComplete="name" />
            </div>
            <div className="form-row">
              <label htmlFor="fb-email">
                Email <span className="text-faint">(optional, if you'd like a reply)</span>
              </label>
              <input type="email" id="fb-email" name="email" maxLength={120} autoComplete="email" />
            </div>
            <div className="form-row">
              <label htmlFor="fb-type">Type</label>
              <select id="fb-type" name="type" defaultValue="suggestion">
                <option value="suggestion">Feature suggestion</option>
                <option value="bug">Something's not working</option>
                <option value="data">Data accuracy concern</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="fb-message">Message</label>
              <textarea id="fb-message" name="message" required minLength={3} maxLength={2000} rows={5} />
            </div>
            <div>
              <button type="submit" className="btn btn-primary" disabled={sending}>
                {sending ? "Sending..." : "Send feedback"}
              </button>
              <p className={`form-status${status ? ` ${status.kind}` : ""}`} role="status">
                {status?.message ?? ""}
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

// ------------------------------ ApodSection ---------------------------------
function ApodSection() {
  const { data } = useSuspenseQuery(apodQueryOptions);
  const apod = data?.data as ApodPayload | undefined;

  const mediaRef = useRef<HTMLDivElement | null>(null);
  const [fs, setFs] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  if (!apod?.url && !apod?.hdurl) {
    return (
      <section id="apod" className="tight">
        <div className="container">
          <EmptyState
            title="Picture of the Day unavailable"
            message="NASA's Astronomy Picture of the Day feed did not return an image for this run. It usually returns within a few hours."
          />
        </div>
      </section>
    );
  }

  const img = apod.hdurl || apod.url || "";
  const isVideo = apod.media_type === "video";
  const title = apod.title || "Astronomy Picture of the Day";
  const explanation = (apod.explanation || "").trim();

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/#apod`
      : "https://stellun-explorer.noreplyobitex.workers.dev/apod";

  const caption = [
    title,
    apod.date ? `NASA APOD · ${apod.date}` : "NASA Astronomy Picture of the Day",
    explanation ? explanation.slice(0, 280) + (explanation.length > 280 ? "…" : "") : "",
    shareUrl,
    "— via STELLUN",
  ]
    .filter(Boolean)
    .join("\n");

  async function enterFullscreen() {
    const el = mediaRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFs(false);
      } else {
        await el.requestFullscreen();
        setFs(true);
      }
    } catch {
      setFs((v) => !v);
    }
  }

  useEffect(() => {
    const onFs = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  async function shareNative() {
    setShareNote(null);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          if (img && !isVideo) {
            const res = await fetch(img, { mode: "cors" });
            const blob = await res.blob();
            const file = new File([blob], "stellun-apod.jpg", {
              type: blob.type || "image/jpeg",
            });
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({ files: [file], title, text: caption });
              return;
            }
          }
        } catch {
          /* fall through */
        }
        await navigator.share({ title, text: caption, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(caption);
      setShareNote("Caption copied — paste it into WhatsApp or Messages.");
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setShareNote("Could not open share sheet. Try Copy link.");
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setShareNote("Caption copied.");
    } catch {
      setShareNote("Copy failed — long-press the text instead.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareNote("Link copied.");
    } catch {
      setShareNote("Copy failed.");
    }
  }

  return (
    <section id="apod">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">NASA · Daily</span>
          <h2>Astronomy Picture of the Day</h2>
        </div>
        <article className="glass glass-card apod-card">
          <div className={`apod-media${fs ? " apod-media-fs" : ""}`} ref={mediaRef}>
            {isVideo ? (
              <span className="apod-video-link">Today's media is a video</span>
            ) : (
              <img
                src={img}
                alt={title}
                className="apod-img"
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            )}
            {!isVideo ? (
              <button
                type="button"
                className="apod-fs-btn"
                onClick={enterFullscreen}
                aria-label={fs ? "Exit full screen" : "View full screen"}
              >
                {fs ? "Exit" : "Full screen"}
              </button>
            ) : null}
          </div>
          <div className="apod-body">
            <h3>{title}</h3>
            {apod.date ? (
              <p className="text-muted mono" style={{ fontSize: "0.85rem" }}>
                {apod.date}
              </p>
            ) : null}
            {explanation ? <p className="apod-expl">{explanation}</p> : null}
            {apod.copyright ? (
              <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: 8 }}>
                Credit: {apod.copyright}
              </p>
            ) : null}
            <div className="apod-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={shareNative}>
                Share
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={copyCaption}>
                Copy caption
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={copyLink}>
                Copy link
              </button>
            </div>
            {shareNote ? (
              <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: 8 }} role="status">
                {shareNote}
              </p>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}

// ------------------------------ Landing page ---------------------------------
function LandingPage() {
  const clock = useUtcClock();
  const { user, loading } = useAuth();
  const signedOut = !loading && !user;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#apod") return;
    const t = window.setTimeout(() => {
      document.getElementById("apod")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 400);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <main className="page-main">
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="glass-pill hero-kicker">
              <span className="live-dot" aria-hidden="true" /> Live data from NASA, NOAA,
              CelesTrak &amp; JPL
            </span>
            <h1>
              See beyond the <span>sky</span>
            </h1>
            <p className="hero-lede">
              STELLUN brings live satellite tracking, space weather, near-Earth object
              watch, and deep-space mission data into one dashboard built for students,
              researchers, and anyone who wants the real numbers, not a simulation.
            </p>
            <div className="hero-actions">
              {signedOut ? (
                <>
                  <Link to="/auth" className="btn btn-primary">
                    Sign in to open the dashboard
                  </Link>
                  <Link to="/auth" search={{ redirect: "/tracker" }} className="btn">
                    Preview the Orbit Tracker
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/tracker" className="btn btn-primary">
                    Open Orbit Tracker
                  </Link>
                  <Link to="/about" className="btn">
                    How the data works
                  </Link>
                </>
              )}
            </div>
            {signedOut ? (
              <p className="hero-note">
                An account keeps your tracked objects, reading list, and observing
                location in sync across devices. The landing page stays open to everyone.
              </p>
            ) : null}
            <div className="hero-clock glass-pill mono" aria-live="off">
              {clock}
            </div>
          </div>
          <HeroOrbit />
        </div>
      </section>

      <section className="tight">
        <div className="container">
          <OverviewStrip />
        </div>
      </section>

      <section className="tight">
        <div className="container">
          <div className="accent-panel story-panel">
            <span className="eyebrow">Our story</span>
            <h2>Built because the real numbers were always somewhere else</h2>
            <p>
              Space is the most documented frontier in human history, and almost none of
              that record reaches the people who are curious about it. The orbit of a
              satellite lives in one agency feed, the solar wind speed in another, the
              next launch window in a third, and the asteroid passing Earth tomorrow in a
              database most people will never open. STELLUN was built to close that gap.
            </p>
            <p>
              Every figure here comes from a named source or a documented formula: NASA,
              NOAA, CelesTrak, JPL Horizons, The Space Devs. Nothing is invented, nothing
              is smoothed over, and when a source cannot be reached the page says so and
              shows the last verified reading with its timestamp. That honesty is the
              whole product.
            </p>
            <p>
              The purpose is simple. A student should be able to watch the station pass
              overhead, a researcher should be able to pull a clean orbital element set,
              and anyone at all should be able to look up and know exactly what is above
              them tonight. One platform, real data, no guesswork.
            </p>
          </div>
        </div>
      </section>

      <ApodSection />

      <section>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Explore</span>
            <h2>Every tool, one platform</h2>
          </div>
          <div className="explore-grid">
            {EXPLORE.map((c) =>
              signedOut ? (
                <Link
                  key={c.to}
                  to="/auth"
                  search={{ redirect: c.to }}
                  className="glass glass-card interactive explore-card"
                >
                  <span className="explore-icon">{ICONS[c.icon]}</span>
                  <h3>{c.title}</h3>
                  <p>{c.blurb}</p>
                  <span className="explore-lock">Sign in to open</span>
                </Link>
              ) : (
                <Link key={c.to} to={c.to} className="glass glass-card interactive explore-card">
                  <span className="explore-icon">{ICONS[c.icon]}</span>
                  <h3>{c.title}</h3>
                  <p>{c.blurb}</p>
                </Link>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="tight">
        <div className="container">
          <WeatherWidget />
        </div>
      </section>

      <NewsSection />
      <CompetitionsSection />
      <FeedbackSection />
    </main>
  );
}
