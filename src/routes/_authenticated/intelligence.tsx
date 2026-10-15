// Mission Intelligence: the mission record shown here rather than sent
// elsewhere. Profiles are listed inline, alphabetically, with filters by
// operating status and by discipline. Official pages are still linked, but only
// as the place to verify a figure or read further.
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CATEGORY_LABEL,
  MISSIONS,
  MISSION_DIRECTORIES,
  STATUS_LABEL,
  missionYear,
  type MissionCategory,
  type MissionProfile,
  type MissionStatus,
} from "@/lib/missions";
import { ExportButtons } from "@/components/site/export-buttons";

export const Route = createFileRoute("/_authenticated/intelligence")({
  head: () => ({
    meta: [
      { title: "Mission Intelligence - Space Mission Directory - STELLUN" },
      {
        name: "description",
        content:
          "An inline directory of active, in transit, planned, and completed space missions, each with launch date, vehicle, destination, objectives, and verified results.",
      },
      { property: "og:title", content: "Mission Intelligence - Space Mission Directory - STELLUN" },
      {
        property: "og:description",
        content:
          "Active, in transit, planned, and completed space missions listed with launch dates, vehicles, destinations, and verified results.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntelligencePage,
});

// Mission end dates are stored as plain ISO dates; show them the way the launch
// labels read.
function fmtEnded(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const STATUS_ORDER: MissionStatus[] = ["active", "extended", "cruise", "planned", "completed"];
const CATEGORY_ORDER: MissionCategory[] = [
  "human",
  "planetary",
  "astrophysics",
  "heliophysics",
  "earth",
  "lunar",
];

const EXPORT_COLUMNS = [
  { key: "name", label: "Mission", value: (m: MissionProfile) => m.name },
  { key: "agency", label: "Agency", value: (m: MissionProfile) => m.agency },
  { key: "status", label: "Status", value: (m: MissionProfile) => STATUS_LABEL[m.status] },
  { key: "category", label: "Discipline", value: (m: MissionProfile) => CATEGORY_LABEL[m.category] },
  { key: "launched", label: "Launched", value: (m: MissionProfile) => m.launchLabel },
  { key: "vehicle", label: "Launch vehicle", value: (m: MissionProfile) => m.vehicle },
  { key: "destination", label: "Destination", value: (m: MissionProfile) => m.destination },
  { key: "objective", label: "Objective", value: (m: MissionProfile) => m.objective },
  { key: "url", label: "Official page", value: (m: MissionProfile) => m.url },
];

function IntelligencePage() {
  const [status, setStatus] = useState<MissionStatus | "all">("all");
  const [category, setCategory] = useState<MissionCategory | "all">("all");
  const [agency, setAgency] = useState("all");
  const [target, setTarget] = useState("all");
  const agencies = [...new Set(MISSIONS.map((m) => m.agency))].sort();
  const targets = [...new Set(MISSIONS.map((m) => m.destination))].sort();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MISSIONS.filter(
      (m) =>
        (status === "all" || m.status === status) &&
        (category === "all" || m.category === category) &&
        (agency === "all" || m.agency === agency) &&
        (target === "all" || m.destination === target) &&
        (q === "" ||
          m.name.toLowerCase().includes(q) ||
          m.destination.toLowerCase().includes(q) ||
          m.agency.toLowerCase().includes(q))
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [status, category, agency, target, query]);

  // Alphabetical grouping so the directory reads as an A to Z list.
  const groups = useMemo(() => {
    const map = new Map<string, MissionProfile[]>();
    for (const m of filtered) {
      const letter = m.name.charAt(0).toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : "0-9";
      const bucket = map.get(key);
      if (bucket) bucket.push(m);
      else map.set(key, [m]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const counts = useMemo(() => {
    const byStatus = new Map<MissionStatus, number>();
    for (const m of MISSIONS) byStatus.set(m.status, (byStatus.get(m.status) ?? 0) + 1);
    return byStatus;
  }, []);

  return (
    <main className="page-main intelligence-page">
      <section className="container page-hero">
        <span className="badge">Mission record</span>
        <h1>Mission intelligence</h1>
        <p className="tagline">
          {MISSIONS.length} missions listed in full: what each one flies, where it went,
          what it has established. Filter by operating status or by discipline, or search
          by name, agency, or destination.
        </p>
      </section>

      <section className="container">
        <div className="stat-strip">
          {STATUS_ORDER.map((s) => (
            <div className="stat-cell" key={s}>
              <span className="stat-label">{STATUS_LABEL[s]}</span>
              <b className="mono stat-value">{counts.get(s) ?? 0}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="container roman-section">
        <div className="panel-head">
          <div>
            <h2>Directory</h2>
            <p className="roman-note">
              Every figure below traces to the mission's own page, linked on each entry.
            </p>
          </div>
          <ExportButtons
            rows={filtered}
            columns={EXPORT_COLUMNS}
            meta={{
              dataset: "STELLUN mission directory",
              source: "NASA and partner agency mission pages",
            }}
          />
        </div>

        <div className="filter-bar">
          <label className="visually-hidden" htmlFor="mission-search">
            Search missions
          </label>
          <input
            id="mission-search"
            type="search"
            className="input"
            placeholder="Search by mission, agency, or destination"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="chip-row" role="group" aria-label="Filter by status">
          <button
            type="button"
            className={`chip${status === "all" ? " chip-active" : ""}`}
            aria-pressed={status === "all"}
            onClick={() => setStatus("all")}
          >
            All statuses
          </button>
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              className={`chip${status === s ? " chip-active" : ""}`}
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="chip-row" role="group" aria-label="Filter by discipline">
          <button
            type="button"
            className={`chip${category === "all" ? " chip-active" : ""}`}
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
          >
            All disciplines
          </button>
          {CATEGORY_ORDER.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip${category === c ? " chip-active" : ""}`}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        <div className="mission-filter-selects">
          <label className="field-label" htmlFor="mission-agency">Agency
            <select id="mission-agency" className="input" value={agency} onChange={(e) => setAgency(e.target.value)}><option value="all">All agencies</option>{agencies.map((a) => <option key={a} value={a}>{a}</option>)}</select>
          </label>
          <label className="field-label" htmlFor="mission-target">Target
            <select id="mission-target" className="input" value={target} onChange={(e) => setTarget(e.target.value)}><option value="all">All targets</option>{targets.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          </label>
        </div>
        <p className="roman-note" role="status">
          Showing {filtered.length} of {MISSIONS.length} missions.
        </p>

        {groups.length === 0 ? (
          <p className="roman-note">
            No mission matches that search. Clearing the filters brings the full list
            back.
          </p>
        ) : null}

        {groups.map(([letter, missions]) => (
          <div className="mission-group" key={letter}>
            <h3 className="mission-letter mono">{letter}</h3>
            <div className="mission-list">
              {missions.map((m) => {
                const open = openId === m.id;
                return (
                  <article
                    key={m.id}
                    className="glass glass-card mission-card"
                    data-open={open ? "true" : undefined}
                  >
                    <button
                      type="button"
                      className="mission-head"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : m.id)}
                    >
                      <span className="mission-title">
                        <b>{m.name}</b>
                        <span className="mission-sub">
                          {m.agency} · {CATEGORY_LABEL[m.category]} · {m.launchLabel}
                          {m.ended ? ` to ${fmtEnded(m.ended)}` : ""}
                        </span>
                      </span>
                      <span className="mission-side">
                        <span
                          className={`badge${
                            m.status === "active" || m.status === "extended"
                              ? " badge-success"
                              : m.status === "planned"
                                ? ""
                                : m.status === "cruise"
                                  ? " badge-warning"
                                  : ""
                          }`}
                        >
                          {STATUS_LABEL[m.status]}
                        </span>
                        <span className="mission-chevron" aria-hidden="true">
                          {open ? "-" : "+"}
                        </span>
                      </span>
                    </button>

                    <p className="mission-objective">{m.objective}</p>

                    {open ? (
                      <div className="mission-body">
                        <div className="detail-rows">
                          <div className="detail-row">
                            <span>Launched</span>
                            <b className="mono">{m.launchLabel}</b>
                          </div>
                          <div className="detail-row">
                            <span>Launch vehicle</span>
                            <b className="mono">{m.vehicle}</b>
                          </div>
                          <div className="detail-row">
                            <span>Destination</span>
                            <b className="mono">{m.destination}</b>
                          </div>
                          <div className="detail-row">
                            <span>Operating year</span>
                            <b className="mono">{missionYear(m)}</b>
                          </div>
                        </div>
                        <ul className="feature-list">
                          {m.highlights.map((h) => (
                            <li key={h}>{h}</li>
                          ))}
                        </ul>
                        <div className="mission-links">
                          {m.internal ? (
                            <Link to={m.internal.to} className="detail-link">
                              {m.internal.label}
                            </Link>
                          ) : null}
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="detail-link"
                          >
                            Official mission page
                          </a>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="container roman-section">
        <header className="section-head">
          <h2>Going further</h2>
          <p>
            The directory above is curated. These official catalogues hold every mission
            an agency has flown, for anything outside it.
          </p>
        </header>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Catalogue</th>
                <th scope="col">What it holds</th>
              </tr>
            </thead>
            <tbody>
              {MISSION_DIRECTORIES.map((d) => (
                <tr key={d.url}>
                  <td>
                    <a href={d.url} target="_blank" rel="noreferrer noopener">
                      {d.name}
                    </a>
                  </td>
                  <td>{d.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="roman-note">
          Live spacecraft positions are on the{" "}
          <Link to="/deepspace" className="text-accent">
            Deep Space
          </Link>{" "}
          page, and satellites in Earth orbit on the{" "}
          <Link to="/tracker" className="text-accent">
            Orbit Tracker
          </Link>
          . Confirmed flights ahead are on the{" "}
          <Link to="/launches" className="text-accent">
            Launch Schedule
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
