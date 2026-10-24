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
