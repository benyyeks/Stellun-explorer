import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AU_KM,
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
import { fmtNum, lightTimeFromAU, lightTimeFromKm } from "@/lib/format";
import { horizonsProbeQuery } from "@/lib/horizons-queries";
import { useNow } from "@/hooks/use-now";
import { FreshnessBadge } from "@/components/site/freshness-badge";
import { OBJECT_ESSAYS } from "@/lib/object-essays";

// ---------------------------------------------------------------------------
// Object resolution: the route param is "sun", a planet key, or a probe key.
// ---------------------------------------------------------------------------
type Resolved =
  | { kind: "sun" }
  | { kind: "planet"; key: PlanetKey }
  | { kind: "probe"; key: ProbeKey };

function resolveObject(id: string): Resolved | null {
  if (id === "sun") return { kind: "sun" };
  if ((PLANET_ORDER as string[]).includes(id))
    return { kind: "planet", key: id as PlanetKey };
  if (id in PROBE_ANCHORS) return { kind: "probe", key: id as ProbeKey };
  return null;
}

function displayName(r: Resolved): string {
  if (r.kind === "sun") return "The Sun";
  if (r.kind === "planet") return r.key.charAt(0).toUpperCase() + r.key.slice(1);
  return PROBE_ANCHORS[r.key].name;
}

function eyebrow(r: Resolved): string {
  if (r.kind === "sun") return "Star · Solar system center";
  if (r.kind === "planet") return "Planetary body · JPL Keplerian elements";
  return "Deep space probe · JPL Horizons telemetry";
}

