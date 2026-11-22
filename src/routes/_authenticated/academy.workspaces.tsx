import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LEARNING_MODES, MAX_WORKSPACES, useStudyWorkspaces } from "@/lib/study-workspace";
import { WORKSPACE_TEMPLATES, templateBooks, type WorkspaceTemplate } from "@/lib/workspace-recommendations";
import { TRACK_NAME } from "@/lib/book-catalog";
import { BOOK_TOPICS } from "@/lib/books";

/**
 * Workspaces
 * ----------
 * Every workspace you have, plus recommended workspaces you can start in one tap.
 * Opening a workspace goes to its reader. The study desk still manages them all.
 */

export const Route = createFileRoute("/_authenticated/academy/workspaces")({
  head: () => ({
    meta: [
      { title: "Workspaces · STELLUN Academy" },
      { name: "description", content: "All your study workspaces, and recommended workspaces to start from." },
    ],
  }),
  component: WorkspacesPage,
});

const topicLabel = (id: string) => BOOK_TOPICS.find((t) => t.id === id)?.label ?? id;
const modeLabel = (id: string) => LEARNING_MODES.find((m) => m.id === id)?.label ?? id;
const GROUP_ORDER: (WorkspaceTemplate["track"])[] = ["aviation", "aerospace", "astronomy", "stem", "general"];
const GROUP_NAME: Record<string, string> = { ...TRACK_NAME, general: "General reading" };

function WorkspacesPage() {
  const { workspaces, create, ready } = useStudyWorkspaces();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspaces.filter((w) => !q || `${w.title} ${w.bookTitle} ${topicLabel(w.topicId)}`.toLowerCase().includes(q));
  }, [workspaces, query]);

  const grouped = useMemo(
    () => GROUP_ORDER.map((track) => ({ track, items: WORKSPACE_TEMPLATES.filter((t) => t.track === track) })).filter((g) => g.items.length > 0),
    [],
  );

  const start = (t: WorkspaceTemplate) => {
    const first = templateBooks(t)[0];
    const ws = create({
      title: t.title,
      topicId: t.topicId,
      bookTitle: first?.title ?? "",
      bookAuthor: first?.authors ?? "",
      learningMode: t.learningMode,
      goals: t.goals,
    });
    if (!ws) {
      setMessage(`You already have ${MAX_WORKSPACES} workspaces. Remove one in the Study desk to add another.`);
      return;
    }
    navigate({ to: "/academy/workspace/$workspaceId", params: { workspaceId: ws.id } });
  };

  return (
    <div className="ac-page">
      <header className="ac-hero">
        <div className="ac-hero-copy">
          <span className="ac-kicker">Academy</span>
          <h1 className="ac-title">Workspaces</h1>
          <p className="ac-hero-sub">Your study workspaces, and recommended ones to start from. Open a workspace to read, or use the study desk to manage them.</p>
        </div>
      </header>

      <div className="pr-actions">
        <Link to="/academy/desk" className="btn">Open the study desk</Link>
        <Link to="/academy/shelf" className="btn">Browse the book shelf</Link>
      </div>

      <section className="ac-stack" aria-labelledby="your-ws">
        <h2 id="your-ws" className="ac-h2">Your workspaces</h2>
        <label className="ac-search">
          <span className="ac-sr-only">Search your workspaces</span>
          <input className="ac-input" type="search" placeholder="Search your workspaces" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {!ready ? (
          <p className="ac-muted">Loading your workspaces…</p>
        ) : filtered.length === 0 ? (
          <p className="ac-empty">{workspaces.length === 0 ? "No workspaces yet. Start one from the recommended list below." : "No workspaces match your search."}</p>
        ) : (
          <ul className="ac-stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {filtered.map((w) => {
              const done = w.checklist.filter((c) => c.done).length;
              return (
                <li key={w.id} className="ac-card">
                  <h3 className="ac-h2" style={{ margin: 0 }}>{w.title}</h3>
                  <p className="ac-small ac-muted" style={{ margin: "4px 0 0" }}>
                    {topicLabel(w.topicId)} · {modeLabel(w.learningMode)} · checklist {done} of {w.checklist.length}
                    {w.bookTitle ? ` · ${w.bookTitle}` : ""}
                  </p>
                  <div className="pr-actions" style={{ marginTop: 10 }}>
                    <Link to="/academy/workspace/$workspaceId" params={{ workspaceId: w.id }} className="btn btn-primary">Open</Link>
                    <Link to="/academy/flashcards/$workspaceId" params={{ workspaceId: w.id }} className="btn">Flashcards</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="ac-stack" aria-labelledby="rec-ws">
        <h2 id="rec-ws" className="ac-h2">Recommended workspaces</h2>
        <p className="ac-small ac-muted" style={{ margin: 0 }}>Each one opens with books from the shelf. You have {workspaces.length} of {MAX_WORKSPACES}.</p>
        {message ? <p className="ac-error" role="alert">{message}</p> : null}
        {grouped.map((g) => (
          <div key={g.track} className="ac-stack">
            <h3 className="ac-small" style={{ textTransform: "uppercase", letterSpacing: "0.08em", margin: "8px 0 0" }}>{GROUP_NAME[g.track]}</h3>
            <ul className="ac-stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {g.items.map((t) => (
                <li key={t.id} className="ac-card">
                  <h4 className="ac-h2" style={{ margin: 0 }}>{t.title}</h4>
                  <p className="ac-small" style={{ margin: "4px 0 6px" }}>{t.blurb}</p>
                  <p className="ac-small ac-muted" style={{ margin: "0 0 8px" }}>
                    {modeLabel(t.learningMode)} · Books:{" "}
                    {templateBooks(t).map((b, i) => (
                      <span key={b.id}>
                        {i > 0 ? ", " : ""}
                        <Link to="/academy/books/$bookId" params={{ bookId: b.id }}>{b.title}</Link>
                      </span>
                    ))}
                  </p>
                  <div className="pr-actions">
                    <button type="button" className="btn btn-primary" onClick={() => start(t)}>Start this workspace</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
