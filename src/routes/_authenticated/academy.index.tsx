import { createFileRoute, Link } from "@tanstack/react-router";

/**
 * Academy dashboard
 * -----------------
 * Home of the study section. Layout follows the Academy mock (Claude) with
 * illustration slots and progress surfaces inspired by the denser concept art
 * (Gemini), using only STELLUN tokens (navy accent, amber highlight).
 *
 * Data is currently illustrative. Wire to study-workspace / profile when ready:
 * search for TODO(data) below.
 */

export const Route = createFileRoute("/_authenticated/academy/")({
  head: () => ({
    meta: [
      { title: "Academy dashboard · STELLUN" },
      {
        name: "description",
        content: "Continue studying, track goals, and open your workspaces.",
      },
    ],
  }),
  component: AcademyDashboard,
});

/** Placeholder modules — replace with real enrollment when the course layer lands. */
const MODULES = [
  {
    id: "astro",
    title: "Introduction to astronomy",
    progress: 58,
    kind: "Astronomy",
    /** CSS class for the cover illustration slot (no external asset required). */
    cover: "academy-cover-astro",
  },
  {
    id: "aero",
    title: "Aerospace engineering",
    progress: 24,
    kind: "Aerospace",
    cover: "academy-cover-aero",
  },
  {
    id: "avionics",
    title: "Aviation mechanics",
    progress: 31,
    kind: "Aviation",
    cover: "academy-cover-av",
  },
];

const TODAY = [
  { task: "Stellar physics flashcards", time: "7:30 PM", status: "now" as const },
  { task: "Orbital mechanics homework", time: "Done at 9:10 AM", status: "done" as const },
  { task: "Aircraft instrumentation reading", time: "8:30 PM", status: "idle" as const },
];

function AcademyDashboard() {
  return (
    <main className="academy-dash page-main">
      {/* Hero — illustration sits in .academy-hero-art (swap for <img> later) */}
      <section className="academy-hero card glass glass-card" aria-labelledby="academy-welcome">
        <div className="academy-hero-copy">
          <p className="eyebrow">The Academy</p>
          <h1 id="academy-welcome">Welcome back</h1>
          <p className="tagline">
            Astronomy, aerospace, and aviation study in one place. Continue a workspace or open
            the desk for plans and notes.
          </p>
          <div className="academy-hero-actions">
            <Link to="/academy/desk" className="btn btn-primary">
              Open Study desk
            </Link>
            <Link to="/ask" className="btn btn-ghost">
              Ask Stellun
            </Link>
          </div>
        </div>
        <div className="academy-hero-art" aria-hidden="true">
          <div className="academy-orbit" />
          <div className="academy-orbit-dot" />
        </div>
      </section>

      {/* Active modules */}
      <section aria-labelledby="modules-h">
        <div className="academy-row-head">
          <h2 className="academy-sec" id="modules-h">
            Active modules
          </h2>
          <Link to="/academy/desk" className="link">
            View all
          </Link>
        </div>
        <div className="academy-module-grid">
          {MODULES.map((m) => (
            <article key={m.id} className="academy-module card glass glass-card">
              <div className={`academy-module-cover ${m.cover}`} aria-hidden="true" />
              <div className="academy-module-body">
                <p className="muted small">{m.kind}</p>
                <h3 className="academy-module-title">{m.title}</h3>
                <p className="muted small">Lesson progress, {m.progress}%</p>
                <div className="academy-bar" role="progressbar" aria-valuenow={m.progress} aria-valuemin={0} aria-valuemax={100}>
                  <i style={{ width: `${m.progress}%` }} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="academy-split">
        <section aria-labelledby="today-h">
          <div className="academy-row-head">
            <h2 className="academy-sec" id="today-h">
              Today
            </h2>
          </div>
          <div className="card glass glass-card academy-table-card">
            <table className="academy-rows">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {TODAY.map((row) => (
                  <tr key={row.task}>
                    <td>{row.task}</td>
                    <td>{row.time}</td>
                    <td>
                      <span
                        className={
                          row.status === "done"
                            ? "academy-status done"
                            : row.status === "now"
                              ? "academy-status now"
                              : "academy-status"
                        }
                      >
                        {row.status === "done" ? "Done" : row.status === "now" ? "In progress" : "Not started"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="week-h">
          <div className="academy-row-head">
            <h2 className="academy-sec" id="week-h">
              This week
            </h2>
          </div>
          {/* TODO(data): replace with real study-time metrics */}
          <div className="academy-metric-grid">
            <div className="card glass glass-card">
              <div className="academy-metric">14.5 h</div>
              <div className="muted small">Study time</div>
            </div>
            <div className="card glass glass-card">
              <div className="academy-metric">15 of 24</div>
              <div className="muted small">Topic sets</div>
            </div>
            <div className="card glass glass-card">
              <div className="academy-metric">A-</div>
              <div className="muted small">Average grade</div>
            </div>
            <div className="card glass glass-card">
              <div className="academy-metric">2 of 5</div>
              <div className="muted small">Milestones</div>
            </div>
          </div>
        </section>
      </div>

      <section aria-labelledby="shelf-h">
        <div className="academy-row-head">
          <h2 className="academy-sec" id="shelf-h">
            Recommended for you
          </h2>
          <Link to="/academy/desk" className="link">
            Open shelf
          </Link>
        </div>
        <div className="academy-shelf">
          {[
            ["Astronomy · 25 min", "Orbital mechanics primer", "Matches your next lesson"],
            ["Aerospace · 40 min", "Hohmann transfer examples", "Builds on chapter 3"],
            ["Aviation · 15 min", "Cockpit instrument glossary", "Reference, 64 terms"],
            ["Astronomy · 30 min", "Reading the night sky", "Short, no prerequisites"],
          ].map(([kind, name, foot]) => (
            <article key={name} className="academy-book card glass glass-card">
              <p className="muted small">{kind}</p>
              <h3 className="academy-book-name">{name}</h3>
              <p className="muted small academy-book-foot">{foot}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