export const Route = createFileRoute("/_authenticated/deepspace/$objectId")({
  head: ({ params }) => {
    const r = resolveObject(params.objectId);
    const name = r ? displayName(r) : "Object";
    return {
      meta: [
        { title: `${name} - Deep Space - STELLUN` },
        {
          name: "description",
          content: r
            ? `${name}: live position, orbital elements, and telemetry in the STELLUN deep space model.`
            : "Object profile in the STELLUN deep space model.",
        },
        { property: "og:type", content: "website" },
        { property: "og:title", content: `${name} - Deep Space - STELLUN` },
        {
          property: "og:description",
          content: r
            ? `${name}: live position, orbital elements, and telemetry in the STELLUN deep space model.`
            : "Object profile in the STELLUN deep space model.",
        },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: DeepSpaceObjectPage,
});

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------
function fmtRA(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function elongationNote(el: number): string {
  if (el < 20) return "Currently lost in the Sun's glare.";
  if (el > 150) return "Near opposition: visible for most of the night.";
  return "Well placed for part of the night.";
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-cell">
      <div className="stat-label">{label}</div>
      <div className="stat-value mono">{value}</div>
    </div>
  );
}

// Long-form explanation for the object, rendered below the live figures so the
// page reads as a reference article rather than a data readout.
function ObjectExplainer({ id }: { id: string }) {
  const essay = OBJECT_ESSAYS[id];
  if (!essay) return null;
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="glass glass-card object-essay">
          <h2 className="section-title" style={{ marginTop: 0 }}>
            In detail
          </h2>
          <p className="essay-abstract">{essay.abstract}</p>
          {essay.sections.map((sec) => (
            <div className="essay-section" key={sec.heading}>
              <h3>{sec.heading}</h3>
              {sec.paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ))}
          <div className="essay-sources">
            <h3>Sources</h3>
            <ul>
              {essay.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer noopener">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Planet profile
// ---------------------------------------------------------------------------
function PlanetProfile({ pk }: { pk: PlanetKey }) {
  const now = useNow(60_000);
  const date = now ?? new Date();
  const jd = julianDateUTC(date);
  const P = PLANET_ELEMENTS[pk];
  const helio = heliocentricEcliptic(pk, jd);
  const earth = heliocentricEcliptic("earth", jd);
  const dEarth =
    pk === "earth"
      ? null
      : Math.sqrt(
          (helio.x - earth.x) ** 2 + (helio.y - earth.y) ** 2 + (helio.z - earth.z) ** 2
        );
  const eq = planetEquatorial(pk, jd);

  const elementRows: Array<[string, string, string]> = [
    ["Semi-major axis", `${fmtNum(P.a[0], 8)} AU`, `${P.a[1] >= 0 ? "+" : ""}${P.a[1]} AU/cy`],
    ["Eccentricity", fmtNum(P.e[0], 8), `${P.e[1] >= 0 ? "+" : ""}${P.e[1]} /cy`],
    ["Inclination", `${fmtNum(P.I[0], 6)} deg`, `${P.I[1]} deg/cy`],
    ["Mean longitude", `${fmtNum(P.L[0], 5)} deg`, `${P.L[1]} deg/cy`],
    ["Longitude of perihelion", `${fmtNum(P.peri[0], 5)} deg`, `${P.peri[1]} deg/cy`],
    ["Longitude of ascending node", `${fmtNum(P.node[0], 5)} deg`, `${P.node[1]} deg/cy`],
  ];

  return (
    <>
      <section>
        <div className="container">
          <div className="stat-grid">
            <Cell label="Distance from the Sun" value={`${fmtNum(helio.r, 4)} AU`} />
            <Cell
              label="Distance from Earth"
              value={dEarth !== null ? `${fmtNum(dEarth, 4)} AU` : "-"}
            />
            <Cell
              label="Orbital period"
              value={
                helio.periodDays > 800
                  ? `${fmtNum(helio.periodDays / 365.25, 2)} years`
                  : `${fmtNum(helio.periodDays, 2)} days`
              }
            />
            <Cell label="Mean radius" value={`${fmtNum(P.radiusKm, 0)} km`} />
          </div>
          <p className="detail-note">
            Live geometry computed for {date.toUTCString().slice(0, 16)} UTC from JPL
            Keplerian elements.
          </p>
        </div>
      </section>

      {pk !== "earth" && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="glass glass-card">
              <h2 className="section-title" style={{ marginTop: 0 }}>
                Sky position from Earth
              </h2>
              <div className="detail-rows">
                <div className="detail-row">
                  <span>Right ascension</span>
                  <b className="mono">{fmtRA(eq.ra / 15)}</b>
                </div>
                <div className="detail-row">
                  <span>Declination</span>
                  <b className="mono">
                    {eq.dec >= 0 ? "+" : ""}
                    {fmtNum(eq.dec, 1)} deg
                  </b>
                </div>
                <div className="detail-row">
                  <span>Elongation from the Sun</span>
                  <b className="mono">{fmtNum(eq.elongation, 1)} deg</b>
                </div>
                {dEarth !== null && (
                  <div className="detail-row">
                    <span>Light travel time</span>
                    <b className="mono">{lightTimeFromAU(dEarth)}</b>
                  </div>
                )}
              </div>
              <p className="detail-note">{elongationNote(eq.elongation)}</p>
            </div>
          </div>
        </section>
      )}

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="glass glass-card">
            <h2 className="section-title" style={{ marginTop: 0 }}>
              Orbital elements
            </h2>
            <p className="detail-note" style={{ marginTop: 0 }}>
              Keplerian elements for the J2000 epoch with century rates, as published by
              NASA JPL for the approximate positions of the major planets.
            </p>
            <div className="detail-rows">
              {elementRows.map(([label, value, rate]) => (
                <div className="detail-row" key={label}>
                  <span>{label}</span>
                  <b className="mono">
                    {value} <span style={{ color: "var(--ink-faint)" }}>({rate})</span>
                  </b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Probe profile
// ---------------------------------------------------------------------------
const PROBE_STATUS: Record<ProbeKey, string> = {
  voyager1: "Interstellar space, heading toward the constellation Ophiuchus",
  voyager2: "Interstellar space, heading toward the constellation Pavo",
  newhorizons: "Kuiper Belt cruise, outbound toward interstellar space",
  parkersolarprobe: "Elliptical solar orbit with repeated close approaches",
  jwst: "Halo orbit around the Sun-Earth L2 point",
  roman: "Cruise and commissioning, bound for the Sun-Earth L2 point",
  juno: "Polar orbit around Jupiter",
};

function ProbeProfile({ k }: { k: ProbeKey }) {
  const q = useQuery(horizonsProbeQuery(k));
  const anchor = PROBE_ANCHORS[k];
  const live = q.data?.telemetry ?? null;
  const fallbackAU = probeFallbackDistanceAU(k, new Date());
  const distKm = live ? live.distanceKm : fallbackAU ? fallbackAU * AU_KM : null;

  return (
    <>
      <section>
        <div className="container">
          {q.data && live ? (
            <p className="detail-note" style={{ marginTop: 0 }}>
              Live telemetry from JPL Horizons <FreshnessBadge res={q.data} />
              {q.data.telemetry?.epoch ? ` · epoch ${q.data.telemetry.epoch}` : ""}
            </p>
          ) : (
            <p className="detail-note" style={{ marginTop: 0 }}>
              Live telemetry is temporarily unavailable. Figures below are physics-based
              estimates and are labeled as such.
            </p>
          )}
          <div className="stat-grid">
            <Cell
              label={live ? "Distance from Earth" : "Distance from Earth (estimate)"}
              value={distKm ? `${fmtNum(distKm / 1e6, 2)} million km` : "--"}
            />
            <Cell
              label="Range"
              value={distKm ? `${fmtNum(distKm / AU_KM, 4)} AU` : "--"}
            />
            <Cell
              label={live ? "Speed relative to Earth" : "Cruise speed"}
              value={
                live
                  ? `${fmtNum(live.speedKmS, 2)} km/s`
                  : anchor.kind === "recession"
                    ? `~${anchor.speedKmS} km/s (est.)`
                    : "--"
              }
            />
            <Cell
              label="One-way light time"
              value={distKm ? lightTimeFromKm(distKm) : "--"}
            />
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="glass glass-card">
            <h2 className="section-title" style={{ marginTop: 0 }}>
              Mission profile
            </h2>
            <div className="detail-rows">
              <div className="detail-row">
                <span>Launched</span>
                <b className="mono">
                  {new Date(anchor.launched).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </b>
              </div>
              <div className="detail-row">
                <span>Current regime</span>
                <b className="mono">{PROBE_STATUS[k]}</b>
              </div>
            </div>
            <p className="detail-note">{anchor.note}</p>
          </div>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sun profile
// ---------------------------------------------------------------------------
function SunProfile() {
  const now = useNow(60_000);
  const date = now ?? new Date();
  const jd = julianDateUTC(date);
  const earth = heliocentricEcliptic("earth", jd);
  return (
    <section>
      <div className="container">
        <div className="stat-grid">
          <Cell label="Distance from Earth today" value={`${fmtNum(earth.r, 5)} AU`} />
          <Cell label="Apparent size from Earth" value="0.53 deg" />
          <Cell label="Light travel time" value={lightTimeFromAU(earth.r)} />
          <Cell label="Spectral type" value="G2V" />
        </div>
        <p className="detail-note">
          Earth-Sun distance computed for {date.toUTCString().slice(0, 16)} UTC from JPL
          Keplerian elements. In the 3D model, planetary distances are to scale relative
          to the Sun; body sizes are enlarged for visibility.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function DeepSpaceObjectPage() {
  const { objectId } = Route.useParams();
  const resolved = resolveObject(objectId);

  if (!resolved) {
    return (
      <main className="page-main">
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">Deep space catalog</span>
            <h1>Object not found</h1>
            <p className="tagline">
              This object is not part of the deep space catalog. Browse the full model to
              explore the planets and probes STELLUN tracks.
            </p>
            <div className="hero-cta">
              <Link to="/deepspace" className="btn btn-primary">
                Open the deep space model
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const name = displayName(resolved);

  return (
    <main className="page-main">
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">{eyebrow(resolved)}</span>
          <h1>{name}</h1>
          <p className="tagline">
            {resolved.kind === "planet"
              ? `Live geometry, sky position, and orbital elements for ${name}, computed from NASA JPL Keplerian elements.`
              : resolved.kind === "probe"
                ? `Live telemetry and mission profile for ${name}, with distances from JPL Horizons.`
                : "Reference data for the Sun, the anchor of the STELLUN deep space model."}
          </p>
          <div className="hero-cta">
            <Link to="/deepspace" className="btn btn-primary">
              Open in the 3D model
            </Link>
            {resolved.kind === "planet" && resolved.key !== "earth" ? (
              <Link to="/sky" className="btn btn-secondary">
                Sky tonight
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {resolved.kind === "planet" && <PlanetProfile pk={resolved.key} />}
      {resolved.kind === "probe" && <ProbeProfile k={resolved.key} />}
      {resolved.kind === "sun" && <SunProfile />}

      <ObjectExplainer id={objectId} />
    </main>
  );
}
