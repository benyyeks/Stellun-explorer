import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  TRACKS,
  TRACK_JOBS,
  TRACK_TOPICS,
  TRACK_TO_TOPIC,
  completeOnboarding,
  readAcademyProfile,
  type AcademyProfile,
  type AcademyTrackId,
  type JobChoice,
} from "@/lib/academy-profile";
import {
  setAskPrefill,
  useStudyWorkspaces,
  type LearningMode,
  type StudyWorkspace,
} from "@/lib/study-workspace";
import { buildFocusTasks } from "@/lib/workspace-cards";

/**
 * Academy dashboard
 * -----------------
 * A glance page: where to continue, what is due today, and a summary.
 * Analytics live in Study desk > History.
 * First visit shows a one-time onboarding dialog (tracks, roles, topics).
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

const MODULES: {
  trackId: AcademyTrackId;
  title: string;
  kind: string;
  defaultTitle: string;
}[] = [
  {
    trackId: "astronomy",
    title: "Introduction to Astronomy",
    kind: "Astronomy",
    defaultTitle: "Introduction to Astronomy",
  },
  {
    trackId: "aerospace",
    title: "Introduction to Aerospace",
    kind: "Aerospace",
    defaultTitle: "Introduction to Aerospace",
  },
  {
    trackId: "aviation",
    title: "Introduction to Aviation",
    kind: "Aviation",
    defaultTitle: "Introduction to Aviation",
  },
  {
    trackId: "stem",
    title: "Introduction to STEM",
    kind: "STEM",
    defaultTitle: "Introduction to STEM",
  },
];

const SHELF_ITEMS: {
  kind: string;
  name: string;
  topicId: string;
  mode: LearningMode;
}[] = [
  { kind: "Astronomy · 25 min", name: "Orbital mechanics primer", topicId: "orbital-mechanics", mode: "beginner" },
  { kind: "Aerospace · 40 min", name: "Hohmann transfer examples", topicId: "orbital-mechanics", mode: "intermediate" },
  { kind: "Aviation · 15 min", name: "Cockpit instrument glossary", topicId: "aerodynamics", mode: "beginner" },
  { kind: "Astronomy · 30 min", name: "Reading the night sky", topicId: "orbital-mechanics", mode: "beginner" },
];

function workspaceProgress(ws: StudyWorkspace | undefined): number {
  if (!ws || !ws.checklist.length) return 0;
  return Math.round((100 * ws.checklist.filter((c) => c.done).length) / ws.checklist.length);
}

function findTrackWorkspace(
  workspaces: StudyWorkspace[],
  trackId: AcademyTrackId,
): StudyWorkspace | undefined {
  const topicId = TRACK_TO_TOPIC[trackId];
  return workspaces.find(
    (w) => w.topicId === topicId || w.title.toLowerCase().includes(trackId),
  );
}

function formatWhen(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function OrbitArt() {
  return (
    <svg className="ac-orbit" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="200" cy="200" r="60" />
        <circle cx="200" cy="200" r="120" />
        <circle cx="200" cy="200" r="180" />
        <ellipse cx="200" cy="200" rx="180" ry="70" transform="rotate(-18 200 200)" />
      </g>
      <circle cx="200" cy="200" r="7" fill="currentColor" />
      <circle cx="318" cy="150" r="5" fill="currentColor" />
    </svg>
  );
}

function AcademyDashboard() {
  const navigate = useNavigate();
  const { workspaces, ready, create, acceptPlan } = useStudyWorkspaces();
  const [profile, setProfile] = useState<AcademyProfile | null>(null);
  const [onboardOpen, setOnboardOpen] = useState(false);

  useEffect(() => {
    const p = readAcademyProfile();
    setProfile(p);
    if (!p.onboardingComplete) setOnboardOpen(true);
  }, []);

  const byRecent = useMemo(
    () => [...workspaces].sort((a, b) => b.updatedAt - a.updatedAt),
    [workspaces],
  );
  const latest = byRecent[0];
  const checklistDone = workspaces.reduce(
    (n, w) => n + w.checklist.filter((c) => c.done).length,
    0,
  );
  const tasks = useMemo(() => buildFocusTasks(workspaces, 5), [workspaces]);

  const isFirstTime = ready && workspaces.length === 0 && !profile?.onboardingComplete;
  const greetingTitle = isFirstTime ? "Welcome to STELLUN Academy" : "Welcome back";
  const greetingSub = latest
    ? `Pick up where you stopped in ${latest.title || "your latest workspace"}.`
    : "Explore the Astronomy, Aerospace, Aviation, and STEM tracks. Open an introduction to start a workspace with a study plan.";

  const openTrack = (trackId: AcademyTrackId, defaultTitle: string) => {
    const existing = findTrackWorkspace(workspaces, trackId);
    if (existing) {
      navigate({ to: "/academy/workspace/$workspaceId", params: { workspaceId: existing.id } });
      return;
    }
    const ws = create({
      title: defaultTitle,
      topicId: TRACK_TO_TOPIC[trackId],
      bookTitle: defaultTitle,
      bookAuthor: "STELLUN track template",
      learningMode: "beginner",
      goals: `Build foundations in ${trackId}`,
    });
    if (!ws) {
      navigate({ to: "/academy/desk" });
      return;
    }
    acceptPlan(ws.id);
    navigate({ to: "/academy/workspace/$workspaceId", params: { workspaceId: ws.id } });
  };

  const openShelfItem = (item: (typeof SHELF_ITEMS)[number]) => {
    const ws = create({
      title: item.name,
      topicId: item.topicId,
      bookTitle: item.name,
      bookAuthor: "",
      learningMode: item.mode,
      goals: "",
    });
    if (!ws) {
      navigate({ to: "/academy/desk" });
      return;
    }
    acceptPlan(ws.id);
    navigate({ to: "/academy/workspace/$workspaceId", params: { workspaceId: ws.id } });
  };

  return (
    <div className="ac-page">
      <section className="ac-hero" aria-labelledby="academy-welcome">
        <OrbitArt />
        <div className="ac-hero-copy">
          <span className="ac-kicker">The Academy</span>
          <h1 id="academy-welcome" className="ac-title">
            {greetingTitle}
          </h1>
          <p className="ac-hero-sub">{greetingSub}</p>
          <div className="ac-hero-actions">
            <Link to="/academy/desk" className="ac-btn ac-btn--primary">
              Open Study desk
            </Link>
            <Link to="/academy/progress" className="ac-btn ac-btn--ghost">
              Your progress
            </Link>
            <Link to="/ask" className="ac-btn ac-btn--ghost">
              Ask Stellun
            </Link>
          </div>
        </div>

        {latest ? (
          <div className="ac-continue">
            <span className="ac-small ac-muted">Continue</span>
            <p className="ac-continue-title">{latest.title || "Untitled workspace"}</p>
            <p className="ac-small ac-muted">
              {latest.bookTitle || "No book added yet"}
              {latest.bookAuthor ? ` · ${latest.bookAuthor}` : ""}
            </p>
            <div
              className="ac-bar"
              role="progressbar"
              aria-label="Checklist progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={workspaceProgress(latest)}
            >
              <i style={{ width: `${workspaceProgress(latest)}%` }} />
            </div>
            <Link
              to="/academy/workspace/$workspaceId"
              params={{ workspaceId: latest.id }}
              className="ac-btn ac-btn--primary ac-btn--sm"
              style={{ justifySelf: "start" }}
            >
              Open workspace
            </Link>
          </div>
        ) : (
          <div className="ac-continue">
            <span className="ac-small ac-muted">No workspace yet</span>
            <p className="ac-continue-title">Start with a course</p>
            <p className="ac-small ac-muted">
              Each introduction opens a workspace with a study plan and a checklist.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="courses-h">
        <div className="ac-section-head">
          <h2 id="courses-h" className="ac-h2">
            Introductions to each track
          </h2>
          <Link to="/academy/desk" className="ac-link">
            All in Study desk
          </Link>
        </div>
        <div className="ac-grid-courses">
          {MODULES.map((m) => {
            const match = findTrackWorkspace(workspaces, m.trackId);
            const pct = workspaceProgress(match);
            return (
              <button
                key={m.trackId}
                type="button"
                className="ac-course"
                onClick={() => openTrack(m.trackId, m.defaultTitle)}
              >
                <span className="ac-course-bar" aria-hidden="true" />
                <span className="ac-course-kind">{m.kind}</span>
                <span className="ac-course-title">{match?.title || m.title}</span>
                <span
                  className="ac-bar"
                  role="progressbar"
                  aria-label={`${m.kind} progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                >
                  <i style={{ width: `${pct}%` }} />
                </span>
                <span className="ac-course-foot">
                  {match ? `${pct}% of checklist done` : "Start a workspace"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="focus-h">
        <div className="ac-section-head">
          <h2 id="focus-h" className="ac-h2">
            Focus today
          </h2>
          <Link to="/academy/quiz" className="ac-link">
            Quick quiz
          </Link>
        </div>
        {tasks.length === 0 ? (
          <p className="ac-empty">Nothing due yet. Open a course to get tasks.</p>
        ) : (
          <ul className="ac-task-list">
            {tasks.map((t) => (
              <li key={t.id} className="ac-task">
                <div className="ac-task-body">
                  <span className="ac-task-label">{t.label}</span>
                  <div className="ac-task-meta">
                    <span className={`ac-type ac-type--${t.type.toLowerCase()}`}>{t.type}</span>
                    <span className="ac-small ac-muted">{t.detail}</span>
                  </div>
                </div>
                {t.type === "Quiz" ? (
                  <Link to="/academy/quiz" className="ac-btn ac-btn--primary ac-btn--sm">
                    Start quiz
                  </Link>
                ) : t.type === "Flashcards" && t.workspaceId ? (
                  <Link
                    to="/academy/flashcards/$workspaceId"
                    params={{ workspaceId: t.workspaceId }}
                    className="ac-btn ac-btn--primary ac-btn--sm"
                  >
                    Study cards
                  </Link>
                ) : t.workspaceId ? (
                  <Link
                    to="/academy/workspace/$workspaceId"
                    params={{ workspaceId: t.workspaceId }}
                    className="ac-btn ac-btn--ghost ac-btn--sm"
                  >
                    Open
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="ac-split-cols">
        <section aria-labelledby="recent-h">
          <div className="ac-section-head">
            <h2 id="recent-h" className="ac-h2">
              Recent workspaces
            </h2>
            <Link to="/academy/desk" className="ac-link">
              Study desk
            </Link>
          </div>
          <div className="ac-card ac-card--flush">
            {byRecent.length === 0 ? (
              <p className="ac-empty" style={{ border: 0, borderRadius: 0 }}>
                No workspaces yet. Open a course above to create one.
              </p>
            ) : (
              <div className="ac-table-wrap">
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th scope="col">Workspace</th>
                      <th scope="col">Updated</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byRecent.slice(0, 5).map((w) => {
                      const done = w.checklist.filter((c) => c.done).length;
                      const total = w.checklist.length;
                      const statusClass =
                        total > 0 && done === total
                          ? "ac-status ac-status--done"
                          : done > 0
                            ? "ac-status ac-status--now"
                            : "ac-status";
                      const statusText =
                        total > 0 && done === total
                          ? "Checklist complete"
                          : done > 0
                            ? `${done}/${total} done`
                            : total
                              ? "Not started"
                              : "Plan ready";
                      return (
                        <tr key={w.id}>
                          <td className="ac-table-main" data-label="Workspace">
                            <Link
                              to="/academy/workspace/$workspaceId"
                              params={{ workspaceId: w.id }}
                              className="ac-table-link"
                            >
                              {w.title || "Untitled workspace"}
                            </Link>
                          </td>
                          <td className="ac-table-muted" data-label="Updated">
                            {formatWhen(w.updatedAt)}
                          </td>
                          <td data-label="Status">
                            <span className={statusClass}>{statusText}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="summary-h">
          <div className="ac-section-head">
            <h2 id="summary-h" className="ac-h2">
              Summary
            </h2>
            <Link to="/academy/progress" className="ac-link">
              Details
            </Link>
          </div>
          <div className="ac-grid-2">
            <div className="ac-metric">
              <span className="ac-metric-value">{workspaces.length}</span>
              <span className="ac-metric-label">Workspaces</span>
            </div>
            <div className="ac-metric">
              <span className="ac-metric-value">{checklistDone}</span>
              <span className="ac-metric-label">Checklist items done</span>
            </div>
            <div className="ac-metric">
              <span className="ac-metric-value">{profile?.tracks.length ?? 0}</span>
              <span className="ac-metric-label">Tracks of interest</span>
            </div>
            <div className="ac-metric">
              <span className="ac-metric-value">{profile?.jobs.length ?? 0}</span>
              <span className="ac-metric-label">Roles saved</span>
            </div>
          </div>
        </section>
      </div>

      <section aria-labelledby="shelf-h">
        <div className="ac-section-head">
          <h2 id="shelf-h" className="ac-h2">
            Recommended for you
          </h2>
          <Link to="/academy/desk" className="ac-link">
            See all
          </Link>
        </div>
        <div className="ac-shelf">
          {SHELF_ITEMS.map((item) => (
            <button
              key={item.name}
              type="button"
              className="ac-shelf-card"
              onClick={() => openShelfItem(item)}
            >
              <span className="ac-small ac-muted">{item.kind}</span>
              <span className="ac-shelf-name">{item.name}</span>
              <span className="ac-small ac-muted" style={{ marginTop: "auto" }}>
                Open in a new workspace
              </span>
            </button>
          ))}
        </div>
      </section>

      {onboardOpen && profile && !profile.onboardingComplete && (
        <OnboardingDialog
          onClose={() => {
            // Skipping still marks onboarding complete, so it shows once.
            // Interests can be edited later in Academy settings.
            setProfile(completeOnboarding({ tracks: [], primaryTrack: null, jobs: [], topics: [] }));
            setOnboardOpen(false);
          }}
          onDone={(next) => {
            setProfile(next);
            setOnboardOpen(false);
          }}
        />
      )}
    </div>
  );
}

/** First-time setup: tracks, ranked roles (up to 3 per track), topics. */
function OnboardingDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (p: AcademyProfile) => void;
}) {
  const [step, setStep] = useState(0);
  const [tracks, setTracks] = useState<AcademyTrackId[]>([]);
  const [primary, setPrimary] = useState<AcademyTrackId | null>(null);
  const [jobs, setJobs] = useState<JobChoice[]>([]);
  const [topics, setTopics] = useState<string[]>([]);

  const toggleTrack = (id: AcademyTrackId) => {
    setTracks((prev) => {
      if (prev.includes(id)) {
        if (primary === id) setPrimary(null);
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const rankJob = (trackId: AcademyTrackId, jobId: string, label: string, technical: boolean) => {
    setJobs((prev) => {
      if (prev.some((j) => j.trackId === trackId && j.jobId === jobId)) {
        return prev.filter((j) => !(j.trackId === trackId && j.jobId === jobId));
      }
      const sameTrack = prev.filter((j) => j.trackId === trackId);
      if (sameTrack.length >= 3) return prev;
      const rank = (sameTrack.length + 1) as 1 | 2 | 3;
      return [...prev, { trackId, jobId, label, rank, technical }];
    });
  };

  const jobRank = (trackId: AcademyTrackId, jobId: string) =>
    jobs.find((j) => j.trackId === trackId && j.jobId === jobId)?.rank;

  const toggleTopic = (t: string) => {
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const askAboutJob = (label: string) => {
    setAskPrefill({
      mode: "explain",
      text: `Explain the role “${label}” in plain language: what the day-to-day looks like, useful skills to start building, and how STELLUN Academy tracks relate to it.`,
      autoSend: false,
    });
  };

  const finish = () => {
    onDone(completeOnboarding({ tracks, primaryTrack: primary, jobs, topics }));
  };

  const orderedTracks = primary
    ? [...TRACKS.filter((t) => t.id !== primary), ...TRACKS.filter((t) => t.id === primary)]
    : TRACKS;

  return (
    <div className="ac-modal-backdrop" role="presentation">
      <div className="ac-modal" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
        <div>
          <h2 id="onboard-title" className="ac-h2" style={{ fontSize: "1.25rem" }}>
            Set up your Academy path
          </h2>
          <p className="ac-sub">
            Shown once. Your choices shape study guides and quizzes. You can change them later in
            Academy settings.
          </p>
          <p className="ac-small ac-muted">Step {step + 1} of 3</p>
        </div>

        {step === 0 && (
          <div className="ac-stack">
            <span className="ac-label">Tracks of interest</span>
            <div className="ac-choice-grid">
              {orderedTracks.map((t) => {
                const on = tracks.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="ac-choice"
                    aria-pressed={on}
                    onClick={() => toggleTrack(t.id)}
                  >
                    <strong>{t.label}</strong>
                    <span className="ac-choice-blurb">{t.blurb}</span>
                  </button>
                );
              })}
            </div>
            {tracks.length > 0 && (
              <label className="ac-field">
                <span>Primary track (optional)</span>
                <select
                  className="ac-select"
                  value={primary ?? ""}
                  onChange={(e) => setPrimary((e.target.value || null) as AcademyTrackId | null)}
                >
                  <option value="">None</option>
                  {tracks.map((id) => (
                    <option key={id} value={id}>
                      {TRACKS.find((t) => t.id === id)?.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="ac-stack">
            <span className="ac-label">Roles of interest</span>
            <p className="ac-hint">Pick up to three per track. The number shows your rank.</p>
            {(tracks.length ? tracks : (["astronomy"] as AcademyTrackId[])).map((tid) => (
              <div key={tid} className="ac-stack">
                <h3 className="ac-h2" style={{ fontSize: "1rem" }}>
                  {TRACKS.find((t) => t.id === tid)?.label}
                </h3>
                <div className="ac-chip-row">
                  {TRACK_JOBS[tid].map((j) => {
                    const r = jobRank(tid, j.id);
                    return (
                      <span key={j.id} className="ac-chip-row" style={{ gap: 4 }}>
                        <button
                          type="button"
                          className="ac-chip"
                          aria-pressed={Boolean(r)}
                          title={j.technical ? "Technical role" : "Non-technical role"}
                          onClick={() => rankJob(tid, j.id, j.label, j.technical)}
                        >
                          {j.label}
                          {r ? <span className="ac-rank">{r}</span> : null}
                        </button>
                        <button
                          type="button"
                          className="ac-btn ac-btn--ghost ac-btn--sm"
                          onClick={() => askAboutJob(j.label)}
                        >
                          Ask
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="ac-stack">
            <span className="ac-label">Topics</span>
            {(tracks.length ? tracks : TRACKS.map((t) => t.id)).map((tid) => (
              <div key={tid} className="ac-stack">
                <h3 className="ac-h2" style={{ fontSize: "1rem" }}>
                  {TRACKS.find((t) => t.id === tid)?.label}
                </h3>
                <div className="ac-chip-row">
                  {TRACK_TOPICS[tid].map((topic) => {
                    const on = topics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        className="ac-chip"
                        aria-pressed={on}
                        onClick={() => toggleTopic(topic)}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="ac-modal-actions">
          <button type="button" className="ac-btn ac-btn--ghost" onClick={onClose}>
            Skip for now
          </button>
          {step > 0 && (
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
          {step < 2 ? (
            <button
              type="button"
              className="ac-btn ac-btn--primary"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && tracks.length === 0}
            >
              Continue
            </button>
          ) : (
            <button type="button" className="ac-btn ac-btn--primary" onClick={finish}>
              Save path
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
