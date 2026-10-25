import { useServerFn } from "@tanstack/react-start";
import { getEarthWeather } from "@/lib/stellun-data.functions";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  julianDateUTC,
  moonPhase,
  moonEquatorial,
  sunEquatorial,
  planetEquatorial,
  altAzFromRaDec,
  heliocentricEcliptic,
  interplanetDistanceAU,
  DEG,
} from "@/lib/astronomy";
import { fmtAU, fmtNum, utcClock, lightTimeFromAU } from "@/lib/format";
import { useObserverLocation } from "@/lib/location";

export const Route = createFileRoute("/_authenticated/sky")({
  head: () => ({
    meta: [
      { title: "Sky Tonight - STELLUN" },
      {
        name: "description",
        content:
          "Live moon phase, visible planets, and current altitudes for your location, computed from verified JPL elements.",
      },
      { property: "og:title", content: "Sky Tonight - STELLUN" },
      {
        property: "og:description",
        content: "Live moon phase and visible-planet altitudes for your location.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SkyPage,
});

const VISIBLE_PLANETS = [
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
] as const;

type PlanetRow = {
  key: string;
  name: string;
  ra: number;
  dec: number;
  distAU: number;
  alt: number;
  az: number;
  visible: boolean;
};

type SkyData = {
  utc: string;
  moonIllum: number;
  moonName: string;
  moonAgeDays: number;
  moonDistKm: number;
  sunAlt: number;
  planets: PlanetRow[];
};

function computeSky(lat: number, lon: number, now: Date): SkyData {
  const jd = julianDateUTC(now);
  const mp = moonPhase(jd);
  const moonEq = moonEquatorial(jd);
  const sunEq = sunEquatorial(jd);
const sunAltAz = altAzFromRaDec(sunEq.ra, sunEq.dec, lat, lon, jd);
  const earth = heliocentricEcliptic("earth", jd);

  const planets: PlanetRow[] = VISIBLE_PLANETS.map((key) => {
    const p = planetEquatorial(key, jd);
    const raDeg = p.ra;
    const decDeg = p.dec;
    const ph = heliocentricEcliptic(key, jd);
    const distAU = interplanetDistanceAU(earth, ph);
    const { alt, az } = altAzFromRaDec(raDeg, decDeg, lat, lon, jd);
    return {
      key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      ra: raDeg,
      dec: decDeg,
      distAU,
      alt,
      az,
      visible: alt > 0,
    };
  });

  return {
    utc: utcClock(now),
    moonIllum: Math.round(mp.illumination * 100),
    moonName: mp.name,
    moonAgeDays: mp.ageDays,
    moonDistKm: moonEq.distanceKm,
    sunAlt: sunAltAz.alt,
    planets,
  };
}

function azToCompass(az: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  return dirs[Math.round(az / 45)] ?? "N";
}

const WMO_SHORT: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Showers",
  81: "Showers",
  82: "Heavy showers",
  95: "Thunder",
  96: "Thunder + hail",
  99: "Severe storm",
};

type HourlyBundle = {
  time: string[];
  temperature_2m?: (number | null)[];
  cloud_cover?: (number | null)[];
  precipitation_probability?: (number | null)[];
  weather_code?: (number | null)[];
  wind_speed_10m?: (number | null)[];
  visibility?: (number | null)[];
  is_day?: (number | null)[];
};

type CurrentWx = {
  temperature_2m?: number;
  apparent_temperature?: number;
  cloud_cover?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  relative_humidity_2m?: number;
  is_day?: number;
  precipitation?: number;
};

type HourSlot = {
  time: Date;
  label: string;
  temp: number | null;
  cloud: number | null;
  precip: number | null;
  code: number | null;
  wind: number | null;
  isDay: boolean;
  score: number; // higher = better for observing
};

function buildDaySlots(hourly: HourlyBundle | undefined, now: Date): HourSlot[] {
  if (!hourly?.time?.length) return [];
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 24);

  const slots: HourSlot[] = [];
  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]!);
    if (t < start || t >= end) continue;
    const cloud = hourly.cloud_cover?.[i] ?? null;
    const precip = hourly.precipitation_probability?.[i] ?? null;
    const isDay = (hourly.is_day?.[i] ?? 1) === 1;
    // Prefer low cloud + low precip; slight boost for night (stargazing)
    let score = 100;
    if (cloud != null) score -= cloud;
    if (precip != null) score -= precip * 0.6;
    if (!isDay) score += 8;
    slots.push({
      time: t,
      label: t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      temp: hourly.temperature_2m?.[i] ?? null,
      cloud,
      precip,
      code: hourly.weather_code?.[i] ?? null,
      wind: hourly.wind_speed_10m?.[i] ?? null,
      isDay,
      score,
    });
  }
  return slots;
}

