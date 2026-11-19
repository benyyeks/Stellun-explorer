import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  MAX_FOCUS,
  MAX_NOTES,
  setAskPrefill,
  useStudyWorkspaces,
} from "@/lib/study-workspace";
import { StudyUploadPanel } from "@/components/academy/study-upload-panel";

/**
 * Workspace reader
 * ----------------
 * Left: the book reader. Opens a PDF (shown in the page), or a TXT or
 * Markdown file (shown as paragraphs). Files stay on this device for this
 * visit only; they are not uploaded anywhere.
 * Right: notes, focus, the study plan, the checklist, and the books and
 * Stellun AI panel.
 * Select text in a text file to save it to notes or ask Stellun about it.
 */

export const Route = createFileRoute("/_authenticated/academy/workspace/$workspaceId")({
  head: () => ({
    meta: [
      { title: "Workspace · STELLUN Academy" },
      {
        name: "description",
        content: "Read, take notes, and follow your study plan in one place.",
      },
    ],
  }),
  component: WorkspacePage,
});

type OpenBook =
  | { kind: "pdf"; name: string; url: string }
  | { kind: "text"; name: string; paragraphs: string[] };

type ToolTab = "notes" | "plan" | "checklist" | "books";

const TOOL_TABS: { id: ToolTab; label: string }[] = [
  { id: "notes", label: "Notes" },
  { id: "plan", label: "Plan" },
  { id: "checklist", label: "Checklist" },
  { id: "books", label: "Books and AI" },
];

const MAX_TEXT_BYTES = 3_000_000;

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"));
    reader.readAsText(file);
  });
}

