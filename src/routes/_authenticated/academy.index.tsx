import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  TRACKS,
  TRACK_JOBS,
  TRACK_TOPICS,
  TRACK_TO_TOPIC,
  completeOnboarding,
  readAcademyProfile,
  type AcademyTrackId,
  type JobChoice,
  type AcademyProfile,
} from "@/lib/academy-profile";
import {
  setAskPrefill,
  useStudyWorkspaces,
  type StudyWorkspace,
} from "@/lib/study-workspace";
import { buildDailyTasks } from "@/lib/academy-daily";

/**
 * Academy dashboard
 * -----------------
 * Greeting adapts to first-time vs returning users and live workspaces.
 * Hero runs a one-shot motion sequence, then reveals copy and CTAs.
 * Module cards open or create a workspace for that track.
 * First visit shows a one-time onboarding modal (tracks, jobs, topics).
 *
 * Later stages add quizzes, calendar, and progress analytics on /academy/progress.
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

const MODULE_DEFS: {
  trackId: AcademyTrackId;
  title: string;
  kind: string;
  cover: string;
  defaultTitle: string;
}[] = [
  {
    trackId: "astronomy",
    title: "Introduction to astronomy",
    kind: "Astronomy",
    cover: "academy-cover-astro",
    defaultTitle: "Astronomy · foundations",
  },
  {
    trackId: "aerospace",
    title: "Aerospace engineering",
    kind: "Aerospace",
    cover: "academy-cover-aero",
    defaultTitle: "Aerospace · foundations",
  },
  {
    trackId: "aviation",
    title: "Aviation mechanics",
    kind: "Aviation",
    cover: "academy-cover-av",
    defaultTitle: "Aviation · foundations",
  },
  {
    trackId: "stem",
    title: "STEM foundations",
    kind: "STEM",
    cover: "academy-cover-stem",
    defaultTitle: "STEM · foundations",
  },
];

function workspaceProgress(ws: StudyWorkspace | undefined): number {
  if (!ws || !ws.checklist.length) return 0;
  return Math.round((100 * ws.checklist.filter((c) => c.done).length) / ws.checklist.length);
}

function AcademyDashboard() {
  const navigate = useNavigate();
  const { workspaces, ready, create, acceptPlan } = useStudyWorkspaces();
  const [profile, setProfile] = useState<AcademyProfile | null>(null);
  const [heroPhase, setHeroPhase] = useState(0);
  const [cascade, setCascade] = useState(false);
  const [rotateIdx, setRotateIdx] = useState(0);
  const [onboardOpen, setOnboardOpen] = useState(false);

  // Load profile once on client
  useEffect(() => {
    const p = readAcademyProfile();
    setProfile(p);
    if (!p.onboardingComplete) setOnboardOpen(true);
  }, []);

  // Hero phases: motion → heading → subtext/cta → cascade body
  useEffect(() => {
    const t1 = window.setTimeout(() => setHeroPhase(1), 1100);
    const t2 = window.setTimeout(() => setHeroPhase(2), 1700);
    const t3 = window.setTimeout(() => {
      setHeroPhase(3);
      setCascade(true);
    }, 2400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  const activeWorkspaces = useMemo(
    () => workspaces.filter((w) => w.planAccepted || w.checklist.some((c) => c.done) || w.notes.trim()),
    [workspaces],
  );

  // Rotate among active workspace names for the welcome line
  useEffect(() => {
    if (activeWorkspaces.length < 2) return;
    const id = window.setInterval(() => {
      setRotateIdx((i) => (i + 1) % activeWorkspaces.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [activeWorkspaces.length]);

  const isFirstTime = ready && workspaces.length === 0 && !(profile?.onboardingComplete);
  const hasActive = activeWorkspaces.length > 0;

  const greetingTitle = isFirstTime
    ? "Welcome to STELLUN Academy"
    : "Welcome back to STELLUN";

  const greetingSub = (() => {
    if (isFirstTime || !hasActive) {
      return "Explore Astronomy, Aerospace, Aviation, and STEM tracks. Open a module to start a workspace with a study plan.";
    }
    const name =
      activeWorkspaces[Math.min(rotateIdx, activeWorkspaces.length - 1)]?.title ||
      activeWorkspaces[0]?.title ||
      "your workspace";
    return `Pick up from where you stopped in ${name}`;
  })();

  const openOrCreateModule = (trackId: AcademyTrackId, defaultTitle: string) => {
    const topicId = TRACK_TO_TOPIC[trackId];
    const existing = workspaces.find(
      (w) => w.topicId === topicId || w.title.toLowerCase().includes(trackId),
    );
    if (existing) {
      navigate({ to: "/academy/desk", search: {} });
      return;
    }
    const ws = create({
      title: defaultTitle,
      topicId,
      bookTitle: defaultTitle,
      bookAuthor: "STELLUN track template",
      learningMode: "beginner",
      goals: `Build foundations in ${trackId}`,
    });
    if (ws) {
      acceptPlan(ws.id);
      navigate({ to: "/academy/desk" });
    }
  };

  return (
    <main className={`academy-dash page-main${cascade ? " academy-cascade-on" : ""}`}>
      {/* Hero */}
      <section
        className={`academy-hero card glass glass-card academy-hero-anim phase-${heroPhase}`}
        aria-labelledby="academy-welcome"
      >
        <div className="academy-hero-copy">
          <p className="eyebrow">The Academy</p>
          <h1
            id="academy-welcome"
            className={`academy-hero-title${heroPhase >= 1 ? " is-in" : ""}`}
          >
            {greetingTitle}
          </h1>
          <p className={`tagline academy-hero-sub${heroPhase >= 2 ? " is-in" : ""}`}>
            {greetingSub}
          </p>
          <div className={`academy-hero-actions${heroPhase >= 2 ? " is-in" : ""}`}>
            <Link to="/academy/desk" className="btn btn-primary">
              Open Study desk
            </Link>
            <Link to="/academy/progress" className="btn btn-ghost">
              Your Progress
            </Link>
            <Link to="/ask" className="btn btn-ghost">
              Ask Stellun
            </Link>
          </div>
        </div>

        {/* Phase 1 motion graphic — orbits + craft silhouette, plays once */}
        <div className="academy-hero-art" aria-hidden="true">
          <div className="academy-motion">
            <span className="academy-motion-orbit o1" />
            <span className="academy-motion-orbit o2" />
            <span className="academy-motion-star s1" />
            <span className="academy-motion-star s2" />
            <span className="academy-motion-star s3" />
            <span className="academy-motion-craft" />
            <span className="academy-motion-wing" />
          </div>
        </div>
      </section>

      {/* Stage 3 — Today's tasks */}
      <section className="academy-block" aria-labelledby="today-h">
        <div className="academy-block-head">
          <h2 className="academy-sec" id="today-h">
            Today
          </h2>
          <Link to="/academy/quiz" className="btn btn-ghost btn-sm">
            Quick quiz
          </Link>
        </div>
        <ul className="academy-today-list">
          {buildDailyTasks(workspaces, 5).map((t) => (
            <li key={t.id} className="academy-today-item glass glass-card">
              <span className="academy-today-label">{t.label}</span>
              <span className="muted small">
                {t.source === "checklist"
                  ? t.workspaceTitle || "Checklist"
                  : "Flashcard"}
              </span>
              {t.workspaceId ? (
                <Link to="/academy/desk" className="btn btn-ghost btn-sm">
                  Open desk
                </Link>
              ) : (
                <Link to="/academy/quiz" className="btn btn-ghost btn-sm">
                  Quiz
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Active modules */}
      <section className="academy-block" aria-labelledby="modules-h">
        <div className="academy-row-head">
          <h2 className="academy-sec" id="modules-h">
            Active modules
          </h2>
          <Link to="/academy/desk" className="link">
            Study desk
          </Link>
        </div>
        <div className="academy-module-grid">
          {MODULE_DEFS.map((m) => {
            const topicId = TRACK_TO_TOPIC[m.trackId];
            const match = workspaces.find(
              (w) => w.topicId === topicId || w.title.toLowerCase().includes(m.trackId),
            );
            const pct = workspaceProgress(match);
            return (
              <button
                key={m.trackId}
                type="button"
                className="academy-module card glass glass-card academy-module-btn"
                onClick={() => openOrCreateModule(m.trackId, m.defaultTitle)}
              >
                <div className={`academy-module-cover ${m.cover}`} aria-hidden="true" />
                <div className="academy-module-body">
                  <p className="muted small">{m.kind}</p>
                  <h3 className="academy-module-title">
                    {match?.title || m.title}
                  </h3>
                  <p className="muted small">
                    {match
                      ? `Workspace progress · ${pct}%`
                      : "Start a track workspace"}
                  </p>
                  <div
                    className="academy-bar"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <i style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="academy-split academy-block">
        <section aria-labelledby="today-h">
          <div className="academy-row-head">
            <h2 className="academy-sec" id="today-h">
              Today
            </h2>
          </div>
          <div className="card glass glass-card academy-table-card">
            {workspaces.length === 0 ? (
              <p className="academy-empty muted">
                No tasks yet. Open a module above or create a workspace on the Study desk.
              </p>
            ) : (
              <table className="academy-rows">
                <thead>
                  <tr>
                    <th>Workspace</th>
                    <th>Updated</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.slice(0, 5).map((w) => {
                    const done = w.checklist.filter((c) => c.done).length;
                    const total = w.checklist.length || 0;
                    const status =
                      total > 0 && done === total
                        ? "done"
                        : done > 0
                          ? "now"
                          : "idle";
                    return (
                      <tr key={w.id}>
                        <td>
                          <Link to="/academy/desk" className="academy-task-link">
                            {w.title || "Untitled workspace"}
                          </Link>
                        </td>
                        <td>{formatWhen(w.updatedAt)}</td>
                        <td>
                          <span
                            className={
                              status === "done"
                                ? "academy-status done"
                                : status === "now"
                                  ? "academy-status now"
                                  : "academy-status"
                            }
                          >
                            {status === "done"
                              ? "Checklist complete"
                              : status === "now"
                                ? `${done}/${total} done`
                                : total
                                  ? "Not started"
                                  : "Plan ready"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section aria-labelledby="week-h">
          <div className="academy-row-head">
            <h2 className="academy-sec" id="week-h">
              This week
            </h2>
            <Link to="/academy/progress" className="link">
              Details
            </Link>
          </div>
          <div className="academy-metric-grid">
            <div className="card glass glass-card">
              <div className="academy-metric">{workspaces.length}</div>
              <div className="muted small">Workspaces</div>
            </div>
            <div className="card glass glass-card">
              <div className="academy-metric">
                {workspaces.reduce((n, w) => n + w.checklist.filter((c) => c.done).length, 0)}
              </div>
              <div className="muted small">Checklist items done</div>
            </div>
            <div className="card glass glass-card">
              <div className="academy-metric">
                {profile?.tracks.length ?? 0}
              </div>
              <div className="muted small">Tracks of interest</div>
            </div>
            <div className="card glass glass-card">
              <div className="academy-metric">
                {profile?.jobs.length ?? 0}
              </div>
              <div className="muted small">Roles saved</div>
            </div>
          </div>
        </section>
      </div>

      {onboardOpen && profile && !profile.onboardingComplete && (
        <OnboardingModal
          onClose={() => {
            // Soft dismiss still marks complete so it is one-time; user can
            // edit interests later from Settings / Progress in a future stage.
            setProfile(completeOnboarding({ tracks: [], primaryTrack: null, jobs: [], topics: [] }));
            setOnboardOpen(false);
          }}
          onDone={(next) => {
            setProfile(next);
            setOnboardOpen(false);
          }}
        />
      )}
    </main>
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

/** First-time onboarding — tracks, ranked jobs (max 3 / track), topics. */
function OnboardingModal({
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

  // Primary track is rendered last (encourages scanning others first)
  const orderedTracks = useMemo(() => {
    if (!primary) return TRACKS;
    return [
      ...TRACKS.filter((t) => t.id !== primary),
      ...TRACKS.filter((t) => t.id === primary),
    ];
  }, [primary]);

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
      const without = prev.filter((j) => !(j.trackId === trackId && j.jobId === jobId));
      const sameTrack = without.filter((j) => j.trackId === trackId);
      if (prev.some((j) => j.trackId === trackId && j.jobId === jobId)) {
        return without;
      }
      if (sameTrack.length >= 3) return prev;
      const rank = (sameTrack.length + 1) as 1 | 2 | 3;
      return [...without, { trackId, jobId, label, rank, technical }];
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
    // Soft open: user can open Ask from the header; prefill is waiting.
  };

  const finish = () => {
    const next = completeOnboarding({
      tracks,
      primaryTrack: primary,
      jobs,
      topics,
    });
    onDone(next);
  };

  return (
    <div className="academy-onboard-root" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
      <div className="academy-onboard-card card glass glass-card">
        <div className="academy-onboard-head">
          <h2 id="onboard-title">Set up your Academy path</h2>
          <p className="muted small">
            Shown once. Choices shape future study guides and quizzes. You can refine them later.
          </p>
        </div>

        {step === 0 && (
          <div className="academy-onboard-body">
            <p className="academy-onboard-label">Tracks of interest</p>
            <div className="academy-track-grid">
              {orderedTracks.map((t) => {
                const on = tracks.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`academy-track-card${on ? " is-on" : ""}`}
                    onClick={() => toggleTrack(t.id)}
                    aria-pressed={on}
                  >
                    <strong>{t.label}</strong>
                    <span className="muted small">{t.blurb}</span>
                  </button>
                );
              })}
            </div>
            {tracks.length > 0 && (
              <div className="academy-primary-row">
                <span className="muted small">Primary track (shown last above)</span>
                <select
                  value={primary ?? ""}
                  onChange={(e) =>
                    setPrimary((e.target.value || null) as AcademyTrackId | null)
                  }
                >
                  <option value="">None</option>
                  {tracks.map((id) => (
                    <option key={id} value={id}>
                      {TRACKS.find((t) => t.id === id)?.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="academy-onboard-body">
            <p className="academy-onboard-label">
              Roles of interest · up to 3 per track · color = rank
            </p>
            <div className="academy-job-legend" aria-hidden="true">
              <span className="rank-1">1st</span>
              <span className="rank-2">2nd</span>
              <span className="rank-3">3rd</span>
            </div>
            {(tracks.length ? tracks : (["astronomy"] as AcademyTrackId[])).map((tid) => (
              <div key={tid} className="academy-job-block">
                <h3 className="academy-sec">{TRACKS.find((t) => t.id === tid)?.label}</h3>
                <div className="academy-honeycomb" role="list">
                  {TRACK_JOBS[tid].map((j) => {
                    const r = jobRank(tid, j.id);
                    return (
                      <div key={j.id} className="academy-hex-wrap" role="listitem">
                        <button
                          type="button"
                          className={`academy-hex${r ? ` rank-${r}` : ""}`}
                          onClick={() => rankJob(tid, j.id, j.label, j.technical)}
                          title={j.technical ? "Technical role" : "Non-technical role"}
                        >
                          <span className="academy-hex-label">{j.label}</span>
                          <span className="academy-hex-meta">
                            {j.technical ? "Tech" : "Non-tech"}
                            {r ? ` · ${r}` : ""}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="academy-hex-ask"
                          onClick={() => askAboutJob(j.label)}
                        >
                          Ask
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="academy-onboard-body">
            <p className="academy-onboard-label">Topic categories</p>
            {(tracks.length ? tracks : TRACKS.map((t) => t.id)).map((tid) => (
              <div key={tid} className="academy-topic-block">
                <h3 className="academy-sec">{TRACKS.find((t) => t.id === tid)?.label}</h3>
                <div className="academy-topic-grid">
                  {TRACK_TOPICS[tid].map((topic) => {
                    const on = topics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        className={`academy-topic-chip${on ? " is-on" : ""}`}
                        onClick={() => toggleTopic(topic)}
                        aria-pressed={on}
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

        <div className="academy-onboard-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Skip for now
          </button>
          <div className="academy-onboard-nav">
            {step > 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 0 && tracks.length === 0}
              >
                Continue
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={finish}>
                Save path
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
