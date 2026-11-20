import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { MAX_FOCUS, MAX_NOTES, useStudyWorkspaces } from "@/lib/study-workspace";
import { askStellun } from "@/lib/reader-ask";
import { useReaderHighlights, type HighlightColor, type ReaderHighlight } from "@/lib/reader-highlights";
import type { PdfDoc } from "@/lib/pdf-text";

/**
 * Workspace reader
 * ----------------
 * Left: the book. PDF (text view or pages view), TXT, or Markdown.
 * Select any text to get a toolbar: Ask Stellun, highlight, note, or copy.
 * Right: study panel (Stellun answers, highlights, notes, plan, checklist).
 *   - Tablet and laptop (768px and up): docked on the right.
 *   - Phone (below 768px): slides away after a few seconds of no use. A faint
 *     arrow on the right edge brings it back.
 * Book title and author come from the workspace, so they are not entered twice.
 */

export const Route = createFileRoute("/_authenticated/academy/workspace/$workspaceId")({
  head: () => ({
    meta: [
      { title: "Workspace · STELLUN Academy" },
      {
        name: "description",
        content: "Read, highlight, and ask Stellun about any passage in your book.",
      },
    ],
  }),
  component: WorkspaceReader,
});

type Panel = "ask" | "highlights" | "notes" | "plan" | "checklist";

type LoadedDoc =
  | { kind: "text"; name: string; paragraphs: string[] }
  | { kind: "pdf"; name: string; pdf: PdfDoc; paragraphs: string[] };

type SelectionState = { text: string; x: number; y: number };

type AskState = {
  status: "idle" | "loading" | "done" | "error";
  question: string;
  passage: string;
  answer: string;
  error: string;
};

const PANELS: { id: Panel; label: string }[] = [
  { id: "ask", label: "Stellun" },
  { id: "highlights", label: "Highlights" },
  { id: "notes", label: "Notes" },
  { id: "plan", label: "Plan" },
  { id: "checklist", label: "Checklist" },
];

const COLORS: { id: HighlightColor; label: string }[] = [
  { id: "amber", label: "Amber" },
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
];

const MAX_TEXT_BYTES = 3_000_000;
const MAX_PDF_BYTES = 40_000_000;
const HIDE_AFTER_MS = 4500;
const EMPTY_ASK: AskState = { status: "idle", question: "", passage: "", answer: "", error: "" };

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."));
    reader.readAsText(file);
  });
}

