import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getDiagnostics,
  getErrorEvents,
  getIsAdmin,
  getSuggestions,
  runFeedRefresh,
  setErrorResolved,
  setSuggestionStatus,
  type ErrorEventRow,
  type FeedCategory,
  type FeedHealth,
  type ManualRefreshResult,
  type SuggestionRow,
} from "@/lib/admin.functions";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Site health | STELLUN" },
      {
        name: "description",
        content: "Live health of every STELLUN data feed, for site administrators.",
      },
      { property: "og:title", content: "Site health | STELLUN" },
      { property: "og:description", content: "Live health of every STELLUN data feed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const CATEGORY_LABEL: Record<FeedCategory, string> = {
  orbital: "Orbital tracking",
  navigation: "Navigation constellations",
  debris: "Debris catalogs",
  "space-weather": "Space weather",
  missions: "Missions & directories",
  other: "Other",
};

const CATEGORY_ORDER: FeedCategory[] = [
  "orbital",
  "navigation",
  "debris",
  "space-weather",
  "missions",
  "other",
];

function integrityBadgeClass(i: FeedHealth["integrity"]) {
  switch (i) {
    case "fresh":
    case "cached":
      return "badge badge-success";
    case "stale":
      return "badge badge-warning";
    case "down":
    case "unknown":
      return "badge badge-danger";
    default:
      return "badge badge-muted";
  }
}

function integrityLabel(i: FeedHealth["integrity"]) {
  switch (i) {
    case "fresh":
      return "Fresh";
    case "cached":
      return "Cached";
    case "stale":
      return "Stale fallback";
    case "down":
      return "Down";
    default:
      return "Unknown";
  }
}

function scoreTone(score: number): "good" | "warn" | "bad" {
  if (score >= 85) return "good";
  if (score >= 60) return "warn";
  return "bad";
}

