// Mars Image Gallery: surface craft telemetry cards plus a filterable gallery
// of raw frames from every rover and helicopter that has imaged the surface.
// All imagery is fetched server-side and cached; this component only reads it.
import { useEffect, useMemo, useState } from "react";
import { useQuery, queryOptions } from "@tanstack/react-query";
import {
  getMarsGallery,
  type DataResult,
  type MarsFrame,
  type MarsGalleryPayload,
} from "@/lib/stellun-data.functions";
import {
  ACTIVE_CRAFT,
  ALL_CRAFT,
  CRAFT,
  HISTORIC_CRAFT,
  currentSol,
  dateForSol,
  instrumentName,
  instrumentNote,
  solForDate,
  type CraftKey,
} from "@/lib/mars-craft";
import { fmtNum } from "@/lib/format";
import { FreshnessBadge } from "@/components/site/freshness-badge";
import { FeedError } from "@/components/site/data-state";
import { PhotoGridSkeleton, DetailRowsSkeleton } from "@/components/site/page-skeleton";

const galleryQuery = (craft: CraftKey, sol: number | null) =>
  queryOptions({
    queryKey: ["stellun", "mars-gallery", craft, sol],
    queryFn: () => getMarsGallery({ data: { craft, sol, page: 0 } }),
    retry: 1,
    staleTime: 30 * 60_000,
  });

function payload(res: DataResult | undefined): MarsGalleryPayload | null {
  const d = res?.data as MarsGalleryPayload | undefined;
  if (!d || !Array.isArray(d.frames)) return null;
  return d;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function TelemetryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-cell">
      <div className="stat-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  );
}

// One telemetry card. Active craft read their sol count and frame totals from
// the live feed; retired craft report the figures published at end of mission.
function TelemetryCard({
  craftKey,
  res,
  loading,
  failed,
  retry,
}: {
  craftKey: CraftKey;
  res?: DataResult | undefined;
  loading?: boolean | undefined;
  failed?: boolean | undefined;
  retry?: (() => void) | undefined;
}) {
  const craft = CRAFT[craftKey];
  const feed = payload(res);
  const active = craft.status === "active";
  const sols = craft.finalSol ?? (feed?.latestSol ?? currentSol(craft, new Date()));

  return (
    <div className="glass glass-card mars-telemetry-card">
      <div className="side-item-top">
        <h3>{craft.label}</h3>
        <span className={`mars-status-pill ${active ? "is-active" : "is-retired"}`}>
          {active ? "Active" : "Retired"}
        </span>
      </div>
      <p className="mars-craft-type">
        {craft.type} · {craft.power}
      </p>
      {loading ? (
        <DetailRowsSkeleton cells={6} label="Loading mission telemetry" />
      ) : failed && active ? (
        <FeedError
          title="Telemetry is temporarily unavailable"
          source="NASA's Mars raw image service"
          onRetry={retry ?? (() => undefined)}
        />
      ) : (
        <div className="detail-rows">
          <TelemetryCell label="Mission status" value={active ? "Active" : "Mission complete"} />
          <TelemetryCell label="Landing location" value={craft.site} />
          <TelemetryCell label="Landing date" value={craft.missionStart} />
          <TelemetryCell
            label={active ? "Earth date today" : "Last contact"}
            value={active ? todayISO() : (craft.missionEnd ?? "--")}
          />
          <TelemetryCell label="Sols completed" value={fmtNum(sols)} />
          <TelemetryCell
            label="Images logged"
            value={feed?.totalImages != null ? fmtNum(feed.totalImages) : craft.totalImagesNote}
          />
        </div>
      )}
      <p className="detail-note">{craft.telemetryNotes}</p>
      {res ? (
        <div style={{ marginTop: 8 }}>
          <FreshnessBadge res={res} />
        </div>
      ) : null}
    </div>
  );
}