function toParagraphs(text: string): string[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Wraps saved highlights inside a paragraph, so they show as coloured marks. */
function renderWithMarks(text: string, marks: ReaderHighlight[]): ReactNode[] {
  if (marks.length === 0) return [text];
  const sorted = [...marks].sort((a, b) => b.text.length - a.text.length);
  const pattern = new RegExp(
    `(${sorted.map((m) => m.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "g",
  );
  return text.split(pattern).map((part, i) => {
    const hit = sorted.find((m) => m.text === part);
    return hit ? (
      <mark key={i} className={`ac-mark ac-mark--${hit.color}`}>
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

function WorkspaceReader() {
  const { workspaceId } = Route.useParams();
  const navigate = useNavigate();
  const { ready, workspaces, update, acceptPlan, toggleChecklistItem } = useStudyWorkspaces();
  const ws = workspaces.find((w) => w.id === workspaceId) ?? null;
  const { highlights, addHighlight, removeHighlight } = useReaderHighlights(workspaceId);

  const [doc, setDoc] = useState<LoadedDoc | null>(null);
  const [docError, setDocError] = useState("");
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [viewMode, setViewMode] = useState<"text" | "pages">("text");
  const [pageNo, setPageNo] = useState(1);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [panel, setPanel] = useState<Panel>("ask");
  const [panelOpen, setPanelOpen] = useState(true);
  const [focusInPanel, setFocusInPanel] = useState(false);
  const [tick, setTick] = useState(0);
  const [ask, setAsk] = useState<AskState>(EMPTY_ASK);
  const [passage, setPassage] = useState("");
  const [draft, setDraft] = useState("");
  const [progress, setProgress] = useState(0);

  const textRef = useRef<HTMLDivElement | null>(null);
  const pageCanvas = useRef<HTMLCanvasElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const bump = () => setTick((t) => t + 1);

  // Release the PDF when the book changes or the page closes.
  useEffect(() => {
    return () => {
      if (doc?.kind === "pdf") doc.pdf.destroy();
    };
  }, [doc]);

  // Reading progress through the text.
  useEffect(() => {
    const onScroll = () => {
      const el = textRef.current;
      if (!el) {
        setProgress(0);
        return;
      }
      const r = el.getBoundingClientRect();
      const total = Math.max(r.height - window.innerHeight * 0.5, 1);
      const passed = Math.min(Math.max(window.innerHeight * 0.25 - r.top, 0), total);
      setProgress(Math.round((passed / total) * 100));
      setSelection(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [doc, viewMode]);

  // Selected text inside the reader opens the floating toolbar.
  useEffect(() => {
    const onSelection = () => {
      const sel = window.getSelection();
      const el = textRef.current;
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !el) return;
      const range = sel.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) return;
      const text = sel.toString().replace(/\s+/g, " ").trim();
      if (text.length < 2) return;
      const rect = range.getBoundingClientRect();
      setSelection({ text: text.slice(0, 1200), x: rect.left + rect.width / 2, y: rect.top });
      bump();
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, [doc]);

  // Draw the current PDF page in pages view.
  useEffect(() => {
    if (viewMode !== "pages" || !doc || doc.kind !== "pdf" || !pageCanvas.current) return;
    let cancelled = false;
    const canvas = pageCanvas.current;
    const width = Math.min(860, canvas.parentElement?.clientWidth || 680);
    doc.pdf.render(pageNo, canvas, width).catch(() => {
      if (!cancelled) setDocError("This page could not be drawn. Try the Text view.");
    });
    return () => {
      cancelled = true;
    };
  }, [viewMode, doc, pageNo]);

  // Phone only: the study panel slides away after a few seconds of no use.
  // It stays open while a question is being answered, while the student is
  // typing in the panel, or while a passage is selected.
  useEffect(() => {
    if (!doc || !panelOpen || focusInPanel || ask.status === "loading" || selection) return;
    const t = window.setTimeout(() => setPanelOpen(false), HIDE_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [doc, panelOpen, focusInPanel, ask.status, selection, tick]);

  const openFile = async (file: File) => {
    setDocError("");
    setLoadingDoc(true);
    try {
      const name = file.name;
      if (/\.pdf$/i.test(name) || file.type === "application/pdf") {
        if (file.size > MAX_PDF_BYTES) {
          throw new Error("That PDF is larger than 40 MB. Try a smaller part of the book.");
        }
        const { openPdf } = await import("@/lib/pdf-text");
        const pdf = await openPdf(file);
        const paragraphs = pdf.hasText ? toParagraphs(pdf.pages.join("\n\n")) : [];
        setDoc({ kind: "pdf", name, pdf, paragraphs });
        setViewMode(pdf.hasText ? "text" : "pages");
        setPageNo(1);
      } else if (/\.(txt|md|markdown)$/i.test(name) || file.type.startsWith("text/")) {
        if (file.size > MAX_TEXT_BYTES) {
          throw new Error("That text file is larger than 3 MB. Try a shorter section.");
        }
        const text = await readAsText(file);
        setDoc({ kind: "text", name, paragraphs: toParagraphs(text) });
        setViewMode("text");
      } else {
        throw new Error("Open a PDF, TXT, or Markdown file. Word and EPUB files come next.");
      }
      setPanelOpen(true);
      bump();
    } catch (err) {
      setDocError(err instanceof Error ? err.message : "Could not open that file.");
    } finally {
      setLoadingDoc(false);
    }
  };

  const runAsk = async (question: string, passageText: string) => {
    if (!question.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPanel("ask");
    setPanelOpen(true);
    setAsk({ status: "loading", question, passage: passageText, answer: "", error: "" });
    try {
      const answer = await askStellun({
        question,
        passage: passageText || undefined,
        bookTitle: ws?.bookTitle || doc?.name,
        workspaceTitle: ws?.title,
        signal: controller.signal,
        onChunk: (text) => setAsk((s) => ({ ...s, answer: text })),
      });
      setAsk((s) => ({ ...s, status: "done", answer }));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setAsk((s) => ({
        ...s,
        status: "error",
        error: err instanceof Error ? err.message : "Stellun AI is unavailable right now.",
      }));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const stopAsk = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setAsk((s) => ({ ...s, status: s.answer ? "done" : "idle" }));
  };

  const submitQuestion = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || ask.status === "loading") return;
    void runAsk(draft.trim(), passage);
    setDraft("");
  };

  const askFromSelection = () => {
    if (!selection) return;
    const text = selection.text;
    setPassage(text);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    void runAsk("Explain this passage in plain language and tell me why it matters.", text);
  };

  const highlightSelection = (color: HighlightColor) => {
    if (!selection) return;
    addHighlight(selection.text, color);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const noteFromSelection = () => {
    if (!selection || !ws) return;
    const next = [ws.notes.trimEnd(), `“${selection.text}”`].filter(Boolean).join("\n\n");
    update(ws.id, { notes: next.slice(0, MAX_NOTES) });
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    setPanel("notes");
    setPanelOpen(true);
  };

  const copySelection = () => {
    if (!selection) return;
    void navigator.clipboard?.writeText(selection.text).catch(() => undefined);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const saveAnswerToNotes = () => {
    if (!ws || !ask.answer) return;
    const block = `Stellun on “${ask.question}”:\n${ask.answer}`;
    update(ws.id, { notes: [ws.notes.trimEnd(), block].filter(Boolean).join("\n\n").slice(0, MAX_NOTES) });
    setPanel("notes");
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
  const bookLine = [ws.bookTitle || doc?.name || "No book named yet", ws.bookAuthor].filter(Boolean).join(" · ");

  return (
    <div className="ac-page">
      <header className="ac-top">
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
            {bookLine} · checklist {pct}%
          </p>
        </div>
        <div className="ac-hero-actions">
          {!ws.planAccepted && (
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => acceptPlan(ws.id)}>
              Accept plan
            </button>
          )}
          <Link to="/ask" className="ac-btn ac-btn--ghost">
            Open full Ask page
          </Link>
        </div>
      </header>

      <div className="ac-split">
        <section className="ac-reader" aria-label="Reading area">
          <div className="ac-reader-bar">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className="ac-small ac-muted">{doc ? doc.name : "No file open"}</span>
              {doc?.kind === "pdf" && doc.paragraphs.length > 0 && (
                <div className="ac-seg" role="group" aria-label="Reading view">
                  <button
                    type="button"
                    aria-pressed={viewMode === "text"}
                    onClick={() => setViewMode("text")}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    aria-pressed={viewMode === "pages"}
                    onClick={() => setViewMode("pages")}
                  >
                    Pages
                  </button>
                </div>
              )}
            </div>
            <label className="ac-btn ac-btn--primary ac-btn--sm" style={{ cursor: loadingDoc ? "wait" : "pointer" }}>
              {loadingDoc ? "Opening…" : doc ? "Open another file" : "Open a file"}
              <input
                type="file"
                accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
                className="ac-sr-only"
                disabled={loadingDoc}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void openFile(file);
                }}
              />
            </label>
          </div>

          {doc && <div className="ac-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>}

          {docError && (
            <p className="ac-error" role="alert" style={{ padding: "12px 16px 0", margin: 0 }}>
              {docError}
            </p>
          )}

          {!doc && !loadingDoc && (
            <div className="ac-reader-empty">
              <p>
                <strong>Open a PDF, TXT, or Markdown file to start reading.</strong>
              </p>
              <p className="ac-small">
                Select any passage to ask Stellun about it, highlight it, or save it to your notes.
                Your file stays on this device for this visit.
              </p>
            </div>
          )}

          {loadingDoc && (
            <div className="ac-reader-empty">
              <p>Opening your file…</p>
            </div>
          )}

          {doc && viewMode === "text" && (
            <div className="ac-reader-body" ref={textRef}>
              {doc.paragraphs.length === 0 ? (
                <p>
                  This PDF has no selectable text, so it is probably a scan. Switch to Pages view to
                  read it.
                </p>
              ) : (
                doc.paragraphs.map((p, i) => <p key={i}>{renderWithMarks(p, highlights)}</p>)
              )}
            </div>
          )}

          {doc && viewMode === "pages" && doc.kind === "pdf" && (
            <div className="ac-pages">
              <canvas ref={pageCanvas} className="ac-page-canvas" aria-label={`Page ${pageNo}`} />
              <div className="ac-pager">
                <button
                  type="button"
                  className="ac-btn ac-btn--ghost ac-btn--sm"
                  disabled={pageNo <= 1}
                  onClick={() => setPageNo((n) => Math.max(1, n - 1))}
                >
                  Previous
                </button>
                <span className="ac-small">
                  Page {pageNo} of {doc.pdf.pageCount}
                </span>
                <button
                  type="button"
                  className="ac-btn ac-btn--ghost ac-btn--sm"
                  disabled={pageNo >= doc.pdf.pageCount}
                  onClick={() => setPageNo((n) => Math.min(doc.pdf.pageCount, n + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        {doc && (
          <button
            type="button"
            className="ac-peek"
            aria-label={panelOpen ? "Hide the study panel" : "Show the study panel"}
            aria-expanded={panelOpen}
            onClick={() => {
              setPanelOpen((o) => !o);
              bump();
            }}
          >
            {panelOpen ? "›" : "‹"}
          </button>
        )}

        <aside
          className="ac-tools"
          data-open={panelOpen ? "true" : "false"}
          aria-label="Study panel"
          onPointerDown={bump}
          onKeyDown={bump}
          onFocus={() => setFocusInPanel(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusInPanel(false);
          }}
        >
          <nav className="ac-tabs ac-tools-tabs" aria-label="Study panel sections">
            {PANELS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="ac-tab"
                aria-current={panel === p.id ? "true" : undefined}
                onClick={() => setPanel(p.id)}
              >
                {p.label}
                {p.id === "highlights" && highlights.length > 0 ? ` (${highlights.length})` : ""}
              </button>
            ))}
          </nav>

          <div className="ac-tools-body">
            {panel === "ask" && (
              <div className="ac-stack">
                <div className="ac-ask-context">
                  <span className="ac-small ac-muted">Asking about</span>
                  <strong>{ws.bookTitle || doc?.name || "This workspace"}</strong>
                </div>

                {passage && (
                  <div className="ac-passage">
                    <span className="ac-small ac-muted">Passage</span>
                    <p>“{passage.length > 400 ? `${passage.slice(0, 400)}…` : passage}”</p>
                    <button
                      type="button"
                      className="ac-btn ac-btn--ghost ac-btn--sm"
                      style={{ marginTop: 8 }}
                      onClick={() => setPassage("")}
                    >
                      Remove passage
                    </button>
                  </div>
                )}

                <form className="ac-stack" style={{ gap: 8 }} onSubmit={submitQuestion}>
                  <label className="ac-field">
                    <span className="ac-sr-only">Your question</span>
                    <textarea
                      className="ac-textarea"
                      rows={3}
                      maxLength={600}
                      value={draft}
                      placeholder={passage ? "Ask about this passage…" : "Ask a question about this book…"}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="submit"
                      className="ac-btn ac-btn--primary"
                      disabled={!draft.trim() || ask.status === "loading"}
                    >
                      Ask Stellun
                    </button>
                    {ask.status === "loading" && (
                      <button type="button" className="ac-btn ac-btn--ghost" onClick={stopAsk}>
                        Stop
                      </button>
                    )}
                  </div>
                </form>

                {ask.status === "error" && (
                  <p className="ac-error" role="alert">
                    {ask.error}
                  </p>
                )}

                {ask.answer ? (
                  <>
                    <div className="ac-answer" aria-live="polite">
                      {ask.answer}
                    </div>
                    {ask.status === "done" && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" className="ac-btn ac-btn--ghost ac-btn--sm" onClick={saveAnswerToNotes}>
                          Save to notes
                        </button>
                        <button
                          type="button"
                          className="ac-btn ac-btn--ghost ac-btn--sm"
                          onClick={() => void runAsk(ask.question, ask.passage)}
                        >
                          Ask again
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  ask.status === "idle" && (
                    <p className="ac-small ac-muted">
                      Select text in the book and choose Ask Stellun, or type a question above.
                    </p>
                  )
                )}
              </div>
            )}

            {panel === "highlights" && (
              <div className="ac-stack">
                {highlights.length === 0 ? (
                  <p className="ac-muted">
                    Select a passage in the book and choose a colour to highlight it. Highlights appear
                    here.
                  </p>
                ) : (
                  highlights.map((h) => (
                    <div key={h.id} className="ac-hl-row">
                      <span className={`ac-hl-dot ac-hl-dot--${h.color}`} aria-hidden="true" />
                      <div className="ac-stack" style={{ gap: 8 }}>
                        <p style={{ margin: 0, fontSize: "0.92rem" }}>{h.text}</p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="ac-btn ac-btn--ghost ac-btn--sm"
                            onClick={() => {
                              setPassage(h.text);
                              setPanel("ask");
                              void runAsk("Explain this passage in plain language.", h.text);
                            }}
                          >
                            Ask Stellun
                          </button>
                          <button
                            type="button"
                            className="ac-btn ac-btn--danger ac-btn--sm"
                            onClick={() => removeHighlight(h.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {panel === "notes" && (
              <div className="ac-stack">
                <FocusTimer />
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
                    placeholder="Write notes, or save passages and answers from the book."
                    onChange={(e) => update(ws.id, { notes: e.target.value })}
                  />
                  <span className="ac-hint">
                    {ws.notes.length} of {MAX_NOTES} characters
                  </span>
                </label>
              </div>
            )}

            {panel === "plan" && (
              <div className="ac-stack">
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
              </div>
            )}

            {panel === "checklist" && (
              <div className="ac-stack">
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
              </div>
            )}
          </div>
        </aside>

        {selection && (
          <div
            className="ac-float"
            role="toolbar"
            aria-label="Selected text actions"
            style={{
              left: Math.min(Math.max(selection.x, 180), window.innerWidth - 180),
              top: Math.max(84, selection.y - 64),
            }}
          >
            <button type="button" className="ac-float-primary" onClick={askFromSelection}>
              Ask Stellun
            </button>
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`ac-swatch ac-swatch--${c.id}`}
                aria-label={`Highlight in ${c.label.toLowerCase()}`}
                title={`Highlight in ${c.label.toLowerCase()}`}
                onClick={() => highlightSelection(c.id)}
              />
            ))}
            <button type="button" onClick={noteFromSelection}>
              Note
            </button>
            <button type="button" onClick={copySelection}>
              Copy
            </button>
            <button type="button" aria-label="Dismiss" onClick={() => setSelection(null)}>
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** A simple 25-minute focus timer for study sessions. */
function FocusTimer() {
  const [secs, setSecs] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && secs === 0) setRunning(false);
  }, [running, secs]);

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div className="ac-timer-card">
      <div className="ac-timer" aria-label={`Focus time left: ${mm} minutes ${ss} seconds`}>
        {mm}:{ss}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" className="ac-btn ac-btn--primary ac-btn--sm" onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : secs === 0 ? "Done. Take a break" : "Start focus"}
        </button>
        <button
          type="button"
          className="ac-btn ac-btn--ghost ac-btn--sm"
          onClick={() => {
            setRunning(false);
            setSecs(25 * 60);
          }}
        >
          Reset
        </button>
      </div>
      <p className="ac-small">25 minutes of focus, then a short break.</p>
    </div>
  );
}
