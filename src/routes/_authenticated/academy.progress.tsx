import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { readAcademyProfile, type AcademyProfile, TRACKS } from "@/lib/academy-profile";
import { useStudyWorkspaces } from "@/lib/study-workspace";

/**
 * Your Progress
 * -------------
 * Aggregates workspace checklist progress and onboarding profile.
 * Quiz competency series and monthly charts land in Stage 4 of the Academy roadmap.
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
    <main className="academy-dash page-main">
      <section className="page-hero" style={{ paddingInline: 28 }}>
        <span className="eyebrow">Academy</span>
        <h1>Your Progress</h1>
        <p className="tagline">
          Checklist activity from your workspaces and the path you chose at setup.
          Quiz mastery charts will appear here once assessments are live.
        </p>
        <p style={{ marginTop: 12 }}>
          <Link to="/academy" className="btn btn-ghost btn-sm">
            Back to dashboard
          </Link>
        </p>
      </section>

      <section className="academy-metric-grid" style={{ paddingInline: 28, maxWidth: 720 }}>
        <div className="card glass glass-card">
          <div className="academy-metric">{ready ? workspaces.length : "—"}</div>
          <div className="muted small">Workspaces</div>
        </div>
        <div className="card glass glass-card">
          <div className="academy-metric">
            {ready ? `${itemsDone}/${itemsTotal || 0}` : "—"}
          </div>
          <div className="muted small">Checklist items done</div>
        </div>
        <div className="card glass glass-card">
          <div className="academy-metric">{profile?.tracks.length ?? 0}</div>
          <div className="muted small">Tracks selected</div>
        </div>
        <div className="card glass glass-card">
          <div className="academy-metric">{profile?.jobs.length ?? 0}</div>
          <div className="muted small">Roles of interest</div>
        </div>
      </section>

      <section style={{ padding: "24px 28px 48px", maxWidth: 720 }}>
        <h2 className="academy-sec">Path</h2>
        {!profile?.onboardingComplete ? (
          <p className="muted">Complete Academy onboarding from the dashboard to lock in tracks and roles.</p>
        ) : (
          <ul className="academy-progress-list">
            <li>
              <strong>Tracks:</strong>{" "}
              {profile.tracks
                .map((id) => TRACKS.find((t) => t.id === id)?.label ?? id)
                .join(", ") || "—"}
            </li>
            <li>
              <strong>Primary:</strong>{" "}
              {TRACKS.find((t) => t.id === profile.primaryTrack)?.label ?? "—"}
            </li>
            <li>
              <strong>Topics:</strong> {profile.topics.join(", ") || "—"}
            </li>
            <li>
              <strong>Roles:</strong>{" "}
              {profile.jobs
                .map((j) => `${j.label} (${j.rank})`)
                .join(", ") || "—"}
            </li>
          </ul>
        )}

        <h2 className="academy-sec" style={{ marginTop: 28 }}>
          Workspaces
        </h2>
        {workspaces.length === 0 ? (
          <p className="muted">No workspaces yet.</p>
        ) : (
          <ul className="academy-progress-list">
            {workspaces.map((w) => {
              const done = w.checklist.filter((c) => c.done).length;
              const total = w.checklist.length;
              const pct = total ? Math.round((100 * done) / total) : 0;
              return (
                <li key={w.id}>
                  <Link to="/academy/desk">{w.title || "Untitled"}</Link>
                  {" · "}
                  {pct}% checklist ({done}/{total})
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