function WorkspacePage() {
  const { workspaceId } = Route.useParams();
  const navigate = useNavigate();
  const { ready, workspaces, update, acceptPlan, toggleChecklistItem } = useStudyWorkspaces();
  const ws = workspaces.find((w) => w.id === workspaceId) ?? null;

  const [book, setBook] = useState<OpenBook | null>(null);
  const [bookError, setBookError] = useState("");
  const [selection, setSelection] = useState("");
  const [toolTab, setToolTab] = useState<ToolTab>("notes");
  const readerRef = useRef<HTMLElement | null>(null);

  // Release the PDF object URL when the book changes or the page closes.
  useEffect(() => {
    return () => {
      if (book?.kind === "pdf") URL.revokeObjectURL(book.url);
    };
  }, [book]);

  // Track selected text inside the reader. The bar stays until dismissed, so
  // clicking its buttons does not clear the selection first.
  useEffect(() => {
    const onChange = () => {
      const sel = window.getSelection();
      const node = sel?.anchorNode ?? null;
      if (!node || !readerRef.current || !readerRef.current.contains(node)) return;
      const text = (sel?.toString() ?? "").trim();
      if (text) setSelection(text.slice(0, 600));
    };
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, []);

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    setBookError("");
    const name = file.name;
    if (/\.pdf$/i.test(name) || file.type === "application/pdf") {
      setBook({ kind: "pdf", name, url: URL.createObjectURL(file) });
      return;
    }
    if (/\.(txt|md)$/i.test(name)) {
      if (file.size > MAX_TEXT_BYTES) {
        setBookError("That file is larger than 3 MB. Try a shorter section.");
        return;
      }
      try {
        const text = await readAsText(file);
        const paragraphs = text
          .split(/\r?\n\s*\r?\n/)
          .map((p) => p.trim())
          .filter(Boolean);
        setBook({ kind: "text", name, paragraphs });
      } catch {
        setBookError("Could not read that file. Try again.");
      }
      return;
    }
    setBookError("Choose a PDF, TXT, or Markdown file.");
  };

  if (!ready) {
    return (
      <div className="ac-page">
        <p className="ac-muted">Opening your workspace…</p>
      </div>
    );
  }

  if (!ws) {
    return (
      <div className="ac-page">
        <div className="ac-empty">
          <p>This workspace could not be found. It may have been deleted.</p>
          <p>
            <Link to="/academy/desk" className="ac-btn ac-btn--primary">
              Back to Study desk
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const done = ws.checklist.filter((c) => c.done).length;
  const total = ws.checklist.length;
  const pct = total ? Math.round((100 * done) / total) : 0;

  const addSelectionToNotes = () => {
    if (!selection) return;
    const next = [ws.notes.trimEnd(), `“${selection}”`]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, MAX_NOTES);
    update(ws.id, { notes: next });
    setToolTab("notes");
    setSelection("");
    window.getSelection()?.removeAllRanges();
  };

  const askAboutSelection = () => {
    if (!selection) return;
    setAskPrefill({
      mode: "explain",
      text: `In my study book “${ws.bookTitle || ws.title}”, explain this passage in plain language:\n\n“${selection}”`,
      autoSend: false,
    });
    navigate({ to: "/ask" });
  };

  return (
    <div className="ac-page">
      <div className="ac-top">
        <div>
          <p className="ac-small ac-muted" style={{ margin: 0 }}>
            <Link to="/academy/desk" className="ac-link">
              Study desk
            </Link>
            {" / "}
            {ws.title || "Untitled workspace"}
          </p>
          <h1 className="ac-title" style={{ marginTop: 4 }}>
            {ws.title || "Untitled workspace"}
          </h1>
          <p className="ac-sub">
            {ws.bookTitle || "No book named yet"}
            {ws.bookAuthor ? ` · ${ws.bookAuthor}` : ""} · checklist {pct}%
          </p>
        </div>
        <div className="ac-hero-actions">
          {!ws.planAccepted && (
            <button type="button" className="ac-btn ac-btn--primary" onClick={() => acceptPlan(ws.id)}>
              Accept plan
            </button>
          )}
          <Link to="/ask" className="ac-btn ac-btn--ghost">
            Ask Stellun
          </Link>
        </div>
      </div>

      <div className="ac-split">
        <section className="ac-reader" aria-label="Reading area" ref={readerRef}>
          <div className="ac-reader-bar">
            <span className="ac-small ac-muted">{book ? book.name : "No file open"}</span>
            <label className="ac-btn ac-btn--ghost ac-btn--sm" style={{ cursor: "pointer" }}>
              {book ? "Open another file" : "Open a book file"}
              <input
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                className="ac-sr-only"
                onChange={(e) => {
                  void onPickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {bookError && (
            <p className="ac-error" role="alert" style={{ padding: "10px 16px 0" }}>
              {bookError}
            </p>
          )}

          {book?.kind === "pdf" ? (
            <>
              <iframe className="ac-reader-pdf" src={book.url} title={book.name} />
              <p className="ac-small ac-muted" style={{ padding: "10px 16px", margin: 0 }}>
                Type your notes in the Notes tab. Some phones cannot show PDFs here, so you can also{" "}
                <a href={book.url} target="_blank" rel="noopener noreferrer" className="ac-link">
                  open it in a new tab
                </a>
                .
              </p>
            </>
          ) : book?.kind === "text" ? (
            <div className="ac-reader-body">
              {book.paragraphs.length === 0 ? (
                <p>This file is empty.</p>
              ) : (
                book.paragraphs.map((p, i) => <p key={i}>{p}</p>)
              )}
            </div>
          ) : (
            <div className="ac-reader-empty">
              <p>
                <strong>Open a PDF, TXT, or Markdown file to read it here.</strong>
              </p>
              <p className="ac-small">
                Your file stays on this device for this visit. In text files you can select a
                passage to save it as a note or ask Stellun about it.
              </p>
            </div>
          )}

          {selection && (
            <div className="ac-selection-bar" role="region" aria-label="Selected text">
              <span className="ac-selection-text">“{selection}”</span>
              <button type="button" className="ac-btn ac-btn--primary ac-btn--sm" onClick={addSelectionToNotes}>
                Add to notes
              </button>
              <button type="button" className="ac-btn ac-btn--ghost ac-btn--sm" onClick={askAboutSelection}>
                Ask Stellun
              </button>
              <button
                type="button"
                className="ac-btn ac-btn--ghost ac-btn--sm"
                aria-label="Dismiss selection"
                onClick={() => setSelection("")}
              >
                Dismiss
              </button>
            </div>
          )}
        </section>

        <aside className="ac-tools" aria-label="Notes, plan, checklist, and books">
          <nav className="ac-tabs ac-tools-tabs" aria-label="Workspace tools">
            {TOOL_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className="ac-tab"
                aria-current={toolTab === t.id ? "true" : undefined}
                onClick={() => setToolTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="ac-tools-body">
            {toolTab === "notes" && (
              <>
                <label className="ac-field">
                  <span className="ac-label">Focus for this session</span>
                  <input
                    className="ac-input"
                    maxLength={MAX_FOCUS}
                    value={ws.focus}
                    placeholder="What are you working on today?"
                    onChange={(e) => update(ws.id, { focus: e.target.value })}
                  />
                </label>
                <label className="ac-field">
                  <span className="ac-label">Notes</span>
                  <textarea
                    className="ac-textarea"
                    rows={10}
                    maxLength={MAX_NOTES}
                    value={ws.notes}
                    placeholder="Write notes, or add passages from the book."
                    onChange={(e) => update(ws.id, { notes: e.target.value })}
                  />
                  <span className="ac-hint">
                    {ws.notes.length} of {MAX_NOTES} characters
                  </span>
                </label>
              </>
            )}

            {toolTab === "plan" && (
              <>
                {!ws.planAccepted && (
                  <p className="ac-hint">Review the plan, then accept it to lock the checklist.</p>
                )}
                {ws.plan.length === 0 ? (
                  <p className="ac-muted">No plan yet.</p>
                ) : (
                  ws.plan.map((p) => (
                    <div key={p.id} className="ac-plan-item">
                      <strong>{p.title}</strong>
                      <div className="ac-small ac-muted">
                        About {p.estimatedSessions} session{p.estimatedSessions === 1 ? "" : "s"}
                      </div>
                      <p className="ac-small" style={{ margin: "6px 0 0" }}>
                        {p.detail}
                      </p>
                    </div>
                  ))
                )}
                {!ws.planAccepted && (
                  <button type="button" className="ac-btn ac-btn--primary" onClick={() => acceptPlan(ws.id)}>
                    Accept plan
                  </button>
                )}
              </>
            )}

            {toolTab === "checklist" && (
              <>
                <div
                  className="ac-bar"
                  role="progressbar"
                  aria-label="Checklist progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                >
                  <i style={{ width: `${pct}%` }} />
                </div>
                <p className="ac-small ac-muted" style={{ margin: 0 }}>
                  {done} of {total} done
                </p>
                {total === 0 ? (
                  <p className="ac-muted">No checklist items yet.</p>
                ) : (
                  <ul className="ac-stack" style={{ gap: 2, listStyle: "none", margin: 0, padding: 0 }}>
                    {ws.checklist.map((item, index) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="ac-check-row"
                          aria-pressed={item.done}
                          onClick={() => toggleChecklistItem(ws.id, item.id, index)}
                        >
                          <span className="ac-check-box" aria-hidden="true">
                            {item.done ? "✓" : ""}
                          </span>
                          <span className="ac-check-label">{item.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {toolTab === "books" && <StudyUploadPanel workspace={ws} />}
          </div>
        </aside>
      </div>
    </div>
  );
}
