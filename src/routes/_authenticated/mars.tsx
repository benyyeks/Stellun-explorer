import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  AU_KM,
  heliocentricEcliptic,
  julianDateUTC,
  planetEquatorial,
  type Heliocentric,
} from "@/lib/astronomy";
import { fmtAU, fmtKm, lightTimeFromAU } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import { MarsImageGallery } from "@/components/mars/mars-image-gallery";

export const Route = createFileRoute("/_authenticated/mars")({
  head: () => ({
    meta: [
      { title: "Mars - STELLUN" },
      {
        name: "description",
        content:
          "Earth–Mars distance and light time from JPL elements, plus Perseverance and Curiosity surface imagery. Educational use only.",
      },
      { property: "og:title", content: "Mars - STELLUN" },
      {
        property: "og:description",
        content: "Live Earth–Mars geometry and NASA rover imagery on STELLUN.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: MarsPage,
});

function marsGeometry(now: Date) {
  const jd = julianDateUTC(now);
  const earth = heliocentricEcliptic("earth", jd);
  const mars = heliocentricEcliptic("mars", jd);
  const eq = planetEquatorial("mars", jd);
  return {
    earth,
    mars,
    au: eq.distanceAU,
    km: eq.distanceAU * AU_KM,
    raHours: eq.ra / 15,
    dec: eq.dec,
    elongation: eq.elongation,
  };
}

function fmtRA(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function elongationNote(el: number): string {
  if (el < 20) return "Near the Sun in the sky — hard to observe";
  if (el > 150) return "Near opposition — up most of the night";
  return "Visible for part of the night from a dark site";
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-cell">
      <div className="stat-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  );
}

/** Top-down ecliptic sketch (not a surface map). */
function OrbitDiagram({
  earth,
  mars,
  au,
}: {
  earth: Heliocentric;
  mars: Heliocentric;
  au: number;
}) {
  const C = 120;
  const SCALE = 52;
  const ex = C + earth.x * SCALE;
  const ey = C - earth.y * SCALE;
  const mx = C + mars.x * SCALE;
  const my = C - mars.y * SCALE;

  return (
    <svg
      viewBox="0 0 240 240"
      className="mars-orbit-svg"
      role="img"
      aria-label={`Earth and Mars about ${fmtAU(au)} apart`}
    >
      <circle cx={C} cy={C} r={earth.a * SCALE} className="mars-orbit-path" />
      <circle cx={C} cy={C} r={mars.a * SCALE} className="mars-orbit-path" />
      <line x1={ex} y1={ey} x2={mx} y2={my} className="mars-orbit-link" />
      <circle cx={C} cy={C} r={6} className="mars-orbit-sun" />
      <text x={C} y={C + 18} textAnchor="middle" className="mars-orbit-label">
        Sun
      </text>
      <circle cx={ex} cy={ey} r={5} className="mars-orbit-earth" />
      <text x={ex + 8} y={ey + 4} className="mars-orbit-label">
        Earth
      </text>
      <circle cx={mx} cy={my} r={5} className="mars-orbit-mars" />
      <text x={mx + 8} y={my + 4} className="mars-orbit-label">
        Mars
      </text>
      <text x={C} y={228} textAnchor="middle" className="mars-orbit-value">
        {fmtAU(au)}
      </text>
    </svg>
  );
}

function MarsPage() {
  const now = useNow(60_000);
  const geo = useMemo(() => (now ? marsGeometry(now) : null), [now]);

  return (
    <main className="page-main mars-page">
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">JPL elements · NASA imagery</span>
          <h1>Mars</h1>
          <p className="tagline">
            Live Earth–Mars distance from orbital mechanics, and the latest public
            frames from Perseverance, Curiosity, and other surface missions.
          </p>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="stat-grid mars-stat-grid">
            <div className="glass glass-card stat-card">
              <div className="stat-label">Earth–Mars distance</div>
              <div className="stat-value">{geo ? fmtAU(geo.au) : "—"}</div>
              <div className="stat-unit">{geo ? fmtKm(geo.km) : "computing"}</div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">One-way light time</div>
              <div className="stat-value">{geo ? lightTimeFromAU(geo.au) : "—"}</div>
              <div className="stat-unit">radio, Earth → Mars</div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Mars from the Sun</div>
              <div className="stat-value">{geo ? fmtAU(geo.mars.r) : "—"}</div>
              <div className="stat-unit">heliocentric distance</div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Elongation</div>
              <div className="stat-value">
                {geo ? `${geo.elongation.toFixed(0)}°` : "—"}
              </div>
              <div className="stat-unit">
                {geo ? elongationNote(geo.elongation) : "from the Sun"}
              </div>
            </div>
          </div>

          <div className="mars-split">
            <div className="glass glass-card scaffold-card mars-panel">
              <span className="eyebrow">Orbit sketch</span>
              <h2>Where Mars is right now</h2>
              <p className="text-muted mars-panel-lead">
                Top-down view of the ecliptic plane. Positions update about once a
                minute from approximate JPL Keplerian elements.
              </p>
              <div className="mars-orbit-wrap">
                {geo ? (
                  <OrbitDiagram earth={geo.earth} mars={geo.mars} au={geo.au} />
                ) : (
                  <p className="text-muted">Computing geometry…</p>
                )}
              </div>
            </div>

            <div className="glass glass-card scaffold-card mars-panel">
              <span className="eyebrow">From Earth</span>
              <h2>Finding Mars in the sky</h2>
              <p className="text-muted mars-panel-lead">
                Approximate direction for amateur observing. Confirm with a planetarium
                app if you need arcminute precision.
              </p>
              {geo ? (
                <div className="detail-grid mars-detail-grid">
                  <DetailCell label="Right ascension" value={fmtRA(geo.raHours)} />
                  <DetailCell
                    label="Declination"
                    value={`\( {geo.dec >= 0 ? "+" : ""} \){geo.dec.toFixed(1)}°`}
                  />
                  <DetailCell label="Distance" value={fmtAU(geo.au)} />
                  <DetailCell
                    label="Elongation"
                    value={`${geo.elongation.toFixed(1)}°`}
                  />
                </div>
              ) : (
                <p className="text-muted">Waiting for geometry…</p>
              )}
            </div>
          </div>

          <div className="glass glass-card scaffold-card mars-note">
            <span className="eyebrow">About this page</span>
            <p>
              Distances and sky position are computed in your browser from published
              elements — not a live ranging feed. Surface photos come from NASA’s public
              rover image APIs and may lag by sols. There is no live Mars “weather station”
              panel here; atmospheric data from landers is sparse and mission-specific.
            </p>
          </div>
        </div>
      </section>

      <MarsImageGallery />
    </main>
  );
}
