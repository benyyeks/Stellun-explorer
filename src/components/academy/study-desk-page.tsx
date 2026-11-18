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
import { TerminologiesTab } from "@/components/academy/terminologies";
import { ResearchLibraryTab } from "@/components/academy/research-library";
import { LearningResourcesTab } from "@/components/academy/learning-resources";
import { RomanHub } from "@/components/academy/roman-hub";

/**
 * Study desk — Claude mock layout
 * -------------------------------
 * Tabs: Workspaces | Terminology | Research library | Learning resources | Roman hub
 * Workspace table + New workspace slide-over.
 * Checklist uses toggleChecklistItem so only one row flips per click.
 */

type DeskTab =
  | "workspaces"
  | "terminology"
  | "library"
  | "resources"
  | "roman"
  | "active";

type MobileTab = "document" | "notes" | "plan";

const DESK_TABS: { id: DeskTab; label: string }[] = [
  { id: "workspaces", label: "Workspaces" },
  { id: "terminology", label: "Terminology" },
  { id: "library", label: "Research library" },
  { id: "resources", label: "Learning resources" },
  { id: "roman", label: "Roman hub" },
];

export function StudyDeskPage() {
  const {
    workspaces,
    ready,
    createDraft,
    acceptPlan,
    update,
    toggleChecklistItem,
    remove,
    max,
  } = useStudyWorkspaces();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("document");
  const [deskTab, setDeskTab] = useState<DeskTab>("workspaces");
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState(BOOK_TOPICS[0]?.id ?? "orbital-mechanics");
  const [customTopic, setCustomTopic] = useState("");
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

  const progress = active?.checklist.length
    ? Math.round((100 * active.checklist.filter((c) => c.done).length) / active.checklist.length)
    : 0;

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
    if (topicId === "other" && !customTopic.trim()) return;

    const resolvedTopicId =
      topicId === "other" ? `custom:${customTopic.trim().slice(0, 80)}` : topicId;

    const ws = createDraft({
      title,
      topicId: resolvedTopicId,
      bookId: bookId || undefined,
      bookTitle,
      bookAuthor,
      learningMode: mode,
      goals,
    });
    if (ws) {
      setActiveId(ws.id);
      setModalOpen(false);
      setDeskTab("active");
      setTitle("");
      setGoals("");
      setCustomTopic("");
      setTopicId(BOOK_TOPICS[0]?.id ?? "orbital-mechanics");
    }
  };

  const openAsk = (ws: StudyWorkspace) => {
    setAskPrefill({
      mode: "chat",
      text: buildStudyAskPrompt(ws),
      autoSend: false,
    });
    navigate({ to: "/ask" });
  };

  const formatWhen = (ts: number) => {
    try {
      const d = new Date(ts);
      const now = new Date();
      const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
      if (sameDay) {
        return `Today, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
      }
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "—";
    }
  };

  return (
    <main className="academy-dash page-main study-desk-page">
      <div className="top study-desk-top">
        <div>
          <h1>Study desk</h1>
          <p className="sub tagline">
            Workspaces, terminology, and reference libraries in one place.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
          New workspace
        </button>
      </div>

      <nav className="academy-desk-tabs" aria-label="Study desk sections">
        {DESK_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="academy-desk-tab"
            data-active={deskTab === t.id ? "true" : undefined}
            aria-current={deskTab === t.id ? "page" : undefined}
            onClick={() => setDeskTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        {active && (
          <button
            type="button"
            className="academy-desk-tab"
            data-active={deskTab === "active" ? "true" : undefined}
            onClick={() => setDeskTab("active")}
          >
            Open workspace
          </button>
        )}
      </nav>

      {deskTab === "workspaces" && (
        <>
          <section aria-labelledby="shelf2">
            <div className="academy-row-head">
              <h2 className="academy-sec" id="shelf2">
                Recommended shelf
              </h2>
            </div>
            <div className="academy-shelf">
              {[
                ["Astronomy · 25 min", "Orbital mechanics primer", "Open in a new workspace"],
                ["Aerospace · 40 min", "Hohmann transfer examples", "Open in a new workspace"],
                ["Aviation · 15 min", "Cockpit instrument glossary", "Open in a new workspace"],
                ["Astronomy · 30 min", "Reading the night sky", "Open in a new workspace"],
              ].map(([kind, name, foot]) => (
                <button
                  key={name}
                  type="button"
                  className="academy-book card glass glass-card academy-module-btn"
                  onClick={() => setModalOpen(true)}
                >
                  <p className="muted small">{kind}</p>
                  <h3 className="academy-book-name">{name}</h3>
                  <p className="muted small academy-book-foot">{foot}</p>
                </button>
              ))}
            </div>
          </section>

          <div className="card glass glass-card academy-table-card" style={{ marginTop: 20 }}>
            {!ready ? (
              <p className="academy-empty muted">Loading workspaces…</p>
            ) : workspaces.length === 0 ? (
              <p className="academy-empty muted">
                No workspaces yet. Create one to generate a plan and checklist.
              </p>
            ) : (
              <table className="academy-rows">
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
                  {workspaces.map((w) => {
                    const done = w.checklist.filter((c) => c.done).length;
                    const total = w.checklist.length || 1;
                    const pct = Math.round((100 * done) / total);
                    return (
                      <tr key={w.id}>
                        <td>
                          <button
                            type="button"
                            className="academy-task-link"
                            onClick={() => {
                              setActiveId(w.id);
                              setDeskTab("active");
                            }}
                          >
                            {w.title || "Untitled"}
                          </button>
                        </td>
                        <td className="muted small">{w.topicId.replace(/^custom:/, "")}</td>
                        <td className="muted small">{formatWhen(w.updatedAt)}</td>
                        <td style={{ minWidth: 120 }}>
                          <div
                            className="academy-bar"
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <i style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              if (confirm("Delete this workspace?")) {
                                remove(w.id);
                                if (activeId === w.id) setActiveId(null);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            {workspaces.length}/{max} workspaces. New workspace opens as a panel so the list stays visible.
          </p>
        </>
      )}

      {deskTab === "terminology" && (
        <div className="academy-ref-panel">
          <TerminologiesTab />
        </div>
      )}
      {deskTab === "library" && (
        <div className="academy-ref-panel">
          <ResearchLibraryTab />
        </div>
      )}
      {deskTab === "resources" && (
        <div className="academy-ref-panel">
          <LearningResourcesTab sharedParam={undefined} />
        </div>
      )}
      {deskTab === "roman" && (
        <div className="academy-ref-panel">
          <RomanHub />
        </div>
      )}

      {deskTab === "active" && active && (
        <div className="study-desk-active card glass glass-card">
          <div className="study-desk-active-head">
            <div>
              <p className="eyebrow">Workspace</p>
              <h2 className="academy-sec" style={{ margin: 0 }}>
                {active.title}
              </h2>
              <p className="muted small">
                {active.bookTitle}
                {active.bookAuthor ? ` · ${active.bookAuthor}` : ""} · checklist {progress}%
              </p>
            </div>
            <div className="study-desk-active-actions">
              {!active.planAccepted && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => acceptPlan(active.id)}
                >
                  Accept plan
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => openAsk(active)}>
                Ask Stellun
              </button>
            </div>
          </div>

          <div className="study-desk-mobile-tabs" role="tablist">
            {(
              [
                ["document", "Plan"],
                ["notes", "Notes"],
                ["plan", "Checklist"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mobileTab === id}
                className="study-desk-mobile-tab"
                data-active={mobileTab === id ? "true" : undefined}
                onClick={() => setMobileTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="study-desk-panels">
            <div
              className="study-desk-panel"
              data-show={mobileTab === "document" ? "true" : undefined}
            >
              <div className="study-desk-panel-label eyebrow">Study plan</div>
              {!active.planAccepted && (
                <p className="muted small">Review the plan, then accept to lock the checklist.</p>
              )}
              <ol className="study-plan-list">
                {active.plan.map((p) => (
                  <li key={p.id}>
                    <strong>{p.title}</strong>
                    <span className="muted">
                      {" "}
                      · ~{p.estimatedSessions} session{p.estimatedSessions === 1 ? "" : "s"}
                    </span>
                    <p>{p.detail}</p>
                  </li>
                ))}
              </ol>
              <StudyUploadPanel workspace={active} />
            </div>

            <div
              className="study-desk-panel study-desk-panel-notes"
              data-show={mobileTab === "notes" ? "true" : undefined}
            >
              <div className="study-desk-panel-label eyebrow">Notes · {progress}%</div>
              <textarea
                className="study-notes"
                value={active.notes}
                maxLength={MAX_NOTES}
                placeholder="Notes for this workspace…"
                onChange={(e) => update(active.id, { notes: e.target.value })}
              />
              <label className="study-field" style={{ marginTop: 10 }}>
                <span>Focus line</span>
                <input
                  value={active.focus}
                  maxLength={MAX_FOCUS}
                  placeholder="What are you working on right now?"
                  onChange={(e) => update(active.id, { focus: e.target.value })}
                />
              </label>
            </div>

            <div
              className="study-desk-panel study-desk-panel-plan"
              data-show={mobileTab === "plan" ? "true" : undefined}
            >
              <div className="study-desk-panel-label eyebrow">
                Checklist · {progress}%
              </div>
              <ul className="study-check-list interactive">
                {active.checklist.map((c) => (
                  <li key={c.id} className="study-check-item">
                    <label className="study-check-label">
                      <input
                        type="checkbox"
                        checked={c.done}
                        // stopPropagation so the label click cannot fire twice
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleChecklistItem(active.id, c.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className={c.done ? "study-check-done" : undefined}>{c.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {deskTab === "active" && !active && (
        <p className="muted">Select a workspace from the Workspaces tab.</p>
      )}

      {modalOpen && (
        <div className="study-modal-backdrop" role="dialog" aria-modal="true" aria-label="New workspace">
          <div className="study-modal glass glass-card">
            <h2 className="academy-sec">New workspace</h2>
            <label className="study-field">
              <span>Name</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Orbital Mechanics · Week 1"
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
                  placeholder="e.g. Satellite communications"
                  maxLength={120}
                  required
                />
              </label>
            )}
            <label className="study-field">
              <span>Shelf book (optional)</span>
              <select value={bookId} onChange={(e) => onShelfPick(e.target.value)}>
                <option value="">— Custom title —</option>
                {topicBooks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="study-field">
              <span>Book title</span>
              <input
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                required
                placeholder="Title"
              />
            </label>
            <label className="study-field">
              <span>Author</span>
              <input
                value={bookAuthor}
                onChange={(e) => setBookAuthor(e.target.value)}
                placeholder="Author"
              />
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
                    {m.label}
                    <small className="muted"> — {m.hint}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="study-field">
              <span>Goals</span>
              <textarea
                value={goals}
                maxLength={MAX_GOALS}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="What should you be able to do after this workspace?"
                rows={3}
              />
            </label>
            <div className="study-modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={onCreate}>
                Create workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
