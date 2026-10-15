import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getKpIndex, getSolarWind, getXrayFlux, getDONKI } from "@/lib/stellun-data.functions";
import { fmtNum, safeText } from "@/lib/format";
import { FreshnessBadge } from "@/components/site/freshness-badge";
import { FeedError, EmptyState } from "@/components/site/data-state";
import { ExportButtons } from "@/components/site/export-buttons";
import { PageHeroSkeleton, StatGridSkeleton, PanelSkeleton } from "@/components/site/page-skeleton";

export const Route = createFileRoute("/_authenticated/weather")({
  head: () => ({
    meta: [
      { title: "Space Weather - STELLUN" },
      {
        name: "description",
        content:
          "Live solar wind speed and density, the planetary Kp index, GOES X-ray flux class, and the last 7 days of space weather alerts from NOAA SWPC and NASA DONKI.",
      },
      { property: "og:title", content: "Space Weather - STELLUN" },
      {
        property: "og:description",
        content: "Live solar wind, Kp index, X-ray flux, and space weather alerts from NOAA and NASA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    // Best effort: if an upstream source is down during SSR, the client retries.
    await Promise.allSettled([
      context.queryClient.ensureQueryData(kpQueryOptions),
      context.queryClient.ensureQueryData(windQueryOptions),
      context.queryClient.ensureQueryData(xrayQueryOptions),
      context.queryClient.ensureQueryData(donkiQueryOptions),
    ]);
  },
  staleTime: 60_000,
  pendingMs: 0,
  pendingComponent: WeatherSkeleton,
  errorComponent: WeatherError,
  component: WeatherPage,
});

function WeatherSkeleton() {
  return (
    <main className="page-main">
      <section>
        <div className="container" role="status" aria-busy="true" aria-label="Loading space weather">
          <span className="sr-only">Loading space weather</span>
          <PageHeroSkeleton />
          <StatGridSkeleton count={5} />
          <PanelSkeleton lines={4} />
        </div>
      </section>
    </main>
  );
}

const kpQueryOptions = queryOptions({
  queryKey: ["stellun", "kp-index"],
  queryFn: () => getKpIndex(),
  retry: false,
  staleTime: 60_000,
});
const windQueryOptions = queryOptions({
  queryKey: ["stellun", "solar-wind"],
  queryFn: () => getSolarWind(),
  retry: false,
  staleTime: 60_000,
});
const xrayQueryOptions = queryOptions({
  queryKey: ["stellun", "xray-flux"],
  queryFn: () => getXrayFlux(),
  retry: false,
  staleTime: 60_000,
});
const donkiQueryOptions = queryOptions({
  queryKey: ["stellun", "donki"],
  queryFn: () => getDONKI(),
  retry: false,
  staleTime: 300_000,
});

// ------------------------------ Parsing -----------------------------------

type KpRow = { time: string; kp: number };

// NOAA noaa-planetary-k-index.json: array of objects {time_tag, Kp, ...}.
// Tolerate the legacy array-of-arrays shape with a header row as well.
function parseKp(raw: unknown): KpRow[] {
  if (!Array.isArray(raw)) return [];
  const out: KpRow[] = [];
  for (const r of raw as any[]) {
    const kp = Number(Array.isArray(r) ? r[1] : r?.Kp);
    if (Number.isFinite(kp)) out.push({ time: String((Array.isArray(r) ? r[0] : r?.time_tag) ?? ""), kp });
  }
  return out;
}

// NOAA rtsw feeds are arrays of objects with named numeric fields; scan from
// the end for the most recent non-null reading of a field.
function lastValidField(rows: unknown, field: string): number | null {
  if (!Array.isArray(rows)) return null;
  for (let i = rows.length - 1; i >= 0; i--) {
    const cell = (rows as any[])[i]?.[field];
    if (cell === null || cell === undefined) continue;
    const v = Number(cell);
    if (Number.isFinite(v)) return v;
  }
  return null;
}

function lastTimeTag(rows: unknown): string {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const last = (rows as any[])[rows.length - 1];
  return String(last?.time_tag ?? "");
}

// GOES class from flux in W/m². A: 1e-8..1e-7, B: ..1e-6, C: ..1e-5, M: ..1e-4, X: above.
function xrayClass(flux: number | null): { label: string; note: string } {
  if (flux === null || flux <= 0) return { label: "--", note: "no reading" };
  const exp = Math.floor(Math.log10(flux));
  if (exp < -8) return { label: "Below A", note: "very quiet" };
  const letters: Record<number, string> = { "-8": "A", "-7": "B", "-6": "C", "-5": "M" };
  const letter = exp >= -4 ? "X" : letters[exp] ?? "A";
  const base = Math.pow(10, exp);
  const num = flux / base;
  return { label: `${letter}${num.toFixed(1)}`, note: `flux ${flux.toExponential(1)} W/m²` };
}

// Geomagnetic storm scale from Kp.
function kpStormLevel(kp: number | null): { label: string; tone: "success" | "warning" | "danger" } {
  if (kp === null) return { label: "No data", tone: "warning" };
  if (kp < 5) return { label: "Quiet", tone: "success" };
  const g = Math.min(5, Math.round(kp) - 4);
  return { label: `G${g} storm`, tone: kp >= 7 ? "danger" : "warning" };
}

// Rough equatorward boundary of the auroral oval, in degrees magnetic latitude.
// Commonly cited approximation; shown clearly as an estimate.
function auroraBoundaryEstimate(kp: number): number {
  return Math.max(35, 67 - 2 * kp);
}

type DonkiAlert = { id: string; type: string; issued: string; body: string };

const DONKI_TYPE_NAMES: Record<string, string> = {
  FLR: "Solar flare",
  CME: "Coronal mass ejection",
  GST: "Geomagnetic storm",
  SEP: "Solar energetic particles",
  HSS: "High speed stream",
  RBE: "Radiation belt enhancement",
  MPC: "Magnetopause crossing",
  IPS: "Interplanetary shock",
  Report: "Weekly report",
};

function parseDonki(raw: unknown): DonkiAlert[] {
  if (!Array.isArray(raw)) return [];
  return (raw as any[])
    .slice()
    .sort((a, b) => String(b?.messageIssueTime ?? "").localeCompare(String(a?.messageIssueTime ?? "")))
    .slice(0, 8)
    .map((n, i) => ({
      id: String(n?.messageID ?? i),
      type: String(n?.messageType ?? ""),
      issued: String(n?.messageIssueTime ?? ""),
      body: safeText(n?.messageBody, 400).replace(/\s+/g, " "),
    }));
}

// ------------------------------ Components ---------------------------------

function KpDial({ kp }: { kp: number | null }) {
  return (
    <div className="kp-dial" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => {
        const seg = i + 1;
        const on = kp !== null && kp >= seg - 0.5;
        const cls = seg >= 5 ? "kp-storm" : seg >= 4 ? "kp-watch" : "kp-calm";
        return (
          <div
            key={seg}
            className={`kp-seg ${on ? `on ${cls}` : ""}`}
            style={{ height: 8 + seg * 3 }}
          />
        );
      })}
    </div>
  );
}

function WeatherError({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <main className="page-main">
      <section>
        <div className="container">
          <FeedError
            title="Space weather is temporarily unavailable"
            source="NOAA's Space Weather Prediction Center and NASA's DONKI service"
            onRetry={() => {
              router.invalidate();
              reset();
            }}
          />
        </div>
      </section>
    </main>
  );
}

function WeatherPage() {
  const kp = useSuspenseQuery(kpQueryOptions).data;
  const wind = useSuspenseQuery(windQueryOptions).data;
  const xray = useSuspenseQuery(xrayQueryOptions).data;
  const donki = useSuspenseQuery(donkiQueryOptions).data;

  const kpRows = parseKp(kp?.data);
  const kpNow = kpRows.length ? kpRows[kpRows.length - 1]!.kp : null;
  const kpMax = kpRows.length ? Math.max(...kpRows.map((r) => r.kp)) : null;
  const storm = kpStormLevel(kpNow);

  const plasma = wind?.data?.plasma;
  const mag = wind?.data?.mag;
  const speed = lastValidField(plasma, "proton_speed"); // km/s
  const density = lastValidField(plasma, "proton_density"); // p/cm³
  const temp = lastValidField(plasma, "proton_temperature"); // K
  const bz = lastValidField(mag, "bz_gsm"); // nT, GSM
  const bt = lastValidField(mag, "bt"); // nT total
  const windTime = lastTimeTag(plasma);

  const xrRows = Array.isArray(xray?.data) ? (xray.data as any[]) : [];
  const lastFlux = xrRows.length ? Number(xrRows[xrRows.length - 1]?.observed_flux ?? xrRows[xrRows.length - 1]?.flux) : NaN;
  const flare = xrayClass(Number.isFinite(lastFlux) ? lastFlux : null);

  const alerts = parseDonki(donki?.data);

  return (
    <main className="page-main">
      <section>
        <div className="container">
          <div className="page-hero">
            <span className="eyebrow">NOAA SWPC · NASA DONKI</span>
            <h1>Space weather</h1>
            <p className="tagline">
              Solar wind, geomagnetic conditions, and solar X-ray activity, live from
              NOAA's Space Weather Prediction Center and NASA's DONKI alert service.
              Readings are refreshed every few minutes.
            </p>
          </div>

          <div className="freshness-row">
            <FreshnessBadge res={kp} />
            <span className="freshness-note">All times UTC. Data lag of a few minutes is normal.</span>
            <ExportButtons
              rows={kpRows}
              columns={[
                { key: "time", label: "Time (UTC)", value: (r: KpRow) => r.time },
                { key: "kp", label: "Kp index", value: (r: KpRow) => r.kp },
              ]}
              meta={{
                dataset: "Planetary K index series",
                source: "NOAA Space Weather Prediction Center",
                retrievedAt: kp.fetchedAt,
              }}
              label="Download Kp series"
            />
          </div>

          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Kp index</div>
              <div className="stat-value">{kpNow !== null ? kpNow.toFixed(2) : "--"}</div>
              <div className="stat-unit">
                <span className={`badge badge-${storm.tone}`}>{storm.label}</span>
              </div>
              <KpDial kp={kpNow} />
              <div className="stat-note">
                {kpMax !== null ? `Max last 24h: ${kpMax.toFixed(2)}` : ""}
                {kpNow !== null ? ` · aurora estimate: visible to ~${auroraBoundaryEstimate(kpNow).toFixed(0)}° magnetic latitude` : ""}
              </div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Solar wind speed</div>
              <div className="stat-value">{speed !== null ? fmtNum(speed, 0) : "--"}</div>
              <div className="stat-unit">km/s</div>
              <div className="stat-note">
                {speed !== null
                  ? speed < 400
                    ? "Slow wind regime"
                    : speed < 600
                      ? "Typical solar wind"
                      : "Fast wind, possibly a coronal hole stream"
                  : ""}
              </div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Wind density</div>
              <div className="stat-value">{density !== null ? fmtNum(density, 1) : "--"}</div>
              <div className="stat-unit">protons/cm³</div>
              <div className="stat-note">
                {temp !== null ? `Proton temp ${fmtNum(temp, 0)} K` : ""}
              </div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">IMF Bz</div>
              <div className="stat-value">{bz !== null ? fmtNum(bz, 1) : "--"}</div>
              <div className="stat-unit">nT (GSM)</div>
              <div className="stat-note">
                {bz !== null
                  ? bz < 0
                    ? "Southward: couples into the magnetosphere, storm risk up"
                    : "Northward: geomagnetically calm"
                  : ""}
                {bt !== null ? ` · total field ${fmtNum(bt, 1)} nT` : ""}
              </div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">X-ray flux class</div>
              <div className="stat-value">{flare.label}</div>
              <div className="stat-unit">GOES 0.1-0.8 nm</div>
              <div className="stat-note">{flare.note} · classes run A, B, C, M, X</div>
            </div>
          </div>

          <div className="glass glass-card scaffold-card">
            <h2>Recent alerts, last 7 days</h2>
            <p>
              Notifications issued by NASA's DONKI (Database Of Notifications, Knowledge,
              Information) network, newest first.
            </p>
            {alerts.length === 0 ? (
              <EmptyState
                title="No alerts in the past 7 days"
                message="The Sun has been quiet; NASA's notification network has issued no new space weather alerts in this window."
              />
            ) : (
              <div>
                {alerts.map((a) => (
                  <div className="alert-item" key={a.id}>
                    <div className="alert-head">
                      <span className="badge badge-accent">
                        {DONKI_TYPE_NAMES[a.type] ?? a.type}
                      </span>
                      <span className="mono text-faint" style={{ fontSize: "0.8rem" }}>
                        {a.issued.replace("T", " ").replace("Z", " UTC")}
                      </span>
                    </div>
                    <div className="alert-body">{a.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="scaffold-note" style={{ marginTop: 20 }}>
            Sources: NOAA SWPC planetary K-index, ACE/DSCOVR real-time solar wind, GOES primary
            X-ray flux, and NASA DONKI notifications. Wind reading as of{" "}
            {windTime ? windTime.replace("T", " ") + " UTC" : "unknown"}. The aurora boundary is a
            simplified estimate from Kp, not an official forecast.
          </p>
        </div>
      </section>
    </main>
  );
}
