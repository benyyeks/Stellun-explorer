import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { readAcademyProfile, type AcademyProfile } from "@/lib/academy-profile";
import { useStudyWorkspaces } from "@/lib/study-workspace";

/**
 * Your Progress
 * -------------
 * Lives inside the Academy layout shell (sidebar + main).
 * Do not add page-main here — that class is for full-page routes and
 * double-offsets content under the fixed site header.
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
    <div className="academy-progress">
      <header className="academy-progress-hero glass glass-card">
        <span className="eyebrow">Academy</span>
        <h1 className="academy-progress-title">Your Progress</h1>
        <p className="muted">
          Checklist activity from your workspaces and the path you chose at setup.
          Quiz mastery charts will appear here once assessments are live.
        </p>
        <p style={{ marginTop: 12 }}>
          <Link to="/academy" className="btn btn-ghost btn-sm">
            Back to dashboard
          </Link>
        </p>
      </header>

      <section className="academy-metric-grid" aria-label="Summary">
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

      <section className="academy-progress-path">
        <h2 className="academy-sec">Path</h2>
        {!profile?.onboardingComplete ? (
          <p className="muted">
            Complete Academy onboarding from the dashboard to lock in tracks and roles.
          </p>
        ) : (
          <ul className="academy-progress-list">
            <li>
              <strong>Tracks:</strong>{" "}
              {(profile.tracks || []).join(", ") || "—"}
            </li>
            <li>
              <strong>Primary:</strong> {profile.primaryTrack || "—"}
            </li>
            <li>
              <strong>Topics:</strong>{" "}
              {(profile.topics || []).join(", ") || "—"}
            </li>
            <li>
              <strong>Roles:</strong>{" "}
              {(profile.jobs || [])
                .map((j) =>
                  typeof j === "string"
                    ? j
                    : `${(j as { title?: string; rank?: number }).title ?? "Role"}${
                        (j as { rank?: number }).rank
                          ? ` (${(j as { rank?: number }).rank})`
                          : ""
                      }`,
                )
                .join(", ") || "—"}
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
            </Link>{" "}
            to create one.
          </p>
        ) : (
          <ul className="academy-progress-list">
            {workspaces.map((w) => {
              const done = w.checklist.filter((c) => c.done).length;
              const total = w.checklist.length;
              const pct = total ? Math.round((100 * done) / total) : 0;
              return (
                <li key={w.id}>
                  {w.title} — {pct}% checklist ({done}/{total})
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
