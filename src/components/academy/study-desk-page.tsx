/**
 * Study desk — workspaces, terminology, libraries, open workspace.
 * Layout follows STELLUN Academy mockup (desk template): top bar,
 * tabs, recommended shelf, search row, dense table, then open panel.
 * Checklist toggles one row via id + index (legacy-safe).
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { BOOK_TOPICS, BOOKS } from "@/lib/books";
import {
  LEARNING_MODES,
  MAX_WORKSPACES,
  booksForTopic,
  useStudyWorkspaces,
  type LearningMode,
} from "@/lib/study-workspace";
import { TerminologiesTab } from "@/components/academy/terminologies";
import { ResearchLibraryTab } from "@/components/academy/research-library";
import { LearningResourcesTab } from "@/components/academy/learning-resources";
import { RomanHub } from "@/components/academy/roman-hub";
import { StudyUploadPanel } from "@/components/academy/study-upload-panel";

type DeskTab =
  | "workspaces"
  | "terminology"
  | "library"
  | "resources"
  | "roman"
  | "active";

const TABS: { id: DeskTab; label: string }[] = [
  { id: "workspaces", label: "Workspaces" },
  { id: "terminology", label: "Terminology" },
  { id: "library", label: "Research library" },
  { id: "resources", label: "Learning resources" },
  { id: "roman", label: "Roman hub" },
  { id: "active", label: "Open workspace" },
];

const SHELF = [
  { kind: "Astronomy · 25 min", name: "Orbital mechanics primer", foot: "Open in a new workspace" },
  { kind: "Aerospace · 40 min", name: "Hohmann transfer examples", foot: "Open in a new workspace" },
  { kind: "Aviation · 15 min", name: "Cockpit instrument glossary", foot: "Open in a new workspace" },
  { kind: "Astronomy · 30 min", name: "Reading the night sky", foot: "Open in a new workspace" },
] as const;

function formatWhen(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `Today, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (
    d.getFullYear() === y.getFullYear() &&
    d.getMonth() === y.getMonth() &&
    d.getDate() === y.getDate()
  ) {
    return "Yesterday";
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function StudyDeskPage() {
  const {
    ready,
    workspaces,
    create,
    acceptPlan,
    toggleChecklistItem,
    update,
    remove,
    max,
  } = useStudyWorkspaces();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deskTab, setDeskTab] = useState<DeskTab>("workspaces");
  const [query, setQuery] = useState("");

  // New workspace form
  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState(BOOK_TOPICS[0]?.id ?? "orbital-mechanics");
  const [customTopic, setCustomTopic] = useState("");
  const [bookId, setBookId] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [mode, setMode] = useState<LearningMode>("intermediate");
  const [goals, setGoals] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (activeId && workspaces.some((w) => w.id === activeId)) return;
    setActiveId(workspaces[0]?.id ?? null);
  }, [ready, workspaces, activeId]);

  const active = workspaces.find((w) => w.id === activeId) ?? null;

  const progress = active?.checklist.length
    ? Math.round((100 * active.checklist.filter((c) => c.done).length) / active.checklist.length)
    : 0;

  const topicBooks = useMemo(() => booksForTopic(topicId), [topicId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.topicId.toLowerCase().includes(q) ||
        w.bookTitle.toLowerCase().includes(q),
    );
  }, [workspaces, query]);

  const openWorkspace = (id: string) => {
    setActiveId(id);
    setDeskTab("active");
  };

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    const resolvedTopic =
      topicId === "other" ? `custom:${customTopic.trim().slice(0, 80) || "topic"}` : topicId;
    const fromCatalog = topicBooks.find((b) => b.id === bookId);
    const ws = create({
      title: title.trim() || "Untitled workspace",
      topicId: resolvedTopic,
      bookTitle: fromCatalog?.title ?? bookTitle.trim(),
      bookAuthor: fromCatalog?.author ?? bookAuthor.trim(),
      learningMode: mode,
      goals: goals.trim(),
    });
    if (!ws) return;
    setTitle("");
    setGoals("");
    setBookId("");
    setBookTitle("");
    setBookAuthor("");
    setModalOpen(false);
    openWorkspace(ws.id);
  };

  if (!ready) {
    return (
      <div className="study-desk-root">
        <p className="muted">Loading study desk…</p>
      </div>
    );
  }

  return (
    <div className="study-desk-root">
      {/* Top — matches mockup */}
      <div className="study-desk-top">
        <div>
          <h1 className="study-desk-title">Study desk</h1>
          <p className="study-desk-sub muted">
            Your workspaces, courses and reference library, in one place.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setModalOpen(true)}
          disabled={workspaces.length >= max}
        >
          New workspace
        </button>
      </div>

      {/* Tabs */}
      <nav className="study-desk-tabs" aria-label="Study desk sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="study-desk-tab"
            data-active={deskTab === t.id ? "true" : undefined}
            aria-current={deskTab === t.id ? "page" : undefined}
            onClick={() => setDeskTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Workspaces tab */}
      {deskTab === "workspaces" && (
        <div className="study-desk-stack">
          <section aria-labelledby="shelf-heading">
            <div className="study-desk-row-head">
              <h2 id="shelf-heading" className="academy-sec">
                Recommended shelf
              </h2>
            </div>
            <div className="study-shelf">
              {SHELF.map((b) => (
                <button
                  key={b.name}
                  type="button"
                  className="study-shelf-card"
                  onClick={() => setModalOpen(true)}
                >
                  <span className="study-shelf-kind muted small">{b.kind}</span>
                  <span className="study-shelf-name">{b.name}</span>
                  <span className="study-shelf-foot muted small">{b.foot}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="study-desk-toolbar">
            <label className="study-desk-search">
              <span className="sr-only">Search workspaces</span>
              <input
                type="search"
                placeholder="Search workspaces"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <span className="muted small study-desk-count">
              {workspaces.length}/{max} workspaces
            </span>
          </div>

          {filtered.length === 0 ? (
            <p className="muted study-desk-empty">
              No workspaces yet. Create one to generate a plan and checklist.
            </p>
          ) : (
            <div className="study-desk-table-wrap glass glass-card">
              <table className="study-desk-table">
                <thead>
                  <tr>
                    <th>Workspace</th>
                    <th>Subject</th>
                    <th>Last opened</th>
                    <th>Progress</th>
                    <th>
                      <span className="muted">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((w) => {
                    const done = w.checklist.filter((c) => c.done).length;
                    const total = w.checklist.length || 1;
                    const pct = Math.round((100 * done) / total);
                    return (
                      <tr key={w.id}>
                        <td>
                          <button
                            type="button"
                            className="study-desk-linkish"
                            onClick={() => openWorkspace(w.id)}
                          >
                            {w.title}
                          </button>
                        </td>
                        <td className="muted">{w.topicId}</td>
                        <td className="muted">{formatWhen(w.updatedAt)}</td>
                        <td style={{ minWidth: 120 }}>
                          <div className="study-desk-bar" aria-hidden>
                            <i style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td>
                          <div className="study-desk-row-actions">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => openWorkspace(w.id)}
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                if (confirm(`Delete “${w.title}”?`)) {
                                  remove(w.id);
                                  if (activeId === w.id) setActiveId(null);
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted small">
            New workspace opens as a panel so the list stays visible.
          </p>
        </div>
      )}

      {deskTab === "terminology" && <TerminologiesTab />}
      {deskTab === "library" && <ResearchLibraryTab />}
      {deskTab === "resources" && <LearningResourcesTab />}
      {deskTab === "roman" && <RomanHub />}

      {/* Open workspace */}
      {deskTab === "active" && !active && (
        <p className="muted">Select a workspace from the Workspaces tab.</p>
      )}

      {deskTab === "active" && active && (
        <div className="study-desk-active">
          <div className="study-desk-active-head">
            <div>
              <p className="muted small">
                <button
                  type="button"
                  className="study-desk-linkish"
                  onClick={() => setDeskTab("workspaces")}
                >
                  Study desk
                </button>
                {" / "}
                {active.title}
              </p>
              <h2 className="study-desk-active-title">{active.title}</h2>
              <p className="muted small">
                {active.bookTitle}
                {active.bookAuthor ? ` · ${active.bookAuthor}` : ""}
                {" · "}
                checklist {progress}%
              </p>
            </div>
            {!active.planAccepted && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => acceptPlan(active.id)}
              >
                Accept plan
              </button>
            )}
          </div>

          <div className="study-desk-active-grid">
            <div className="study-desk-active-col">
              {!active.planAccepted && (
                <section className="glass glass-card study-desk-panel-block">
                  <h3 className="academy-sec">Study plan</h3>
                  <p className="muted small">Review the plan, then accept to lock the checklist.</p>
                  <ol className="study-plan-list">
                    {active.plan.map((p) => (
                      <li key={p.id}>
                        <strong>{p.title}</strong>
                        <p>{p.detail}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <section className="glass glass-card study-desk-panel-block">
                <h3 className="academy-sec">Notes</h3>
                <textarea
                  className="study-notes"
                  value={active.notes}
                  placeholder="Write notes for this workspace"
                  onChange={(e) => update(active.id, { notes: e.target.value })}
                />
                <label className="study-field">
                  <span>Focus</span>
                  <input
                    value={active.focus}
                    placeholder="What are you working on right now?"
                    onChange={(e) => update(active.id, { focus: e.target.value })}
                  />
                </label>
              </section>

              <StudyUploadPanel workspace={active} />
            </div>

            <div className="study-desk-active-col">
              <section className="glass glass-card study-desk-panel-block">
                <h3 className="academy-sec">Checklist · {progress}%</h3>
                <ul className="study-check-list interactive">
                  {active.checklist.map((c, idx) => (
                    <li key={`${active.id}-${c.id}-${idx}`} className="study-check-item">
                      {/*
                        Use a button, not <label>+checkbox, so a single click
                        cannot fire label default + change in ways that cascade.
                      */}
                      <button
                        type="button"
                        className="study-check-btn"
                        data-done={c.done ? "true" : "false"}
                        aria-pressed={c.done}
                        onClick={() => toggleChecklistItem(active.id, c.id, idx)}
                      >
                        <span className="study-check-box" aria-hidden>
                          {c.done ? "✓" : ""}
                        </span>
                        <span className={c.done ? "study-check-done" : undefined}>{c.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="muted small" style={{ marginTop: 12 }}>
                  If every row used to flip together, open this workspace once more — ids are
                  repaired automatically on load.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="study-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="New workspace"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <form className="study-modal glass glass-card" onSubmit={onCreate}>
            <h2 className="academy-sec">New workspace</h2>
            <label className="study-field">
              <span>Name</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Orbital Mechanics · Week 1"
                required
              />
            </label>
            <label className="study-field">
              <span>Topic</span>
              <select
                value={topicId}
                onChange={(e) => {
                  setTopicId(e.target.value);
                  setBookId("");
                }}
              >
                {BOOK_TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
                <option value="other">Other…</option>
              </select>
            </label>
            {topicId === "other" && (
              <label className="study-field">
                <span>Your topic</span>
                <input
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="Write the topic name"
                />
              </label>
            )}
            {topicBooks.length > 0 && (
              <label className="study-field">
                <span>Book (catalog)</span>
                <select
                  value={bookId}
                  onChange={(e) => {
                    setBookId(e.target.value);
                    const b = topicBooks.find((x) => x.id === e.target.value);
                    if (b) {
                      setBookTitle(b.title);
                      setBookAuthor(b.author);
                    }
                  }}
                >
                  <option value="">Choose or type below</option>
                  {topicBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="study-field">
              <span>Book title</span>
              <input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
            </label>
            <label className="study-field">
              <span>Author</span>
              <input value={bookAuthor} onChange={(e) => setBookAuthor(e.target.value)} />
            </label>
            <fieldset className="study-field">
              <legend>Learning mode</legend>
              {LEARNING_MODES.map((m) => (
                <label key={m.id} className="study-radio">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === m.id}
                    onChange={() => setMode(m.id)}
                  />
                  <span>
                    <strong>{m.label}</strong>
                    <span className="muted small"> — {m.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="study-field">
              <span>Goals (optional)</span>
              <textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                rows={3}
                placeholder="What should this workspace help you finish?"
              />
            </label>
            <div className="study-modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
