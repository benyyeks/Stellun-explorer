import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TRACKS, readAcademyProfile, type AcademyProfile } from "@/lib/academy-profile";
import { useStudyWorkspaces, type StudyWorkspace } from "@/lib/study-workspace";
import { buildDeck, readKnownCards } from "@/lib/workspace-cards";

/**
 * Your Progress
 * -------------
 * Checklist activity, flashcards learned, plans accepted, and the path the
 * student chose at setup. Everything here is read from this browser.
 */

export const Route = createFileRoute("/_authenticated/academy/progress")({
  head: () => ({
    meta: [
      { title: "Your progress · STELLUN Academy" },
      {
        name: "description",
        content: "See what you have covered, what you have learned, and where to go next.",
      },
    ],
  }),
  component: ProgressPage,
});

type Tone = "blue" | "green" | "amber";

function Ring({ value, label, tone }: { value: number; label: string; tone: Tone }) {
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className={`ac-ring ac-ring--${tone}`}>
      <div className="ac-ring-wrap">
        <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
          <circle cx="40" cy="40" r={r} className="ac-ring-track" />
          <circle
            cx="40"
            cy="40"
            r={r}
            className="ac-ring-fill"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - v / 100)}
          />
        </svg>
        <span className="ac-ring-value">{Math.round(v)}%</span>
      </div>
      <span className="ac-ring-label">{label}</span>
    </div>
  );
}

function PathRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="ac-path-row">
      <span className="ac-label">{label}</span>
      <div className="ac-chip-row">
        {items.length === 0 ? (
          <span className="ac-small ac-muted">Not set</span>
        ) : (
          items.map((item) => (
            <span key={item} className="ac-chip-static">
              {item}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function workspaceStats(w: StudyWorkspace, known: string[]) {
  const done = w.checklist.filter((c) => c.done).length;
  const total = w.checklist.length;
  const deck = buildDeck(w, []);
  const learned = deck.filter((c) => known.includes(c.id)).length;
  return {
    done,
    total,
    pct: total ? Math.round((100 * done) / total) : 0,
    deck: deck.length,
    learned,
  };
}

function ProgressPage() {
  const { ready, workspaces } = useStudyWorkspaces();
  const [profile, setProfile] = useState<AcademyProfile | null>(null);
  const [known, setKnown] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setProfile(readAcademyProfile());
  }, []);

  useEffect(() => {
    const map: Record<string, string[]> = {};
    for (const w of workspaces) map[w.id] = readKnownCards(w.id);
    setKnown(map);
  }, [workspaces]);

  const totals = useMemo(() => {
    let done = 0;
    let total = 0;
    let deck = 0;
    let learned = 0;
    let plans = 0;
    for (const w of workspaces) {
      const s = workspaceStats(w, known[w.id] ?? []);
      done += s.done;
      total += s.total;
      deck += s.deck;
      learned += s.learned;
      if (w.planAccepted) plans += 1;
    }
    return {
      done,
      total,
      deck,
      learned,
      plans,
      checklistPct: total ? Math.round((100 * done) / total) : 0,
      cardsPct: deck ? Math.round((100 * learned) / deck) : 0,
      plansPct: workspaces.length ? Math.round((100 * plans) / workspaces.length) : 0,
    };
  }, [workspaces, known]);

  const trackLabel = (id: string) => TRACKS.find((t) => t.id === id)?.label ?? id;

  return (
    <div className="ac-page">
      <header className="ac-hero">
        <div className="ac-hero-copy">
          <span className="ac-kicker">Academy</span>
          <h1 className="ac-title">Your progress</h1>
          <p className="ac-hero-sub">
            What you have covered, what you have learned, and where to go next.
          </p>
          <div className="ac-hero-actions">
            <Link to="/academy/desk" className="ac-btn ac-btn--primary">
              Open Workspaces
            </Link>
            <Link to="/academy/settings" className="ac-btn ac-btn--ghost">
              Edit your path
            </Link>
          </div>
        </div>
        <div className="ac-ring-row" aria-label="Overall progress">
          <Ring value={totals.checklistPct} label="Checklist" tone="blue" />
          <Ring value={totals.cardsPct} label="Cards learned" tone="green" />
          <Ring value={totals.plansPct} label="Plans accepted" tone="amber" />
        </div>
      </header>

      <section className="ac-grid-4" aria-label="Summary">
        <div className="ac-metric ac-metric--blue">
          <span className="ac-metric-value">{ready ? workspaces.length : "—"}</span>
          <span className="ac-metric-label">Workspaces</span>
        </div>
        <div className="ac-metric ac-metric--green">
          <span className="ac-metric-value">{ready ? `${totals.done}/${totals.total}` : "—"}</span>
          <span className="ac-metric-label">Checklist items done</span>
        </div>
        <div className="ac-metric ac-metric--amber">
          <span className="ac-metric-value">{ready ? `${totals.learned}/${totals.deck}` : "—"}</span>
          <span className="ac-metric-label">Cards learned</span>
        </div>
        <div className="ac-metric">
          <span className="ac-metric-value">{profile?.jobs.length ?? 0}</span>
          <span className="ac-metric-label">Roles saved</span>
        </div>
      </section>

      <div className="ac-split-cols">
        <section aria-labelledby="ws-progress-h">
          <div className="ac-section-head">
            <h2 id="ws-progress-h" className="ac-h2">
              Workspaces
            </h2>
            <Link to="/academy/desk" className="ac-link">
              All workspaces
            </Link>
          </div>

          {!ready ? (
            <p className="ac-muted">Loading…</p>
          ) : workspaces.length === 0 ? (
            <p className="ac-empty">
              No workspaces yet. <Link to="/academy/desk" className="ac-link">Create one in Workspaces</Link>.
            </p>
          ) : (
            <div className="ac-wlist">
              {workspaces.map((w) => {
                const s = workspaceStats(w, known[w.id] ?? []);
                return (
                  <article key={w.id} className="ac-card ac-wcard">
                    <div className="ac-wcard-head">
                      <div>
                        <h3 className="ac-wcard-title">{w.title || "Untitled workspace"}</h3>
                        <p className="ac-small ac-muted">{w.bookTitle || "No book named yet"}</p>
                      </div>
                      <span className="ac-chip-static">{w.planAccepted ? "Plan accepted" : "Plan to review"}</span>
                    </div>
                    <div className="ac-wcard-stats">
                      <div>
                        <strong>{s.pct}%</strong>
                        <span className="ac-small ac-muted">checklist</span>
                      </div>
                      <div>
                        <strong>
                          {s.learned}/{s.deck}
                        </strong>
                        <span className="ac-small ac-muted">cards learned</span>
                      </div>
                    </div>
                    <div className="ac-bar">
                      <i style={{ width: `${s.pct}%` }} />
                    </div>
                    <div className="ac-hero-actions" style={{ marginTop: 4 }}>
                      <Link
                        to="/academy/workspace/$workspaceId"
                        params={{ workspaceId: w.id }}
                        className="ac-btn ac-btn--primary ac-btn--sm"
                      >
                        Read
                      </Link>
                      <Link
                        to="/academy/flashcards/$workspaceId"
                        params={{ workspaceId: w.id }}
                        className="ac-btn ac-btn--ghost ac-btn--sm"
                      >
                        Cards
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="path-h">
          <div className="ac-section-head">
            <h2 id="path-h" className="ac-h2">
              Your path
            </h2>
            <Link to="/academy/settings" className="ac-link">
              Edit
            </Link>
          </div>
          <div className="ac-card ac-path">
            {!profile?.onboardingComplete ? (
              <p className="ac-muted">Finish the setup on the dashboard to choose your tracks and roles.</p>
            ) : (
              <>
                <PathRow label="Tracks" items={(profile.tracks ?? []).map(trackLabel)} />
                <PathRow
                  label="Primary track"
                  items={profile.primaryTrack ? [trackLabel(profile.primaryTrack)] : []}
                />
                <PathRow label="Topics" items={profile.topics ?? []} />
                <PathRow label="Roles" items={(profile.jobs ?? []).map((j) => j.label)} />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
