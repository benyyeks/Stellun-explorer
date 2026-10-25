// Local observing conditions — full-day outlook from Open-Meteo.
// Distinct from /weather (space weather / NOAA).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getEarthWeather } from "@/lib/stellun-data.functions";
import { useObserverLocation } from "@/lib/location";

export const Route = createFileRoute("/_authenticated/conditions")({
  head: () => ({
    meta: [
      { title: "Observing conditions - STELLUN" },
      {
        name: "description",
        content:
          "Local temperature, cloud cover, and precipitation through the day for stargazing plans. Educational use — not an official forecast service.",
      },
    ],
  }),
  component: ConditionsPage,
});

const WMO: Record<number, string> = {
  0: "Clear sky",
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
  80: "Light showers",
  81: "Showers",
  82: "Heavy showers",
  95: "Thunderstorm",
  96: "Thunderstorm + hail",
  99: "Severe thunderstorm",
};

type Current = {
  temperature_2m?: number;
  apparent_temperature?: number;
  relative_humidity_2m?: number;
  cloud_cover?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  precipitation?: number;
  is_day?: number;
};

type Hourly = {
  time: string[];
  temperature_2m?: (number | null)[];
  cloud_cover?: (number | null)[];
  precipitation_probability?: (number | null)[];
  weather_code?: (number | null)[];
  wind_speed_10m?: (number | null)[];
  is_day?: (number | null)[];
};

type Daily = {
  time?: string[];
  sunrise?: string[];
  sunset?: string[];
  temperature_2m_max?: (number | null)[];
  temperature_2m_min?: (number | null)[];
  precipitation_sum?: (number | null)[];
  precipitation_probability_max?: (number | null)[];
};

type HourSlot = {
  time: Date;
  label: string;
  temp: number | null;
  cloud: number | null;
  precip: number | null;
  code: number | null;
  isDay: boolean;
  score: number;
};

function buildSlots(hourly: Hourly | undefined, now: Date): HourSlot[] {
  if (!hourly?.time?.length) return [];
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 24);
  const out: HourSlot[] = [];
  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]!);
    if (t < start || t >= end) continue;
    const cloud = hourly.cloud_cover?.[i] ?? null;
    const precip = hourly.precipitation_probability?.[i] ?? null;
    const isDay = (hourly.is_day?.[i] ?? 1) === 1;
    let score = 100;
    if (cloud != null) score -= cloud;
    if (precip != null) score -= precip * 0.6;
    if (!isDay) score += 8;
    out.push({
      time: t,
      label: t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      temp: hourly.temperature_2m?.[i] ?? null,
      cloud,
      precip,
      code: hourly.weather_code?.[i] ?? null,
      isDay,
      score,
    });
  }
  return out;
}

function ConditionsPage() {
  const loc = useObserverLocation();
  const lat = loc.location?.lat ?? 51.4769;
  const lon = loc.location?.lon ?? -0.0005;
  const fetchWeather = useServerFn(getEarthWeather);

  const [current, setCurrent] = useState<Current | null>(null);
  const [hourly, setHourly] = useState<Hourly | null>(null);
  const [daily, setDaily] = useState<Daily | null>(null);
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
          | { current?: Current; hourly?: Hourly; daily?: Daily }
          | undefined;
        if (cancelled) return;
        setCurrent(payload?.current ?? null);
        setHourly(payload?.hourly ?? null);
        setDaily(payload?.daily ?? null);
        setUpdatedAt(new Date());
      } catch {
        if (!cancelled) setError("Could not load observing weather right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const id = setInterval(() => void load(), 5 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [lat, lon, fetchWeather]);

  const slots = useMemo(() => buildSlots(hourly ?? undefined, new Date()), [hourly]);
  const best = useMemo(() => {
    const night = slots.filter((s) => !s.isDay);
    const pool = night.length ? night : slots;
    return [...pool].sort((a, b) => b.score - a.score).slice(0, 3);
  }, [slots]);

  const sunrise = daily?.sunrise?.[0];
  const sunset = daily?.sunset?.[0];

  return (
    <main className="page-main">
      <section>
        <div className="container">
          <div className="page-hero">
            <span className="eyebrow">Open-Meteo · local</span>
            <h1>Observing conditions</h1>
            <p className="tagline">
              Temperature, cloud cover, and rain chance for the next 24 hours at your
              site. For education and observing plans—not an official forecast service.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginBottom: 24 }}>
            <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: 12 }}>
              <div>
                <span className="mono text-faint" style={{ fontSize: "0.82rem" }}>
                  {lat.toFixed(4)}°, {lon.toFixed(4)}°
                  {updatedAt
                    ? ` · updated ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : ""}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={loc.requestDeviceLocation}
                disabled={loc.status === "requesting"}
              >
                {loc.status === "requesting" ? "Locating…" : "Use my location"}
              </button>
            </div>
            {loc.error ? (
              <p className="text-muted" role="alert" style={{ marginTop: 10, marginBottom: 0 }}>
                {loc.error}
              </p>
            ) : null}
          </div>

          {loading && !current ? (
            <p className="text-muted">Loading forecast…</p>
          ) : error ? (
            <p className="weather-error" role="alert">
              {error}
            </p>
          ) : (
            <div className="glass glass-card scaffold-card sky-obs-panel">
              {current ? (
                <div className="sky-obs-now">
                  <div className="sky-obs-now-temp">
                    <span className="sky-obs-deg">{Math.round(current.temperature_2m ?? 0)}</span>
                    <span className="sky-obs-unit">°C</span>
                  </div>
                  <div className="sky-obs-now-meta">
                    <strong>
                      {WMO[current.weather_code ?? -1] ?? "Conditions"} ·{" "}
                      {current.is_day === 0 ? "Night" : "Day"}
                    </strong>
                    <span>{Math.round(current.cloud_cover ?? 0)}% cloud cover</span>
                    <span>
                      Feels {Math.round(current.apparent_temperature ?? 0)}°C · Wind{" "}
                      {Math.round(current.wind_speed_10m ?? 0)} km/h · Humidity{" "}
                      {Math.round(current.relative_humidity_2m ?? 0)}%
                    </span>
                    {sunrise && sunset ? (
                      <span className="mono text-faint" style={{ fontSize: "0.8rem" }}>
                        Sunrise {new Date(sunrise).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        Sunset {new Date(sunset).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : null}
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
                        <strong>
                          {s.cloud != null ? `${Math.round(s.cloud)}% cloud` : "—"}
                        </strong>
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
                <div className="sky-obs-timeline" role="list" aria-label="Hourly conditions">
                  {slots.map((s) => {
                    const cloud = s.cloud ?? 100;
                    const good = cloud < 40 && (s.precip ?? 0) < 30;
                    return (
                      <div
                        key={s.time.toISOString()}
                        className={`sky-obs-hour ${s.isDay ? "is-day" : "is-night"} ${good ? "is-good" : ""}`}
                        role="listitem"
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
                <p className="text-muted">No hourly series available yet.</p>
              )}

              <p className="scaffold-note" style={{ marginTop: 14, marginBottom: 0 }}>
                Bars show relative clearness (taller = clearer). Source: Open-Meteo.{" "}
                <Link to="/sky">Sky Tonight</Link> · educational planning only.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
      }