// Full resolution viewer with the frame's metadata and a download link.
function Lightbox({
  frame,
  onClose,
}: {
  frame: MarsFrame;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const craft = CRAFT[frame.craft as CraftKey];
  const note = instrumentNote(frame.instrument);

  return (
    <div className="mars-lightbox" role="dialog" aria-modal="true" aria-label={frame.title}>
      <div className="mars-lightbox-backdrop" onClick={onClose} />
      <div className="mars-lightbox-panel glass">
        <div className="mars-lightbox-head">
          <h3>{frame.title}</h3>
          <button type="button" className="chip" onClick={onClose} aria-label="Close the image viewer">
            Close
          </button>
        </div>
        <img src={frame.full || frame.thumb} alt={frame.title} className="mars-lightbox-image" />
        <div className="detail-rows">
          <TelemetryCell label="Craft" value={craft?.label ?? frame.craft} />
          <TelemetryCell label="Instrument" value={instrumentName(frame.instrument)} />
          <TelemetryCell label="Martian sol" value={frame.sol != null ? fmtNum(frame.sol) : "Not recorded"} />
          <TelemetryCell label="Earth date" value={frame.earthDate ?? "Not recorded"} />
        </div>
        {note ? <p className="detail-note">{note}</p> : null}
        <div className="compare-actions" style={{ marginTop: 12 }}>
          <a className="chip" href={frame.full || frame.thumb} target="_blank" rel="noopener noreferrer" download>
            Download full resolution
          </a>
          {frame.link ? (
            <a className="chip" href={frame.link} target="_blank" rel="noopener noreferrer">
              Open on NASA
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function MarsImageGallery() {
  const [showHistoric, setShowHistoric] = useState(false);
  const [craftKey, setCraftKey] = useState<CraftKey>("perseverance");
  const [instrument, setInstrument] = useState("all");
  const [dateMode, setDateMode] = useState<"latest" | "sol" | "earth">("latest");
  const [solInput, setSolInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [open, setOpen] = useState<MarsFrame | null>(null);

  const craft = CRAFT[craftKey];
  const supportsSol = craftKey === "perseverance" || craftKey === "curiosity";

  // The requested sol: typed directly, converted from an Earth date, or none
  // for the default latest-frames view.
  const sol = useMemo(() => {
    if (!supportsSol || dateMode === "latest") return null;
    if (dateMode === "sol") {
      const n = Number.parseInt(solInput, 10);
      return Number.isFinite(n) && n >= 0 ? n : null;
    }
    if (!dateInput) return null;
    const d = new Date(`${dateInput}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    return solForDate(craft, d);
  }, [supportsSol, dateMode, solInput, dateInput, craft]);

  const persQ = useQuery(galleryQuery("perseverance", null));
  const curQ = useQuery(galleryQuery("curiosity", null));
  const mainQ = useQuery(galleryQuery(craftKey, sol));

  const feed = payload(mainQ.data);
  const frames = feed?.frames ?? [];

  const instruments = useMemo(() => {
    const set = new Set<string>();
    frames.forEach((f) => {
      if (f.instrument) set.add(f.instrument);
    });
    return Array.from(set).sort();
  }, [frames]);

  const visible = useMemo(
    () => (instrument === "all" ? frames : frames.filter((f) => f.instrument === instrument)),
    [frames, instrument]
  );

  const switchCraft = (key: CraftKey) => {
    setCraftKey(key);
    setInstrument("all");
    if (key !== "perseverance" && key !== "curiosity") setDateMode("latest");
  };

  return (
    <section className="mars-gallery accent-panel" id="mars-image-gallery">
      <div className="container">
        <header className="mars-gallery-head">
          <span className="eyebrow">NASA raw imagery · Mars surface craft</span>
          <h2>Mars Image Gallery</h2>
          <p className="tagline">
            Telemetry for the craft working on the surface today, and every frame they
            and their predecessors sent home, searchable by craft, camera, and date.
          </p>
        </header>

        <div className="mars-telemetry-grid">
          <TelemetryCard
            craftKey="perseverance"
            res={persQ.data}
            loading={persQ.isPending}
            failed={persQ.isError}
            retry={() => { void persQ.refetch(); }}
          />
          <TelemetryCard
            craftKey="curiosity"
            res={curQ.data}
            loading={curQ.isPending}
            failed={curQ.isError}
            retry={() => { void curQ.refetch(); }}
          />
        </div>

        <div className="compare-actions" style={{ marginTop: 14 }}>
          <button
            type="button"
            className={`chip ${showHistoric ? "chip-active" : ""}`}
            aria-pressed={showHistoric}
            onClick={() => setShowHistoric((v) => !v)}
          >
            {showHistoric ? "Hide past missions" : "Show past missions"}
          </button>
          <span className="detail-note" style={{ margin: 0 }}>
            Ingenuity, Opportunity, and Spirit
          </span>
        </div>

        {showHistoric ? (
          <div className="mars-telemetry-grid" style={{ marginTop: 14 }}>
            {HISTORIC_CRAFT.map((k) => (
              <TelemetryCard key={k} craftKey={k} />
            ))}
          </div>
        ) : null}

        <div className="glass glass-card mars-filter-bar">
          <div className="mars-filter-row">
            <span className="stat-label">Craft</span>
            <div className="compare-actions" style={{ margin: 0 }} role="group" aria-label="Filter by craft">
              {ALL_CRAFT.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`chip ${craftKey === k ? "chip-active" : ""}`}
                  aria-pressed={craftKey === k}
                  onClick={() => switchCraft(k)}
                >
                  {CRAFT[k].label}
                </button>
              ))}
            </div>
          </div>

          <div className="mars-filter-row">
            <label className="stat-label" htmlFor="mars-camera">
              Camera
            </label>
            <select
              id="mars-camera"
              className="mars-select"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
            >
              <option value="all">All cameras</option>
              {instruments.map((code) => (
                <option key={code} value={code}>
                  {instrumentName(code)} ({code})
                </option>
              ))}
            </select>
          </div>

          {supportsSol ? (
            <div className="mars-filter-row">
              <span className="stat-label">Date</span>
              <div className="compare-actions" style={{ margin: 0 }} role="group" aria-label="Filter by date">
                {(["latest", "sol", "earth"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`chip ${dateMode === m ? "chip-active" : ""}`}
                    aria-pressed={dateMode === m}
                    onClick={() => setDateMode(m)}
                  >
                    {m === "latest" ? "Latest frames" : m === "sol" ? "By sol" : "By Earth date"}
                  </button>
                ))}
              </div>
              {dateMode === "sol" ? (
                <input
                  className="mars-select"
                  type="number"
                  min={0}
                  max={currentSol(craft, new Date())}
                  placeholder={`0 to ${currentSol(craft, new Date())}`}
                  value={solInput}
                  onChange={(e) => setSolInput(e.target.value)}
                  aria-label="Martian sol"
                />
              ) : null}
              {dateMode === "earth" ? (
                <input
                  className="mars-select"
                  type="date"
                  min={craft.missionStart}
                  max={todayISO()}
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  aria-label="Earth date"
                />
              ) : null}
            </div>
          ) : (
            <p className="detail-note" style={{ margin: 0 }}>
              {craft.label} no longer publishes raw frames by sol. Its archived imagery is
              listed below.
            </p>
          )}

          <div className="mars-filter-meta">
            {sol != null ? (
              <span className="mono">
                Sol {fmtNum(sol)} · around {dateForSol(craft, sol).toISOString().slice(0, 10)}
              </span>
            ) : (
              <span className="mono">Most recent frames</span>
            )}
            {mainQ.data ? <FreshnessBadge res={mainQ.data} /> : null}
          </div>
        </div>

        {mainQ.isPending ? (
          <PhotoGridSkeleton count={9} label="Loading surface imagery" />
        ) : mainQ.isError ? (
          <FeedError
            title="Surface imagery is temporarily unavailable"
            source="NASA's Mars image services"
            onRetry={() => { void mainQ.refetch(); }}
          />
        ) : visible.length === 0 ? (
          <div className="glass glass-card side-card">
            <p className="detail-note" style={{ marginTop: 0 }}>
              {sol != null
                ? `${craft.label} did not log any images on sol ${fmtNum(sol)} with this camera filter. Try a nearby sol or clear the camera filter.`
                : `No frames are listed for ${craft.label} with this camera filter.`}
            </p>
          </div>
        ) : (
          <div className="mars-gallery-grid">
            {visible.map((f) => (
              <figure className="mars-gallery-card" key={f.id}>
                <button
                  type="button"
                  className="mars-gallery-thumb"
                  onClick={() => setOpen(f)}
                  aria-label={`Open ${f.title} at full resolution`}
                >
                  <img src={f.thumb} alt={f.title} loading="lazy" decoding="async" />
                </button>
                <figcaption>
                  <span className="mars-card-title">{f.title}</span>
                  <span className="mars-card-meta mono">
                    {f.sol != null ? `Sol ${fmtNum(f.sol)} · ` : ""}
                    {f.earthDate ?? "date not recorded"}
                  </span>
                  <span className="mars-card-meta">
                    {instrumentName(f.instrument)}
                    {f.instrument ? ` (${f.instrument})` : ""}
                  </span>
                  <span className="mars-craft-tag">{CRAFT[f.craft as CraftKey]?.label ?? f.craft}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <div className="glass glass-card mars-craft-profile">
          <div className="side-item-top">
            <h3>{craft.label} in detail</h3>
            <span className="mono" style={{ fontSize: "0.75rem", color: "var(--color-text-faint)" }}>
              {craft.type} · {craft.durationNote}
            </span>
          </div>
          <p className="essay-abstract">{craft.abstract}</p>
          {craft.sections.map((s) => (
            <div className="essay-section" key={s.heading}>
              <h4>{s.heading}</h4>
              <p>{s.body}</p>
            </div>
          ))}
          <div className="essay-sources">
            <h4>Sources</h4>
            <ul>
              {craft.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-accent">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="scaffold-note" style={{ marginTop: 18 }}>
          Perseverance and Curiosity frames come from the raw image services at
          mars.nasa.gov. Ingenuity, Opportunity, and Spirit completed their missions, so
          their imagery is drawn from the NASA image library. Sol counts for active craft
          are taken from the newest frame in each feed.
        </p>

        {ACTIVE_CRAFT.length === 0 ? null : null}
      </div>
      {open ? <Lightbox frame={open} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}
