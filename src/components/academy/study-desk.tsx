// Academy Study desk: personal workspaces with notes, checklists, and
// one-click handoff to Orbitex AI. Data stays in the browser (localStorage).
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BOOK_TOPICS, bookById } from "@/lib/books";
import {
  MAX_FOCUS,
  MAX_NOTES,
  booksForTopic,
  buildStudyAskPrompt,
  setAskPrefill,
  useStudyWorkspaces,
  type ChecklistItem,
  type StudyWorkspace,
} from "@/lib/study-workspace";
import { StudyUploadPanel } from "@/components/academy/study-upload-panel";
import { SkeletonImage } from "@/components/site/skeleton-image";

function bookCoverUrl(isbn13: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn13}-M.jpg`;
}

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function StudyDeskTab() {
  const { workspaces, ready, create, update, remove, max } = useStudyWorkspaces();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState(BOOK_TOPICS[0]?.id ?? "orbital-mechanics");
  const [bookId, setBookId] = useState("");
  const navigate = useNavigate();

  const topicBooks = useMemo(() => booksForTopic(topicId), [topicId]);

  useEffect(() => {
    if (!topicBooks.some((b) => b.id === bookId)) {
      setBookId(topicBooks[0]?.id ?? "");
    }
  }, [topicId, topicBooks, bookId]);

  useEffect(() => {
    if (!ready) return;
    if (activeId && workspaces.some((w) => w.id === activeId)) return;
    setActiveId(workspaces[0]?.id ?? null);
  }, [ready, workspaces, activeId]);

  const active = workspaces.find((w) => w.id === activeId) ?? null;

  const onCreate = () => {
    const ws = create({ topicId, bookId });
    if (ws) setActiveId(ws.id);
  };

  const openAsk = (ws: StudyWorkspace) => {
    setAskPrefill({ mode: "explain", text: buildStudyAskPrompt(ws) });
    void navigate({ to: "/ask" });
  };

  const toggleCheck = (ws: StudyWorkspace, itemId: string) => {
    const checklist: ChecklistItem[] = ws.checklist.map((c) =>
      c.id === itemId ? { ...c, done: !c.done } : c
    );
    update(ws.id, { checklist });
  };

  const progress = active
    ? active.checklist.length
      ? Math.round((100 * active.checklist.filter((c) => c.done).length) / active.checklist.length)
      : 0
    : 0;

  return (
    <section className="academy-tab-body">
      <div className="container">
        <div className="glass glass-card scaffold-card">
          <h2>Study desk</h2>
          <p>
            Create a workspace for each topic you are studying. Keep notes, track a short
            checklist, and send context to Orbitex AI when you need a clearer explanation.
            Workspaces stay in this browser until you clear site data.
          </p>
        </div>

        <div className="study-desk-layout">
          <aside className="glass glass-card study-desk-side" aria-label="Workspaces">
            <div className="study-desk-side-head">
              <h3>Workspaces</h3>
              <span className="academy-count mono">
                {workspaces.length} / {max}
              </span>
            </div>

            <div className="study-desk-create">
              <label className="field-label" htmlFor="study-topic">
                Topic
              </label>
              <select
                id="study-topic"
                className="input"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
              >
                {BOOK_TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>

              <label className="field-label" htmlFor="study-book">
                Primary book
              </label>
              <select
                id="study-book"
                className="input"
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
              >
                {topicBooks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onCreate}
                disabled={!bookId || workspaces.length >= max}
              >
                New workspace
              </button>
            </div>

            {!ready ? (
              <p className="academy-count">Loading workspaces.</p>
            ) : workspaces.length === 0 ? (
              <p className="ask-hint">
                No workspaces yet. Pick a topic and book, then create one. Study paths under
                Learning resources suggest a good order.
              </p>
            ) : (
              <ul className="study-ws-list">
                {workspaces.map((w) => {
                  const book = bookById(w.bookId);
                  const topic = BOOK_TOPICS.find((t) => t.id === w.topicId);
                  return (
                    <li key={w.id}>
                      <button
                        type="button"
                        className={`study-ws-item${w.id === activeId ? " active" : ""}`}
                        onClick={() => setActiveId(w.id)}
                      >
                        <span className="study-ws-title">{w.title}</span>
                        <span className="study-ws-meta">
                          {topic?.label ?? w.topicId}
                          {book ? ` · ${book.title}` : ""}
                        </span>
                        <span className="academy-count mono">{timeAgo(w.updatedAt)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <div className="study-desk-main">
            <StudyUploadPanel workspace={active} />
            {!active ? (
              <div className="glass glass-card scaffold-card">
                <p className="ask-hint">Select or create a workspace to take notes and track progress.</p>
                <Link
                  to="/academy"
                  search={{ tab: "resources", list: undefined }}
                  className="btn btn-ghost btn-sm"
                >
                  Browse study paths
                </Link>
              </div>
            ) : (
              <>
                <div className="glass glass-card scaffold-card study-desk-header">
                  <div className="study-desk-header-row">
                    {(() => {
                      const book = bookById(active.bookId);
                      return book ? (
                        <SkeletonImage
                          src={bookCoverUrl(book.isbn13)}
                          className="book-cover book-cover-sm"
                          alt={`Cover of ${book.title}`}
                        />
                      ) : null;
                    })()}
                    <div className="study-desk-header-text">
                      <label className="field-label" htmlFor="ws-title">
                        Workspace title
                      </label>
                      <input
                        id="ws-title"
                        className="input"
                        value={active.title}
                        onChange={(e) => update(active.id, { title: e.target.value })}
                        maxLength={120}
                      />
                      <p className="study-desk-bookline">
                        {BOOK_TOPICS.find((t) => t.id === active.topicId)?.label}
                        {bookById(active.bookId)
                          ? ` · ${bookById(active.bookId)?.title}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <label className="field-label" htmlFor="ws-focus">
                    Current focus
                  </label>
                  <input
                    id="ws-focus"
                    className="input"
                    placeholder="e.g. Hohmann transfer delta-v"
                    value={active.focus}
                    onChange={(e) => update(active.id, { focus: e.target.value })}
                    maxLength={MAX_FOCUS}
                  />

                  <div className="study-desk-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => openAsk(active)}
                    >
                      Ask Orbitex AI about this
                    </button>
                    {bookById(active.bookId)?.freeUrl && (
                      <a
                        href={bookById(active.bookId)?.freeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost"
                      >
                        {bookById(active.bookId)?.freeLabel ?? "Free source"}
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        if (window.confirm("Delete this workspace? Notes will be lost.")) {
                          remove(active.id);
                          setActiveId(null);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="study-desk-split">
                  <div className="glass glass-card scaffold-card">
                    <div className="study-desk-side-head">
                      <h3>Checklist</h3>
                      <span className="academy-count mono">{progress}%</span>
                    </div>
                    <ul className="study-check-list">
                      {active.checklist.map((c) => (
                        <li key={c.id}>
                          <label className="study-check-item">
                            <input
                              type="checkbox"
                              checked={c.done}
                              onChange={() => toggleCheck(active, c.id)}
                            />
                            <span className={c.done ? "study-check-done" : undefined}>{c.label}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="glass glass-card scaffold-card study-notes-card">
                    <div className="study-desk-side-head">
                      <h3>Notes</h3>
                      <span className="academy-count mono">
                        {active.notes.length} / {MAX_NOTES}
                      </span>
                    </div>
                    <textarea
                      className="input study-notes"
                      value={active.notes}
                      onChange={(e) => update(active.id, { notes: e.target.value })}
                      placeholder="Equations, questions, page references, mistakes to revisit…"
                      rows={14}
                      maxLength={MAX_NOTES}
                      aria-label="Study notes"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
