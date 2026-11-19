/**
 * Study desk: the Academy's hub.
 * Workspaces (shelf, search, list), Courses, reference tabs (terminology,
 * research library, learning resources, Roman hub), and History.
 * Opening a workspace goes to its reader page.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BOOK_TOPICS } from "@/lib/books";
import {
  LEARNING_MODES,
  booksForTopic,
  useStudyWorkspaces,
  type LearningMode,
  type StudyWorkspace,
} from "@/lib/study-workspace";
import { TRACKS, TRACK_TO_TOPIC, type AcademyTrackId } from "@/lib/academy-profile";
import { TerminologiesTab } from "@/components/academy/terminologies";
import { ResearchLibraryTab } from "@/components/academy/research-library";
import { LearningResourcesTab } from "@/components/academy/learning-resources";
import { RomanHub } from "@/components/academy/roman-hub";

type DeskTab =
  | "workspaces"
  | "courses"
  | "terminology"
  | "library"
  | "resources"
  | "roman"
  | "history";

const TABS: { id: DeskTab; label: string }[] = [
  { id: "workspaces", label: "Workspaces" },
  { id: "courses", label: "Courses" },
  { id: "terminology", label: "Terminology" },
  { id: "library", label: "Research library" },
  { id: "resources", label: "Learning resources" },
  { id: "roman", label: "Roman hub" },
  { id: "history", label: "History" },
];

const SHELF: {
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

const COURSE_DEFAULT_TITLE: Record<AcademyTrackId, string> = {
  astronomy: "Astronomy · foundations",
  aerospace: "Aerospace · foundations",
  aviation: "Aviation · foundations",
  stem: "STEM · foundations",
};

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
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function subjectLabel(topicId: string): string {
  const found = BOOK_TOPICS.find((t) => t.id === topicId);
  return found?.label ?? topicId.replace(/^custom:/, "");
}

function workspaceProgress(ws: StudyWorkspace): number {
  if (!ws.checklist.length) return 0;
  return Math.round((100 * ws.checklist.filter((c) => c.done).length) / ws.checklist.length);
}

export function StudyDeskPage() {
  const navigate = useNavigate();
  const { ready, workspaces, create, remove, max } = useStudyWorkspaces();

  const [deskTab, setDeskTab] = useState<DeskTab>("workspaces");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState("");

  // New workspace form
  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState(BOOK_TOPICS[0]?.id ?? "orbital-mechanics");
  const [customTopic, setCustomTopic] = useState("");
  const [bookId, setBookId] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [mode, setMode] = useState<LearningMode>("intermediate");
  const [goals, setGoals] = useState("");

  const topicBooks = useMemo(() => booksForTopic(topicId), [topicId]);

  const sorted = useMemo(
    () => [...workspaces].sort((a, b) => b.updatedAt - a.updatedAt),
    [workspaces],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.topicId.toLowerCase().includes(q) ||
        w.bookTitle.toLowerCase().includes(q),
    );
  }, [sorted, query]);

  // Escape closes the dialog.
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const openWorkspace = (id: string) => {
    navigate({ to: "/academy/workspace/$workspaceId", params: { workspaceId: id } });
  };

  const resetForm = () => {
    setTitle("");
    setGoals("");
    setBookId("");
    setBookTitle("");
    setBookAuthor("");
    setCustomTopic("");
  };

  const openCreateModal = (prefill?: { title?: string; topicId?: string; mode?: LearningMode }) => {
    setFormError("");
    if (prefill?.title) setTitle(prefill.title);
    if (prefill?.topicId) {
      setTopicId(prefill.topicId);
      setBookId("");
      setBookTitle("");
      setBookAuthor("");
    }
    if (prefill?.mode) setMode(prefill.mode);
    setModalOpen(true);
  };

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    const resolvedTopic =
      topicId === "other" ? `custom:${customTopic.trim().slice(0, 80) || "topic"}` : topicId;
    const fromCatalog = topicBooks.find((b) => b.id === bookId);
    const ws = create({
      title: title.trim() || "Untitled workspace",
      topicId: resolvedTopic,
      bookTitle: fromCatalog?.title ?? bookTitle.trim(),
      bookAuthor: fromCatalog?.authors ?? bookAuthor.trim(),
      learningMode: mode,
      goals: goals.trim(),
    });
    if (!ws) {
      setFormError(
        workspaces.length >= max
          ? `You already have ${max} workspaces. Delete one to create another.`
          : "Could not create the workspace. Try again.",
      );
      return;
    }
    resetForm();
    setModalOpen(false);
    openWorkspace(ws.id);
  };

  const openCourse = (trackId: AcademyTrackId) => {
    const topic = TRACK_TO_TOPIC[trackId];
    const existing = workspaces.find(
      (w) => w.topicId === topic || w.title.toLowerCase().includes(trackId),
    );
    if (existing) {
      openWorkspace(existing.id);
      return;
    }
    const ws = create({
      title: COURSE_DEFAULT_TITLE[trackId],
      topicId: topic,
      bookTitle: COURSE_DEFAULT_TITLE[trackId],
      bookAuthor: "STELLUN track template",
      learningMode: "beginner",
      goals: `Build foundations in ${trackId}`,
    });
    if (ws) openWorkspace(ws.id);
  };

  if (!ready) {
    return (
      <div className="ac-page">
        <p className="ac-muted">Loading your study desk…</p>
      </div>
    );
  }

  return (
    <div className="ac-page">
      <div className="ac-top">
        <div>
          <h1 className="ac-title">Study desk</h1>
          <p className="ac-sub">
            Create workspaces, follow courses, and keep your reference library in one place.
          </p>
        </div>
        <button type="button" className="ac-btn ac-btn--primary" onClick={() => openCreateModal()}>
          New workspace
        </button>
      </div>

      <nav className="ac-tabs" aria-label="Study desk sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="ac-tab"
            aria-current={deskTab === t.id ? "true" : undefined}
            onClick={() => setDeskTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {deskTab === "workspaces" && (
        <div className="ac-stack">
          <section aria-labelledby="shelf-h">
            <div className="ac-section-head">
              <h2 id="shelf-h" className="ac-h2">
                Recommended shelf
              </h2>
            </div>
            <div className="ac-shelf">
              {SHELF.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className="ac-shelf-card"
                  onClick={() =>
                    openCreateModal({ title: item.name, topicId: item.topicId, mode: item.mode })
                  }
                >
                  <span className="ac-small ac-muted">{item.kind}</span>
                  <span className="ac-shelf-name">{item.name}</span>
                  <span className="ac-small ac-muted" style={{ marginTop: "auto" }}>
                    Prefill a new workspace
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className="ac-toolbar">
            <label className="ac-search">
              <span className="ac-sr-only">Search workspaces</span>
              <input
                className="ac-input"
                type="search"
                placeholder="Search workspaces"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <span className="ac-small ac-muted">
              {workspaces.length} of {max} workspaces
            </span>
          </div>

          {filtered.length === 0 ? (
            <p className="ac-empty">
              {workspaces.length === 0
                ? "No workspaces yet. Create one, or start from a recommended item above."
                : "No workspaces match your search."}
            </p>
          ) : (
            <div className="ac-card ac-card--flush">
              <div className="ac-table-wrap">
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th scope="col">Workspace</th>
                      <th scope="col">Subject</th>
                      <th scope="col">Last opened</th>
                      <th scope="col">Progress</th>
                      <th scope="col">
                        <span className="ac-sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((w) => {
                      const done = w.checklist.filter((c) => c.done).length;
                      const total = w.checklist.length;
                      return (
                        <tr key={w.id}>
                          <td className="ac-table-main" data-label="Workspace">
                            <button
                              type="button"
                              className="ac-table-link"
                              onClick={() => openWorkspace(w.id)}
                            >
                              {w.title || "Untitled workspace"}
                            </button>
                          </td>
                          <td className="ac-table-muted" data-label="Subject">
                            {subjectLabel(w.topicId)}
                          </td>
                          <td className="ac-table-muted" data-label="Last opened">
                            {formatWhen(w.updatedAt)}
                          </td>
                          <td data-label="Progress">
                            {done}/{total} · {workspaceProgress(w)}%
                          </td>
                          <td className="ac-table-wide">
                            <div className="ac-table-actions">
                              <button
                                type="button"
                                className="ac-btn ac-btn--ghost ac-btn--sm"
                                onClick={() => openWorkspace(w.id)}
                              >
                                Open
                              </button>
                              <button
                                type="button"
                                className="ac-btn ac-btn--danger ac-btn--sm"
                                onClick={() => {
                                  if (window.confirm(`Delete “${w.title}”?`)) remove(w.id);
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
            </div>
          )}
          <p className="ac-small ac-muted">
            Opening a workspace shows its study plan, checklist, notes, and the book reader.
          </p>
        </div>
      )}

      {deskTab === "courses" && (
        <div className="ac-grid-courses">
          {TRACKS.map((t) => {
            const topic = TRACK_TO_TOPIC[t.id];
            const match = workspaces.find(
              (w) => w.topicId === topic || w.title.toLowerCase().includes(t.id),
            );
            const pct = match ? workspaceProgress(match) : 0;
            return (
              <button key={t.id} type="button" className="ac-course" onClick={() => openCourse(t.id)}>
                <span className="ac-course-bar" aria-hidden="true" />
                <span className="ac-course-kind">Course</span>
                <span className="ac-course-title">{t.label}</span>
                <span className="ac-small ac-muted">{t.blurb}</span>
                <span
                  className="ac-bar"
                  role="progressbar"
                  aria-label={`${t.label} progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                >
                  <i style={{ width: `${pct}%` }} />
                </span>
                <span className="ac-course-foot">
                  {match ? `${pct}% done · open workspace` : "Start a workspace"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {deskTab === "terminology" && <TerminologiesTab />}
      {deskTab === "library" && <ResearchLibraryTab />}
      {deskTab === "resources" && <LearningResourcesTab />}
      {deskTab === "roman" && <RomanHub />}

      {deskTab === "history" && (
        <div className="ac-stack">
          <div className="ac-grid-4">
            <div className="ac-metric">
              <span className="ac-metric-value">{workspaces.length}</span>
              <span className="ac-metric-label">Workspaces</span>
            </div>
            <div className="ac-metric">
              <span className="ac-metric-value">
                {workspaces.reduce((n, w) => n + w.checklist.filter((c) => c.done).length, 0)}
              </span>
              <span className="ac-metric-label">Checklist items done</span>
            </div>
            <div className="ac-metric">
              <span className="ac-metric-value">
                {workspaces.filter((w) => w.planAccepted).length}
              </span>
              <span className="ac-metric-label">Plans accepted</span>
            </div>
            <div className="ac-metric">
              <span className="ac-metric-value">
                {workspaces.reduce(
                  (n, w) => n + (w.notes.trim() ? w.notes.trim().split(/\s+/).length : 0),
                  0,
                )}
              </span>
              <span className="ac-metric-label">Words in notes</span>
            </div>
          </div>

          <section aria-labelledby="history-h">
            <h2 id="history-h" className="ac-h2">
              Progress by workspace
            </h2>
            {sorted.length === 0 ? (
              <p className="ac-empty">Your history appears here once you have a workspace.</p>
            ) : (
              <div className="ac-card ac-card--flush" style={{ marginTop: 12 }}>
                <div className="ac-table-wrap">
                  <table className="ac-table">
                    <thead>
                      <tr>
                        <th scope="col">Workspace</th>
                        <th scope="col">Checklist</th>
                        <th scope="col">Plan</th>
                        <th scope="col">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((w) => (
                        <tr key={w.id}>
                          <td className="ac-table-main" data-label="Workspace">
                            <button
                              type="button"
                              className="ac-table-link"
                              onClick={() => openWorkspace(w.id)}
                            >
                              {w.title || "Untitled workspace"}
                            </button>
                          </td>
                          <td data-label="Checklist">{workspaceProgress(w)}%</td>
                          <td data-label="Plan">{w.planAccepted ? "Accepted" : "Not yet accepted"}</td>
                          <td className="ac-table-muted" data-label="Updated">
                            {formatWhen(w.updatedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <p className="ac-small ac-muted">
            For the full summary, open <Link to="/academy/progress" className="ac-link">Your progress</Link>.
          </p>
        </div>
      )}

      {modalOpen && (
        <div
          className="ac-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <form
            className="ac-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-workspace-h"
            onSubmit={onCreate}
          >
            <h2 id="new-workspace-h" className="ac-h2" style={{ fontSize: "1.25rem" }}>
              New workspace
            </h2>
            {formError ? (
              <p className="ac-error" role="alert">
                {formError}
              </p>
            ) : null}

            <label className="ac-field">
              <span>Name</span>
              <input
                className="ac-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Orbital mechanics · Week 1"
                autoFocus
              />
            </label>

            <label className="ac-field">
              <span>Topic</span>
              <select className="ac-select" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                {BOOK_TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
                <option value="other">Other (write your own)</option>
              </select>
            </label>

            {topicId === "other" && (
              <label className="ac-field">
                <span>Custom topic</span>
                <input
                  className="ac-input"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="Your topic"
                />
              </label>
            )}

            <label className="ac-field">
              <span>Book from the catalogue</span>
              <select
                className="ac-select"
                value={bookId}
                onChange={(e) => {
                  const id = e.target.value;
                  setBookId(id);
                  const b = topicBooks.find((x) => x.id === id);
                  setBookTitle(b ? b.title : "");
                  setBookAuthor(b ? b.authors : "");
                }}
              >
                <option value="">Choose, or type a book below</option>
                {topicBooks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="ac-field">
              <span>Book title</span>
              <input
                className="ac-input"
                value={bookTitle}
                onChange={(e) => {
                  setBookTitle(e.target.value);
                  setBookId("");
                }}
                placeholder="Optional"
              />
            </label>

            <label className="ac-field">
              <span>Author</span>
              <input
                className="ac-input"
                value={bookAuthor}
                onChange={(e) => setBookAuthor(e.target.value)}
                placeholder="Optional"
              />
            </label>

            <fieldset className="ac-field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="ac-label" style={{ marginBottom: 6 }}>
                Learning mode
              </legend>
              <div className="ac-stack" style={{ gap: 8 }}>
                {LEARNING_MODES.map((m) => (
                  <label key={m.id} className="ac-choice" style={{ gridTemplateColumns: "auto 1fr", alignItems: "start" }}>
                    <input
                      type="radio"
                      name="learning-mode"
                      checked={mode === m.id}
                      onChange={() => setMode(m.id)}
                      style={{ marginTop: 3 }}
                    />
                    <span>
                      <strong>{m.label}</strong>
                      <span className="ac-choice-blurb"> · {m.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="ac-field">
              <span>Goals (optional)</span>
              <textarea
                className="ac-textarea"
                rows={2}
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="What should this workspace help you finish?"
              />
            </label>

            <div className="ac-modal-actions">
              <button type="button" className="ac-btn ac-btn--ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="ac-btn ac-btn--primary">
                Create workspace
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
