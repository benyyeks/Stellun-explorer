import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  readAcademyProfile,
  TRACKS,
  type AcademyProfile,
  type JobChoice,
} from "@/lib/academy-profile";
import { useStudyWorkspaces } from "@/lib/study-workspace";

/**
 * Your Progress
 * Lives inside the Academy shell — do not use page-main here.
 * JobChoice uses `label` (not title).
 */

export const Route = createFileRoute("/_authenticated/academy/progress")({
  head: () => ({
    meta: [
      { title: "Your Progress · STELLUN Academy" },
      {
        name: "description",
        content: "Track study activity, checklist completion, and path preferences.",
      },
    ],
  }),
  component: ProgressPage,
});

function trackLabel(id: string): string {
  return TRACKS.find((t) => t.id === id)?.label ?? id;
}

function formatJob(j: JobChoice | string): string {
  if (typeof j === "string") return j;
  const name = (j.label || j.jobId || "Role").trim();
  return j.rank ? `${name} (${j.rank})` : name;
}

function ProgressPage() {
  const { workspaces, ready } = useStudyWorkspaces();
  const [profile, setProfile] = useState<AcademyProfile | null>(null);

  useEffect(() => {
    setProfile(readAcademyProfile());
  }, []);

  const itemsDone = workspaces.reduce(
    (n, w) => n + w.checklist.filter((c) => c.done).length,
    0,
  );
  const itemsTotal = workspaces.reduce((n, w) => n + w.checklist.length, 0);

  return (
    <div className="academy-progress">
      <header className="academy-progress-hero glass glass-card">
        <span className="eyebrow">Academy</span>
        <h1 className="academy-progress-title">Your Progress</h1>
        <p className="academy-lede muted">
          Checklist activity from your workspaces and the path you chose at setup.
          Quiz mastery charts appear here once assessments save scores.
        </p>
        <p className="academy-progress-actions">
          <Link to="/academy" className="btn btn-ghost btn-sm">
            Back to dashboard
          </Link>
          <Link to="/academy/desk" className="btn btn-ghost btn-sm">
            Study desk
          </Link>
        </p>
      </header>

      <section className="academy-metric-grid" aria-label="Summary">
        <div className="card glass glass-card academy-metric-card">
          <div className="academy-metric">{ready ? workspaces.length : "—"}</div>
          <div className="academy-metric-label muted">Workspaces</div>
        </div>
        <div className="card glass glass-card academy-metric-card">
          <div className="academy-metric">
            {ready ? `${itemsDone}/${itemsTotal || 0}` : "—"}
          </div>
          <div className="academy-metric-label muted">Checklist done</div>
        </div>
        <div className="card glass glass-card academy-metric-card">
          <div className="academy-metric">{profile?.tracks.length ?? 0}</div>
          <div className="academy-metric-label muted">Tracks</div>
        </div>
        <div className="card glass glass-card academy-metric-card">
          <div className="academy-metric">{profile?.jobs.length ?? 0}</div>
          <div className="academy-metric-label muted">Roles</div>
        </div>
      </section>

      <section className="academy-progress-path">
        <h2 className="academy-sec">Path</h2>
        {!profile?.onboardingComplete ? (
          <p className="muted">
            Complete Academy onboarding from the dashboard to lock in tracks and roles.
          </p>
        ) : (
          <ul className="academy-progress-list">
            <li>
              <span className="academy-k">Tracks</span>
              <span>
                {(profile.tracks || []).map(trackLabel).join(", ") || "—"}
              </span>
            </li>
            <li>
              <span className="academy-k">Primary</span>
              <span>
                {profile.primaryTrack ? trackLabel(profile.primaryTrack) : "—"}
              </span>
            </li>
            <li>
              <span className="academy-k">Topics</span>
              <span>{(profile.topics || []).join(", ") || "—"}</span>
            </li>
            <li>
              <span className="academy-k">Roles</span>
              <span>
                {(profile.jobs || []).map(formatJob).join(", ") || "—"}
              </span>
            </li>
          </ul>
        )}
      </section>

      <section className="academy-progress-path">
        <h2 className="academy-sec">Workspaces</h2>
        {!ready ? (
          <p className="muted">Loading…</p>
        ) : workspaces.length === 0 ? (
          <p className="muted">
            No workspaces yet.{" "}
            <Link to="/academy/desk" className="study-desk-linkish">
              Open Study desk
            </Link>
          </p>
        ) : (
          <ul className="academy-progress-list">
            {workspaces.map((w) => {
              const done = w.checklist.filter((c) => c.done).length;
              const total = w.checklist.length;
              const pct = total ? Math.round((100 * done) / total) : 0;
              return (
                <li key={w.id}>
                  <span className="academy-k">{w.title}</span>
                  <span>
                    {pct}% checklist ({done}/{total})
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