function AdminPage() {
  const queryClient = useQueryClient();
  const isAdminFn = useServerFn(getIsAdmin);
  const diagFn = useServerFn(getDiagnostics);
  const refreshFn = useServerFn(runFeedRefresh);
  const suggestionsFn = useServerFn(getSuggestions);
  const errorsFn = useServerFn(getErrorEvents);
  const setSuggestionStatusFn = useServerFn(setSuggestionStatus);
  const setErrorResolvedFn = useServerFn(setErrorResolved);

  const role = useQuery({ queryKey: ["is-admin"], queryFn: () => isAdminFn() });
  const diag = useQuery({
    queryKey: ["diagnostics"],
    queryFn: () => diagFn(),
    enabled: role.data?.isAdmin === true,
    refetchInterval: 3000,
  });

  const [refreshNote, setRefreshNote] = useState<ManualRefreshResult | null>(null);
  const [panel, setPanel] = useState<"dashboard" | "suggestions" | "errors">("dashboard");

  const suggestionsQ = useQuery({
    queryKey: ["admin-suggestions"],
    queryFn: () => suggestionsFn(),
    enabled: role.data?.isAdmin === true,
    refetchInterval: 30000,
  });
  const errorsQ = useQuery({
    queryKey: ["admin-errors"],
    queryFn: () => errorsFn(),
    enabled: role.data?.isAdmin === true,
    refetchInterval: 30000,
  });

  const suggestionStatus = useMutation({
    mutationFn: (payload: { id: string; status: "new" | "read" | "done" }) =>
      setSuggestionStatusFn({ data: payload }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-suggestions"] }),
  });
  const errorResolve = useMutation({
    mutationFn: (payload: { id: string; resolved: boolean }) => setErrorResolvedFn({ data: payload }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-errors"] }),
  });

  const refreshMutation = useMutation({
    mutationFn: () => refreshFn(),
    onSuccess: (result) => {
      setRefreshNote(result);
      void queryClient.invalidateQueries({ queryKey: ["diagnostics"] });
    },
    onError: (err) => {
      setRefreshNote({
        ok: false,
        feeds: 0,
        failed: 0,
        failedNames: [],
        durationMs: 0,
        message: err instanceof Error ? err.message : "Refresh failed.",
      });
    },
  });

  if (role.isPending) {
    return (
      <main className="page-main">
        <div className="container py-16">
          <p className="mono text-muted">Checking access…</p>
        </div>
      </main>
    );
  }

  if (!role.data?.isAdmin) {
    return (
      <main className="page-main">
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">Administration</span>
            <h1>Site health</h1>
            <p className="tagline text-muted">This page is for site administrators.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
              Back to home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const summary = diag.data?.summary;
  const feeds = diag.data?.feeds ?? [];
  const problems = diag.data?.problemFeeds ?? [];
  const quota = diag.data?.quota ?? [];

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: feeds.filter((f) => f.category === cat),
  })).filter((g) => g.items.length > 0);

  const refreshing = refreshMutation.isPending;

  return (
    <main className="page-main admin-page">
      <section className="page-hero">
        <div className="container">
          <div className="admin-hero-row">
            <div>
              <span className="eyebrow">Administration</span>
              <h1>Site health</h1>
              <p className="tagline">
                Quantity, quality, integrity, and strength of every scheduled data feed.
                Visitors read from cache; this panel watches the refresh path that fills it.
              </p>
              <p className="text-muted" style={{ marginTop: 8, fontSize: "0.9rem" }}>
                {diag.data?.lastCycle
                  ? `Last recorded cycle ${timeAgo(new Date(diag.data.lastCycle))}.`
                  : "Waiting for the first refresh cycle."}
                {diag.isFetching ? " Updating…" : ""}
              </p>
            </div>
            <div className="admin-hero-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={refreshing}
                onClick={() => {
                  setRefreshNote(null);
                  refreshMutation.mutate();
                }}
              >
                {refreshing ? "Refreshing feeds…" : "Refresh all feeds now"}
              </button>
              <p className="text-faint" style={{ fontSize: "0.78rem", margin: "8px 0 0", maxWidth: 220 }}>
                Runs a full cycle immediately. Use when feeds are down or stale; heavy
                catalogs may take up to a minute.
              </p>
            </div>
          </div>

          {refreshNote ? (
            <div
              className={`glass glass-card admin-refresh-note ${refreshNote.ok ? "admin-note-ok" : "admin-note-warn"}`}
              role="status"
            >
              <span className={`badge ${refreshNote.ok ? "badge-success" : "badge-warning"}`}>
                {refreshNote.ok ? "Refresh complete" : "Refresh finished with issues"}
              </span>
              <p style={{ margin: "10px 0 0" }}>{refreshNote.message}</p>
              {refreshNote.failedNames.length > 0 ? (
                <p className="mono text-muted" style={{ margin: "8px 0 0", fontSize: "0.8rem" }}>
                  Still failing: {refreshNote.failedNames.join(", ")}
                </p>
              ) : null}
              {refreshNote.durationMs > 0 ? (
                <p className="text-faint" style={{ margin: "6px 0 0", fontSize: "0.78rem" }}>
                  Took {refreshNote.durationMs} ms · {refreshNote.feeds} feeds in cycle
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <div className="container">
          <nav className="admin-panels" aria-label="Admin sections">
            {(
              [
                ["dashboard", "Dashboard"],
                ["suggestions", "Suggestions"],
                ["errors", "Errors"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="admin-panel-tab"
                data-active={panel === id ? "true" : undefined}
                aria-current={panel === id ? "page" : undefined}
                onClick={() => setPanel(id)}
              >
                {label}
                {id === "suggestions" && suggestionsQ.data?.items
                  ? ` (${suggestionsQ.data.items.filter((s: SuggestionRow) => s.status === "new").length})`
                  : ""}
                {id === "errors" && errorsQ.data?.items
                  ? ` (${errorsQ.data.items.filter((e: ErrorEventRow) => !e.resolved).length})`
                  : ""}
              </button>
            ))}
          </nav>

          {panel === "suggestions" && (
            <section className="admin-inbox" aria-label="User suggestions">
              <div className="glass glass-card scaffold-card" style={{ marginBottom: 16 }}>
                <h2 style={{ marginTop: 0 }}>Suggestions</h2>
                <p className="text-muted" style={{ marginBottom: 0 }}>
                  Feature ideas, bug reports, and data concerns submitted by signed-in users.
                </p>
              </div>
              {suggestionsQ.isPending && <p className="text-muted">Loading suggestions…</p>}
              {suggestionsQ.isError && (
                <p className="text-muted">Could not load suggestions. Confirm the site_suggestions table exists.</p>
              )}
              {!suggestionsQ.isPending && (suggestionsQ.data?.items?.length ?? 0) === 0 && (
                <div className="glass glass-card"><p className="text-muted" style={{ margin: 0 }}>No suggestions yet.</p></div>
              )}
              <ul className="admin-inbox-list">
                {(suggestionsQ.data?.items ?? []).map((s: SuggestionRow) => (
                  <li key={s.id} className="glass glass-card admin-inbox-item">
                    <div className="admin-inbox-head">
                      <span className="badge badge-muted">{s.type}</span>
                      <span className={`badge ${s.status === "new" ? "badge-warning" : s.status === "done" ? "badge-success" : "badge-muted"}`}>
                        {s.status}
                      </span>
                      <span className="text-faint mono" style={{ fontSize: "0.78rem" }}>{timeAgo(new Date(s.createdAt))}</span>
                    </div>
                    <p style={{ margin: "10px 0", whiteSpace: "pre-wrap" }}>{s.message}</p>
                    <p className="text-faint" style={{ fontSize: "0.82rem", margin: "0 0 10px" }}>
                      {[s.name, s.email].filter(Boolean).join(" · ") || "Anonymous user"}
                    </p>
                    <div className="admin-inbox-actions">
                      {s.status !== "read" && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => suggestionStatus.mutate({ id: s.id, status: "read" })}>
                          Mark read
                        </button>
                      )}
                      {s.status !== "done" && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => suggestionStatus.mutate({ id: s.id, status: "done" })}>
                          Mark done
                        </button>
                      )}
                      {s.status !== "new" && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => suggestionStatus.mutate({ id: s.id, status: "new" })}>
                          Reopen
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {panel === "errors" && (
            <section className="admin-inbox" aria-label="Error notifications">
              <div className="glass glass-card scaffold-card" style={{ marginBottom: 16 }}>
                <h2 style={{ marginTop: 0 }}>Error notifications</h2>
                <p className="text-muted" style={{ marginBottom: 0 }}>
                  Client and app-reported failures: what happened, where, and when.
                </p>
              </div>
              {errorsQ.isPending && <p className="text-muted">Loading errors…</p>}
              {errorsQ.isError && (
                <p className="text-muted">Could not load errors. Confirm the site_error_events table exists.</p>
              )}
              {!errorsQ.isPending && (errorsQ.data?.items?.length ?? 0) === 0 && (
                <div className="glass glass-card"><p className="text-muted" style={{ margin: 0 }}>No error events recorded yet.</p></div>
              )}
              <ul className="admin-inbox-list">
                {(errorsQ.data?.items ?? []).map((e: ErrorEventRow) => (
                  <li key={e.id} className={`glass glass-card admin-inbox-item${e.resolved ? "" : " admin-inbox-open"}`}>
                    <div className="admin-inbox-head">
                      <span className="badge badge-muted">{e.source}</span>
                      <span className={`badge ${e.resolved ? "badge-success" : "badge-danger"}`}>
                        {e.resolved ? "resolved" : "open"}
                      </span>
                      <span className="text-faint mono" style={{ fontSize: "0.78rem" }}>{timeAgo(new Date(e.createdAt))}</span>
                    </div>
                    <p style={{ margin: "10px 0", fontWeight: 600 }}>{e.message}</p>
                    {e.path && <p className="mono text-faint" style={{ fontSize: "0.8rem", margin: "0 0 6px" }}>{e.path}</p>}
                    {e.detail && <p className="text-muted" style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{e.detail}</p>}
                    <div className="admin-inbox-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => errorResolve.mutate({ id: e.id, resolved: !e.resolved })}
                      >
                        {e.resolved ? "Reopen" : "Mark resolved"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {panel === "dashboard" && (
          <>
          <div className="grid grid-4 admin-score-grid">
            <ScoreCard label="Overall" score={summary?.overallScore ?? 0} hint="Strength, integrity, and quality combined" />
            <ScoreCard label="Strength" score={summary?.strengthScore ?? 0} hint="Feeds still able to serve data" />
            <ScoreCard label="Integrity" score={summary?.integrityScore ?? 0} hint="Fresh or cached preferred over stale or down" />
            <ScoreCard label="Quality" score={summary?.qualityScore ?? 0} hint="Success rate over the last hour" />
          </div>

          <div className="grid grid-4 admin-stat-grid" style={{ marginTop: 14 }}>
            <Stat label="Feeds monitored" value={String(summary?.totalFeeds ?? 0)} />
            <Stat label="Healthy now" value={String(summary?.healthy ?? 0)} tone="good" />
            <Stat
              label="Problems"
              value={String(summary?.problems ?? 0)}
              tone={summary && summary.problems > 0 ? "bad" : undefined}
            />
            <Stat
              label="Stale fallback"
              value={String(summary?.stale ?? 0)}
              tone={summary && summary.stale > 0 ? "warn" : undefined}
            />
            <Stat
              label="Down · no data"
              value={String(summary?.down ?? 0)}
              tone={summary && summary.down > 0 ? "bad" : undefined}
            />
            <Stat label="Checks · last hour" value={String(summary?.checksLastHour ?? 0)} />
            <Stat
              label="Avg response"
              value={summary?.avgDurationMs != null ? `${summary.avgDurationMs} ms` : "—"}
            />
            <Stat
              label="Hourly success"
              value={summary ? `${Math.round(summary.avgOkRate * 100)}%` : "—"}
            />
          </div>

          {quota.map((q) => (
            <div key={q.provider} className="glass glass-card admin-quota" style={{ marginTop: 16 }}>
              <div>
                <span className="eyebrow">{q.provider} hourly quota</span>
                <p className="mono" style={{ fontSize: "1.6rem", margin: "6px 0 0" }}>
                  {q.remaining ?? "?"}{" "}
                  <span className="text-muted" style={{ fontSize: "0.95rem", fontFamily: "var(--font-body)" }}>
                    of {q.rateLimit ?? "?"} calls left
                  </span>
                </p>
              </div>
              <p className="text-muted" style={{ fontSize: "0.88rem", margin: 0, maxWidth: "42ch" }}>
                Last read {timeAgo(new Date(q.checkedAt))}. Resets hourly. Visitor traffic does
                not spend this quota; the scheduled refresh and manual refresh do.
              </p>
            </div>
          ))}

          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", marginBottom: 12 }}>
              Where the problems are
            </h2>
            {problems.length === 0 ? (
              <div className="glass glass-card">
                <span className="badge badge-success">All clear</span>
                <p style={{ margin: "12px 0 0" }}>
                  All monitored feeds are healthy. No stale fallbacks or hard failures in the
                  latest check for each feed.
                </p>
              </div>
            ) : (
              <div className="admin-problem-list">
                {problems.map((f) => (
                  <article key={f.feed} className="glass glass-card admin-problem">
                    <header className="admin-problem-head">
                      <div>
                        <span className="eyebrow">{CATEGORY_LABEL[f.category]}</span>
                        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", margin: "4px 0" }}>
                          {f.label}
                        </h3>
                        <p className="mono text-faint" style={{ fontSize: "0.75rem", margin: 0 }}>
                          {f.feed}
                        </p>
                      </div>
                      <span className={integrityBadgeClass(f.integrity)}>{integrityLabel(f.integrity)}</span>
                    </header>
                    <dl className="admin-problem-meta">
                      <div>
                        <dt>Last check</dt>
                        <dd>{timeAgo(new Date(f.checkedAt))}</dd>
                      </div>
                      <div>
                        <dt>Response</dt>
                        <dd className="mono">{f.durationMs != null ? `${f.durationMs} ms` : "—"}</dd>
                      </div>
                      <div>
                        <dt>Success · 1h</dt>
                        <dd className="mono">
                          {Math.round(f.okRate * 100)}% of {f.runs}
                        </dd>
                      </div>
                      <div>
                        <dt>Source</dt>
                        <dd className="mono">{f.source ?? "none"}</dd>
                      </div>
                    </dl>
                    <div className="admin-cause">
                      <span className="eyebrow">Likely cause</span>
                      <p style={{ margin: "6px 0 0" }}>
                        {f.cause ?? f.error ?? "No diagnostic detail was recorded for this failure."}
                      </p>
                      {f.error && f.cause !== f.error ? (
                        <p className="mono text-faint" style={{ margin: "8px 0 0", fontSize: "0.75rem" }}>
                          Raw: {f.error}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ marginTop: 12 }}
                        disabled={refreshing}
                        onClick={() => {
                          setRefreshNote(null);
                          refreshMutation.mutate();
                        }}
                      >
                        {refreshing ? "Refreshing…" : "Retry all feeds now"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", marginBottom: 8 }}>
              All feeds by system
            </h2>
            <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: 18, maxWidth: "62ch" }}>
              Latest check per feed in the last hour. Heavy catalogs only contact upstream when
              their multi-hour TTL expires; other cycles show as healthy cached hits.
            </p>

            {byCategory.map(({ cat, items }) => (
              <div key={cat} style={{ marginBottom: 22 }}>
                <h3 className="eyebrow" style={{ marginBottom: 8 }}>
                  {CATEGORY_LABEL[cat]}
                </h3>
                <div className="glass admin-table-shell">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Feed</th>
                        <th>Status</th>
                        <th>Integrity</th>
                        <th>Last check</th>
                        <th>Response</th>
                        <th>Success · 1h</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((f) => (
                        <tr key={f.feed} className={!f.ok ? "admin-row-bad" : undefined}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{f.label}</div>
                            <div className="mono text-faint" style={{ fontSize: "0.72rem" }}>
                              {f.feed}
                            </div>
                          </td>
                          <td>
                            <span
                              className="admin-dot"
                              style={{
                                background: f.ok ? "var(--color-success)" : "var(--color-danger)",
                              }}
                              aria-hidden
                            />
                            {f.ok ? "Healthy" : "Problem"}
                          </td>
                          <td>
                            <span className={integrityBadgeClass(f.integrity)}>
                              {integrityLabel(f.integrity)}
                            </span>
                          </td>
                          <td>{timeAgo(new Date(f.checkedAt))}</td>
                          <td className="mono">{f.durationMs != null ? `${f.durationMs} ms` : "—"}</td>
                          <td className="mono">
                            {Math.round(f.okRate * 100)}% · {f.runs}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {feeds.length === 0 && (
              <div className="glass glass-card">
                <p className="text-muted" style={{ margin: 0 }}>
                  No checks recorded in the last hour. Confirm the scheduler calls{" "}
                  <span className="mono">/api/public/refresh</span> with a valid token, or use{" "}
                  <strong>Refresh all feeds now</strong> above.{" "}
                  <span className="mono">SUPABASE_SERVICE_ROLE_KEY</span> must be set for cache
                  and diagnostics writes.
                </p>
              </div>
            )}
          </div>

          <p className="text-faint" style={{ marginTop: 36, fontSize: "0.82rem" }}>
            News uses a separate daily path (<span className="mono">/api/public/refresh-news</span>
            ) and does not appear in this cycle table.
          </p>
          </>
          )}
        </div>
      </section>

      <style>{`
        .admin-page .admin-hero-row {
          display: flex;
          flex-wrap: wrap;
          gap: 24px 40px;
          justify-content: space-between;
          align-items: flex-start;
        }
        .admin-page .admin-hero-actions {
          flex-shrink: 0;
          padding-top: 8px;
        }
        .admin-page .admin-refresh-note {
          margin-top: 20px;
        }
        .admin-page .admin-note-ok {
          border-color: color-mix(in srgb, var(--color-success) 35%, var(--color-border));
        }
        .admin-page .admin-note-warn {
          border-color: color-mix(in srgb, var(--color-warning) 40%, var(--color-border));
        }
        .admin-page .admin-score-card,
        .admin-page .admin-stat {
          padding: 16px 18px;
        }
        .admin-page .admin-score-card[data-tone="good"] {
          border-color: color-mix(in srgb, var(--color-success) 40%, var(--color-border));
        }
        .admin-page .admin-score-card[data-tone="warn"] {
          border-color: color-mix(in srgb, var(--color-warning) 45%, var(--color-border));
        }
        .admin-page .admin-score-card[data-tone="bad"] {
          border-color: color-mix(in srgb, var(--color-danger) 45%, var(--color-border));
        }
        .admin-page .admin-score-value {
          font-family: var(--font-mono);
          font-size: 1.85rem;
          line-height: 1.15;
          margin: 6px 0 0;
          color: var(--color-text);
        }
        .admin-page .admin-stat-value {
          font-family: var(--font-mono);
          font-size: 1.35rem;
          margin: 6px 0 0;
          color: var(--color-text);
        }
        .admin-page .admin-stat[data-tone="good"] .admin-stat-value { color: var(--color-success); }
        .admin-page .admin-stat[data-tone="warn"] .admin-stat-value { color: var(--color-warning); }
        .admin-page .admin-stat[data-tone="bad"] .admin-stat-value { color: var(--color-danger); }
        .admin-page .admin-quota {
          display: flex;
          flex-wrap: wrap;
          gap: 16px 28px;
          align-items: baseline;
        }
        .admin-page .admin-problem-list {
          display: grid;
          gap: 12px;
        }
        .admin-page .admin-problem-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 14px;
        }
        .admin-page .admin-problem-meta {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin: 0 0 14px;
        }
        @media (max-width: 700px) {
          .admin-page .admin-problem-meta {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        .admin-page .admin-problem-meta dt {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-text-faint);
          font-family: var(--font-mono);
        }
        .admin-page .admin-problem-meta dd {
          margin: 3px 0 0;
          font-size: 0.9rem;
          color: var(--color-text);
        }
        .admin-page .admin-cause {
          border-top: 1px solid var(--color-border);
          padding-top: 12px;
        }
        .admin-page .admin-table-shell {
          overflow-x: auto;
          padding: 0;
        }
        .admin-page .admin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .admin-page .admin-table th {
          text-align: left;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-text-faint);
          font-family: var(--font-mono);
          font-weight: 600;
          padding: 12px 14px;
          border-bottom: 1px solid var(--color-border);
        }
        .admin-page .admin-table td {
          padding: 12px 14px;
          border-top: 1px solid var(--color-border);
          vertical-align: top;
          color: var(--color-text);
        }
        .admin-page .admin-row-bad {
          background: color-mix(in srgb, var(--color-danger) 6%, transparent);
        }
        
        .admin-page .admin-panels {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          margin: 0 0 22px;
          border-bottom: 1px solid var(--color-border);
          scrollbar-width: none;
        }
        .admin-page .admin-panel-tab {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 10px 14px;
          font: inherit;
          font-size: 0.9rem;
          color: var(--color-text-muted);
          cursor: pointer;
          margin-bottom: -1px;
        }
        .admin-page .admin-panel-tab:hover { color: var(--color-text); }
        .admin-page .admin-panel-tab[data-active="true"] {
          color: var(--color-accent);
          font-weight: 600;
          border-bottom-color: var(--color-accent);
        }
        .admin-page .admin-inbox-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 12px;
        }
        .admin-page .admin-inbox-item { padding: 14px 16px; }
        .admin-page .admin-inbox-open {
          border-color: color-mix(in srgb, var(--color-danger) 28%, var(--color-border));
        }
        .admin-page .admin-inbox-head {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .admin-page .admin-inbox-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
        .admin-page .admin-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 8px;
          vertical-align: middle;
        }
      `}</style>
    </main>
  );
}

function ScoreCard({
  label,
  score,
  hint,
}: {
  label: string;
  score: number;
  hint: string;
}) {
  const tone = scoreTone(score);
  return (
    <div className="glass glass-card admin-score-card" data-tone={tone}>
      <span className="eyebrow">{label}</span>
      <p className="admin-score-value">{score}</p>
      <p className="text-muted" style={{ margin: "8px 0 0", fontSize: "0.8rem" }}>
        {hint}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad" | undefined;
}) {
  return (
    <div className="glass glass-card admin-stat" data-tone={tone}>
      <span className="eyebrow">{label}</span>
      <p className="admin-stat-value">{value}</p>
    </div>
  );
}