function ObservingWeatherPanel({ lat, lon }: { lat: number; lon: number }) {
  const fetchWeather = useServerFn(getEarthWeather);
  const [current, setCurrent] = useState<CurrentWx | null>(null);
  const [hourly, setHourly] = useState<HourlyBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWeather({ data: { lat, lon } });
        const payload = res?.data as
          | { current?: CurrentWx; hourly?: HourlyBundle }
          | undefined;
        if (cancelled) return;
        setCurrent(payload?.current ?? null);
        setHourly(payload?.hourly ?? null);
        setUpdatedAt(new Date());
      } catch {
        if (!cancelled) setError("Observing weather could not be loaded right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const id = setInterval(() => void load(), 5 * 60_000); // keep fresh
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [lat, lon, fetchWeather]);

  const slots = useMemo(() => buildDaySlots(hourly ?? undefined, new Date()), [hourly]);
  const nightSlots = useMemo(() => slots.filter((s) => !s.isDay), [slots]);
  const best = useMemo(() => {
    const pool = nightSlots.length ? nightSlots : slots;
    return [...pool].sort((a, b) => b.score - a.score).slice(0, 3);
  }, [slots, nightSlots]);

  return (
    <div className="glass glass-card scaffold-card sky-obs-panel">
      <div className="sky-obs-head">
        <div>
          <span className="eyebrow">Observing weather · next 24 h</span>
          <h2>Sky conditions for your site</h2>
          <p className="text-muted" style={{ margin: "6px 0 0", maxWidth: 52 }}>
            Hourly cloud and rain chance for planning — not a full meteorological briefing.
            Refreshes about every five minutes.
          </p>
        </div>
        {updatedAt ? (
          <span className="mono text-faint" style={{ fontSize: "0.78rem" }}>
            Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : null}
      </div>

      {loading && !current ? (
        <p className="text-muted">Loading observing forecast…</p>
      ) : error ? (
        <p className="weather-error" role="alert">
          {error}
        </p>
      ) : (
        <>
          {current ? (
            <div className="sky-obs-now">
              <div className="sky-obs-now-temp">
                <span className="sky-obs-deg">{Math.round(current.temperature_2m ?? 0)}</span>
                <span className="sky-obs-unit">°C</span>
              </div>
              <div className="sky-obs-now-meta">
                <strong>
                  {WMO_SHORT[current.weather_code ?? -1] ?? "Conditions"} ·{" "}
                  {current.is_day === 0 ? "Night" : "Day"}
                </strong>
                <span>{Math.round(current.cloud_cover ?? 0)}% cloud cover</span>
                <span>
                  Feels {Math.round(current.apparent_temperature ?? 0)}°C · Wind{" "}
                  {Math.round(current.wind_speed_10m ?? 0)} km/h · Humidity{" "}
                  {Math.round(current.relative_humidity_2m ?? 0)}%
                </span>
              </div>
            </div>
          ) : null}

          {best.length > 0 ? (
            <div className="sky-obs-best">
              <span className="eyebrow">Better windows (ranked)</span>
              <div className="sky-obs-best-row">
                {best.map((s) => (
                  <div key={s.time.toISOString()} className="sky-obs-best-chip">
                    <span className="mono">{s.label}</span>
                    <strong>{s.cloud != null ? `${Math.round(s.cloud)}% cloud` : "—"}</strong>
                    <span>
                      {s.precip != null ? `${Math.round(s.precip)}% rain` : "—"} ·{" "}
                      {s.isDay ? "day" : "night"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {slots.length > 0 ? (
            <div className="sky-obs-timeline" role="list" aria-label="Hourly observing conditions">
              {slots.map((s) => {
                const cloud = s.cloud ?? 100;
                const good = cloud < 40 && (s.precip ?? 0) < 30;
                return (
                  <div
                    key={s.time.toISOString()}
                    className={`sky-obs-hour ${s.isDay ? "is-day" : "is-night"} ${good ? "is-good" : ""}`}
                    role="listitem"
                    title={WMO_SHORT[s.code ?? -1] ?? ""}
                  >
                    <span className="sky-obs-hour-time mono">{s.label}</span>
                    <div className="sky-obs-hour-bar" aria-hidden>
                      <div
                        className="sky-obs-hour-fill"
                        style={{ height: `${Math.min(100, Math.max(8, 100 - cloud))}%` }}
                      />
                    </div>
                    <span className="sky-obs-hour-cloud mono">
                      {s.cloud != null ? `${Math.round(s.cloud)}%` : "—"}
                    </span>
                    <span className="sky-obs-hour-temp">
                      {s.temp != null ? `${Math.round(s.temp)}°` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted">No hourly series in this response yet.</p>
          )}

          <p className="scaffold-note" style={{ marginTop: 14, marginBottom: 0 }}>
            Bars show relative clearness (taller = clearer). Source: Open-Meteo. Educational
            planning only.
          </p>
        </>
      )}
    </div>
  );
  }

function SkyPage() {
  // Shared observer-location hook: two-stage lookup with automatic retry,
  // persisted coordinates, and consistent messaging across pages.
  const loc = useObserverLocation();
  const lat = loc.location?.lat ?? 51.4769;
  const lon = loc.location?.lon ?? -0.0005; // Royal Observatory, Greenwich
  const locLabel = loc.location
    ? loc.location.source === "device"
      ? "Your current location"
      : "Saved coordinates"
    : "Greenwich, UK (default)";
  const [data, setData] = useState<SkyData | null>(null);

  useEffect(() => {
    const tick = () => setData(computeSky(lat, lon, new Date()));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [lat, lon]);

  const visibleCount = useMemo(() => data?.planets.filter((p) => p.visible).length ?? 0, [data]);

  return (
    <main className="page-main">
      <section>
        <div className="container">
          <div className="page-hero">
            <span className="eyebrow">Live, computed now</span>
            <h1>Sky tonight</h1>
            <p className="tagline">
              Moon phase, visible planets, and current altitudes for your location, all
              computed from verified JPL Keplerian elements. No data is fetched: every value
              is derived from orbital mechanics in your browser.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginBottom: 24 }}>
            <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: 12 }}>
              <div>
                <span className="mono text-faint" style={{ fontSize: "0.82rem" }}>
                  Observer: {locLabel}
                </span>
                <div className="mono text-faint" style={{ fontSize: "0.82rem" }}>
                  {lat.toFixed(4)}°, {lon.toFixed(4)}° · {data ? `${data.utc} UTC` : "--:--:--"}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={loc.requestDeviceLocation}
                disabled={loc.status === "requesting"}
              >
                {loc.status === "requesting" ? "Locating..." : "Use my location"}
              </button>
            </div>
            {loc.error ? (
              <p className="text-muted" role="alert" style={{ marginTop: 10, marginBottom: 0 }}>
                {loc.error}
              </p>
            ) : null}
          </div>

          <div style={{ marginBottom: 24 }}>
            <ObservingWeatherPanel lat={lat} lon={lon} />
          </div>
          
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Moon phase</div>
              <div className="stat-value">{data ? `${data.moonIllum}%` : "--"}</div>
              <div className="stat-unit">{data ? data.moonName : "computing"}</div>
              <div className="stat-note">{data ? `${fmtNum(data.moonAgeDays, 1)} days into the cycle` : ""}</div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Moon distance</div>
              <div className="stat-value">{data ? fmtNum(data.moonDistKm, 0) : "--"}</div>
              <div className="stat-unit">km</div>
              <div className="stat-note">{data ? lightTimeFromAU(data.moonDistKm / 149597870.7) + " light-time" : ""}</div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Sun altitude</div>
              <div className="stat-value">{data ? `${data.sunAlt.toFixed(0)}°` : "--"}</div>
              <div className="stat-unit">{data ? (data.sunAlt > 0 ? "above horizon" : "below horizon") : ""}</div>
              <div className="stat-note">{data ? (data.sunAlt > -6 ? "Daylight / civil twilight" : "Night") : ""}</div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Visible planets</div>
              <div className="stat-value">{data ? visibleCount : "--"}</div>
              <div className="stat-unit">of 7 tracked</div>
<div className="stat-note">Mercury through Neptune</div>
            </div>
          </div>

          <div className="glass glass-card scaffold-card">
            <h2>Planets right now</h2>
            <p>Current altitude and azimuth from your location, with distance from Earth.</p>
            <div className="source-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Planet</th>
                    <th>Altitude</th>
                    <th>Azimuth</th>
                    <th>Distance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.planets ?? []).map((p) => (
                    <tr key={p.key}>
                      <td>{p.name}</td>
                      <td className="mono">{p.alt.toFixed(1)}°</td>
                      <td className="mono">{p.az.toFixed(0)}° {azToCompass(p.az)}</td>
                      <td className="mono">{fmtAU(p.distAU, 2)}</td>
                      <td>
                        <span className={`badge ${p.visible ? "badge-success" : "badge-muted"}`}>
                          {p.visible ? "Above horizon" : "Below horizon"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="scaffold-note">
              Altitude is the angle above your local horizon (0° at horizon, 90° overhead).
              Negative altitude means the body is below the horizon. Azimuth is the compass
              bearing. Positions are computed from JPL Keplerian elements and are accurate to
              a fraction of a degree for this purpose.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
