import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BOOK_TOPICS } from "@/lib/books";
import {
  LEARNING_MODES,
  MAX_FOCUS,
  MAX_GOALS,
  MAX_NOTES,
  booksForTopic,
  buildStudyAskPrompt,
  setAskPrefill,
  useStudyWorkspaces,
  type LearningMode,
  type StudyWorkspace,
} from "@/lib/study-workspace";
import { StudyUploadPanel } from "@/components/academy/study-upload-panel";

type MobileTab = "document" | "notes" | "plan";

export function StudyDeskPage() {
  const { workspaces, ready, createDraft, acceptPlan, update, remove, max } = useStudyWorkspaces();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("document");
  const navigate = useNavigate();

  // form state for modal
  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState(BOOK_TOPICS[0]?.id ?? "orbital-mechanics");
  const [bookId, setBookId] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [mode, setMode] = useState<LearningMode>("intermediate");
  const [goals, setGoals] = useState("");

  const topicBooks = useMemo(() => booksForTopic(topicId), [topicId]);

  useEffect(() => {
    if (!ready) return;
    if (activeId && workspaces.some((w) => w.id === activeId)) return;
    setActiveId(workspaces[0]?.id ?? null);
  }, [ready, workspaces, activeId]);

  const active = workspaces.find((w) => w.id === activeId) ?? null;

  const onShelfPick = (id: string) => {
    setBookId(id);
    const b = topicBooks.find((x) => x.id === id);
    if (b) {
      setBookTitle(b.title);
      setBookAuthor(b.authors);
    }
  };

  const onCreate = () => {
    if (!bookTitle.trim()) return;
    const ws = createDraft({
      title,
      topicId,
      bookId: bookId || undefined,
      bookTitle,
      bookAuthor,
      learningMode: mode,
      goals,
    });
    if (ws) {
      setActiveId(ws.id);
      setModalOpen(false);
      setTitle("");
      setGoals("");
    }
  };

  const openAsk = (ws: StudyWorkspace) => {
    setAskPrefill({ mode: "explain", text: buildStudyAskPrompt(ws) });
    void navigate({ to: "/ask" });
  };

  const progress = active?.checklist.length
    ? Math.round((100 * active.checklist.filter((c) => c.done).length) / active.checklist.length)
    : 0;

  return (
    <section className="study-desk-page">
      <div className="container study-desk-page-head">
        <div>
          <span className="badge">The Academy</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Study desk</h1>
          <p className="text-muted" style={{ maxWidth: "52ch" }}>
            Name a workspace, set your book and level, accept a study plan, then read, note, and ask Stellun AI in one place.
          </p>
        </div>
        <Link to="/academy" search={{ tab: "resources", list: undefined }} className="btn btn-ghost btn-sm">
          Learning resources
        </Link>
      </div>

      <div className="study-desk-ide container">
        {/* LEFT: workspaces */}
        <aside className="study-desk-rail glass">
          <div className="study-desk-rail-head">
            <h2>Workspaces</h2>
            <span className="mono text-faint">{workspaces.length}/{max}</span>
          </div>
          <button type="button" className="btn btn-primary btn-sm study-desk-new" onClick={() => setModalOpen(true)} disabled={workspaces.length >= max}>
            New workspace
          </button>
          <ul className="study-desk-ws-list">
            {workspaces.map((w) => {
              const done = w.checklist.filter((c) => c.done).length;
              const total = w.checklist.length || 1;
              const pct = Math.round((100 * done) / total);
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    className="study-desk-ws-item"
                    data-active={w.id === activeId ? "true" : undefined}
                    onClick={() => setActiveId(w.id)}
                  >
                    <span className="study-desk-ws-name">{w.title}</span>
                    <span className="study-desk-ws-sub text-faint">
                      {w.planAccepted ? `${pct}% · ${w.learningMode}` : "Plan pending"}
                    </span>
                    <span className="study-desk-ws-bar" style={{ width: `${w.planAccepted ? pct : 0}%` }} />
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* CENTER + RIGHT */}
        <div className="study-desk-stage">
          {!active ? (
            <div className="glass glass-card scaffold-card">
              <p className="ask-hint">Create a workspace to begin.</p>
              <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>New workspace</button>
            </div>
          ) : !active.planAccepted ? (
            <div className="glass glass-card scaffold-card study-plan-card">
              <h2>Study plan</h2>
              <p className="text-muted">
                {active.bookTitle}
                {active.bookAuthor ? ` · ${active.bookAuthor}` : ""} · {active.learningMode}
              </p>
              <ol className="study-plan-list">
                {active.plan.map((p) => (
                  <li key={p.id}>
                    <strong>{p.title}</strong>
                    <span className="text-muted"> · \~{p.estimatedSessions} session{p.estimatedSessions === 1 ? "" : "s"}</span>
                    <p>{p.detail}</p>
                  </li>
                ))}
              </ol>
              <h3 className="eyebrow">Checklist</h3>
              <ul className="study-check-list">
                {active.checklist.map((c) => (
                  <li key={c.id}>{c.label}</li>
                ))}
              </ul>
              <div className="study-plan-actions">
                <button type="button" className="btn btn-primary" onClick={() => acceptPlan(active.id)}>
                  Accept plan & open desk
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    if (window.confirm("Delete this workspace?")) {
                      remove(active.id);
                      setActiveId(null);
                    }
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="study-desk-mobile-tabs" role="tablist">
                {(["document", "notes", "plan"] as MobileTab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    className="study-desk-mobile-tab"
                    data-active={mobileTab === t ? "true" : undefined}
                    onClick={() => setMobileTab(t)}
                  >
                    {t === "document" ? "Resource" : t === "notes" ? "Notes" : "Plan"}
                  </button>
                ))}
              </div>

              <div className="study-desk-panels">
                <div className="study-desk-panel study-desk-panel-doc" data-show={mobileTab === "document" ? "true" : undefined}>
                  <div className="study-desk-panel-label eyebrow">Resource</div>
                  <StudyUploadPanel workspace={active as any} />
                  <label className="study-field">
                    <span>Focus</span>
                    <input
                      value={active.focus}
                      maxLength={MAX_FOCUS}
                      placeholder="What are you working on right now?"
                      onChange={(e) => update(active.id, { focus: e.target.value })}
                    />
                  </label>
                </div>

                <div className="study-desk-panel study-desk-panel-notes" data-show={mobileTab === "notes" ? "true" : undefined}>
                  <div className="study-desk-panel-label eyebrow">Notes · {progress}%</div>
                  <textarea
                    className="study-notes"
                    value={active.notes}
                    maxLength={MAX_NOTES}
                    placeholder="Markdown-friendly notes…"
                    onChange={(e) => update(active.id, { notes: e.target.value })}
                  />
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => openAsk(active)}>
                    Ask Stellun AI about this workspace
                  </button>
                </div>

                <div className="study-desk-panel study-desk-panel-plan" data-show={mobileTab === "plan" ? "true" : undefined}>
                  <div className="study-desk-panel-label eyebrow">Checklist</div>
                  <ul className="study-check-list interactive">
                    {active.checklist.map((c) => (
                      <li key={c.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={c.done}
                            onChange={() =>
                              update(active.id, {
                                checklist: active.checklist.map((x) =>
                                  x.id === c.id ? { ...x, done: !x.done } : x,
                                ),
                              })
                            }
                          />
                          <span>{c.label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="study-modal-backdrop" role="dialog" aria-modal="true" aria-label="New workspace">
          <div className="study-modal glass glass-card">
            <h2>New workspace</h2>
            <label className="study-field">
              <span>Workspace name</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Orbital Mechanics · Week 1" />
            </label>
            <label className="study-field">
              <span>Topic</span>
              <select value={topicId} onChange={(e) => { setTopicId(e.target.value); setBookId(""); }}>
                {BOOK_TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="study-field">
              <span>Shelf book (optional)</span>
              <select value={bookId} onChange={(e) => onShelfPick(e.target.value)}>
                <option value="">Custom book…</option>
                {topicBooks.map((b) => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </label>
            <label className="study-field">
              <span>Book title</span>
              <input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} required placeholder="Title" />
            </label>
            <label className="study-field">
              <span>Author(s)</span>
              <input value={bookAuthor} onChange={(e) => setBookAuthor(e.target.value)} placeholder="Author" />
            </label>
            <fieldset className="study-field">
              <legend>Learning mode</legend>
              <div className="study-mode-grid">
                {LEARNING_MODES.map((m) => (
                  <label key={m.id} className="study-mode-card" data-active={mode === m.id ? "true" : undefined}>
                    <input type="radio" name="mode" checked={mode === m.id} onChange={() => setMode(m.id)} />
                    <strong>{m.label}</strong>
                    <span className="text-faint">{m.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="study-field">
              <span>Learning goals (optional)</span>
              <textarea value={goals} maxLength={MAX_GOALS} onChange={(e) => setGoals(e.target.value)} placeholder="What should you be able to do after this workspace?" rows={3} />
            </label>
            <div className="study-plan-actions">
              <button type="button" className="btn btn-primary" disabled={!bookTitle.trim()} onClick={onCreate}>
                Create & generate plan
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
