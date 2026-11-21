import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { MAX_FOCUS, MAX_NOTES, useStudyWorkspaces } from "@/lib/study-workspace";
import { askStellun } from "@/lib/reader-ask";
import { buildExcerpt, indexBook, type BookIndex } from "@/lib/book-context";
import { readDocx, readPptx } from "@/lib/office-text";
import {
  clearHighlightsFor,
  migrateLegacyHighlights,
  useReaderHighlights,
  type HighlightColor,
  type HighlightRect,
  type ReaderHighlight,
} from "@/lib/reader-highlights";
import { useBookLibrary, type BookKind, type LibraryBook } from "@/lib/book-library";
import type { PdfDoc } from "@/lib/pdf-text";
import { AnswerText } from "@/components/site/answer-text";

/**
 * Workspace reader
 * ----------------
 * Books (PDF, Word, PowerPoint, TXT, Markdown) are stored on this device, so
 * they reopen after a refresh. A workspace can hold several books.
 *
 * Highlights: tap a start word, then a finish word. Name it, then choose a colour.
 * Stellun: a chat thread. Each question is sent with the part of the book that
 * matches it, so Stellun can read the book, not only its title.
 * Study panel: docked on tablets and laptops (900px and up). On phones it
 * slides in from the right; "Hide" closes it and the Study tab brings it back.
 */

export const Route = createFileRoute("/_authenticated/academy/workspace/$workspaceId")({
  head: () => ({
    meta: [
      { title: "Workspace · STELLUN Academy" },
      { name: "description", content: "Read, highlight, name, and ask Stellun about any passage." },
    ],
  }),
  component: WorkspaceReaderRoute,
});

function WorkspaceReaderRoute() {
  const { workspaceId } = Route.useParams();
  return <WorkspaceReader key={workspaceId} workspaceId={workspaceId} />;
}

/** One selectable unit: a PDF word or a word of a text file. */
type Item = { text: string; left?: number; top?: number; width?: number; height?: number; line?: number };
type Token = { text: string; para: number };
type LoadedDoc =
  | { kind: "pdf"; pdf: PdfDoc; index: BookIndex }
  | { kind: "text"; tokens: Token[]; index: BookIndex };
type Sel = { anchor: number; focus: number } | null;
type Panel = "ask" | "highlights" | "notes" | "plan" | "checklist" | "focus";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  status: "done" | "pending" | "streaming" | "error";
  question?: string | undefined;
  passage?: string | undefined;
};

const PANELS: { id: Panel; label: string }[] = [
  { id: "ask", label: "Stellun" },
  { id: "highlights", label: "Highlights" },
  { id: "notes", label: "Notes" },
  { id: "plan", label: "Plan" },
  { id: "checklist", label: "Checklist" },
  { id: "focus", label: "Focus" },
];

const COLORS: { id: HighlightColor; label: string }[] = [
  { id: "amber", label: "Amber" },
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
];

const MAX_TEXT_BYTES = 600_000;
const MAX_OFFICE_BYTES = 25_000_000;
const MAX_PDF_BYTES = 40_000_000;
const CHAT_KEEP = 30;
const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches;

/** Splits text into paragraphs (one per line) and words. */
function tokenize(text: string): Token[] {
  const out: Token[] = [];
  text.split(/\r?\n/).forEach((line, para) => {
    for (const word of line.split(/\s+/)) {
      if (word) out.push({ text: word, para });
    }
  });
  return out;
}

/** Groups selected words by printed line, so a passage highlights as clean bands. */
function mergeRects(words: Item[]): HighlightRect[] {
  type Span = { line: number; left: number; top: number; right: number; bottom: number };
  const rects: HighlightRect[] = [];
  const toRect = (s: Span): HighlightRect => ({
    left: s.left,
    top: s.top,
    width: s.right - s.left,
    height: s.bottom - s.top,
  });
  let cur: Span | null = null;
  for (const w of words) {
    if (w.left === undefined || w.top === undefined || w.width === undefined || w.height === undefined) continue;
    const right = w.left + w.width;
    const bottom = w.top + w.height;
    const line = w.line ?? -1;
    if (cur && cur.line === line) {
      cur.left = Math.min(cur.left, w.left);
      cur.top = Math.min(cur.top, w.top);
      cur.right = Math.max(cur.right, right);
      cur.bottom = Math.max(cur.bottom, bottom);
    } else {
      if (cur) rects.push(toRect(cur));
      cur = { line, left: w.left, top: w.top, right, bottom };
    }
  }
  if (cur) rects.push(toRect(cur));
  return rects;
}

/** The word index under a pointer event target, if any. */
function indexFrom(target: EventTarget | null): number | null {
  const el = (target as HTMLElement | null)?.closest?.("[data-idx]") as HTMLElement | null;
  if (!el) return null;
  const v = Number(el.dataset["idx"]);
  return Number.isFinite(v) ? v : null;
}

function loadChat(bookId: string): ChatMsg[] {
  try {
    const raw = window.localStorage.getItem(`stellun:reader-chat:v1:${bookId}`);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as ChatMsg[]).slice(-CHAT_KEEP) : [];
  } catch {
    return [];
  }
}

function saveChat(bookId: string, messages: ChatMsg[]) {
  try {
    const keep = messages.filter((m) => m.status === "done" || m.status === "error").slice(-CHAT_KEEP);
    window.localStorage.setItem(`stellun:reader-chat:v1:${bookId}`, JSON.stringify(keep));
  } catch {
    /* storage full or blocked: the chat stays for this visit */
  }
}

function WorkspaceReader({ workspaceId }: { workspaceId: string }) {
  const { ready, workspaces, update, acceptPlan, toggleChecklistItem } = useStudyWorkspaces();
  const ws = workspaces.find((w) => w.id === workspaceId) ?? null;
  const library = useBookLibrary(workspaceId);

  const [bookId, setBookId] = useState<string | null>(null);
  const { highlights, addHighlight, renameHighlight, removeHighlight } = useReaderHighlights(bookId);
  const [doc, setDoc] = useState<LoadedDoc | null>(null);
  const [opening, setOpening] = useState(false);
  const [notice, setNotice] = useState("");
  const [pageNo, setPageNo] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [zoom, setZoom] = useState(1);
  const [drawing, setDrawing] = useState(false);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number } | null>(null);
  const [sel, setSel] = useState<Sel>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("ask");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const [passage, setPassage] = useState("");
  const [draft, setDraft] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dragRef = useRef<{ idx: number; x: number; y: number; type: string } | null>(null);
  const booted = useRef(false);
  const saveTimer = useRef<number | null>(null);

  const current: LibraryBook | null = bookId ? (library.books.find((b) => b.id === bookId) ?? null) : null;
  const index = doc?.index ?? null;
  const hasBookText = (index?.chunks.length ?? 0) > 0;

  useEffect(() => {
    setPanelOpen(isDesktop());
  }, []);

  // Release the PDF when the book changes or the page closes.
  useEffect(() => {
    return () => {
      if (doc?.kind === "pdf") doc.pdf.destroy();
    };
  }, [doc]);

  // Each book keeps its own conversation.
  useEffect(() => {
    setMessages(bookId ? loadChat(bookId) : []);
  }, [bookId]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, panel]);

  const pageCount = doc?.kind === "pdf" ? doc.pdf.pageCount : 1;

  const goToPage = (n: number) => {
    const next = Math.min(Math.max(1, Math.round(n)), pageCount);
    setPageNo(next);
    setSel(null);
  };

  /** Opens a stored book at its last page and zoom. */
  const openRecord = useCallback(
    async (rec: LibraryBook) => {
      setNotice("");
      setOpening(true);
      setSel(null);
      setNameDraft("");
      try {
        migrateLegacyHighlights(workspaceId, rec.id);
        if (rec.kind === "pdf") {
          const { openPdf } = await import("@/lib/pdf-text");
          const pdf = await openPdf(rec.blob);
          const idx = indexBook(pdf.pageTexts.map((text, i) => ({ label: `Page ${i + 1}`, text })));
          setDoc({ kind: "pdf", pdf, index: idx });
          setPageNo(Math.min(Math.max(1, rec.lastPage || 1), pdf.pageCount));
        } else if (rec.kind === "text") {
          const text = await rec.blob.text();
          setDoc({ kind: "text", tokens: tokenize(text), index: indexBook([{ label: "Text", text }]) });
          setPageNo(1);
        } else {
          const buffer = await rec.blob.arrayBuffer();
          const parsed = rec.kind === "docx" ? await readDocx(buffer) : await readPptx(buffer);
          setDoc({ kind: "text", tokens: tokenize(parsed.text), index: indexBook(parsed.sources) });
          setPageNo(1);
        }
        setZoom(rec.zoom || 1);
        setBookId(rec.id);
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Could not open that book.");
      } finally {
        setOpening(false);
      }
    },
    [workspaceId],
  );

  // On arrival, reopen the last book read in this workspace.
  useEffect(() => {
    if (!library.ready || booted.current) return;
    booted.current = true;
    const last = library.books[0];
    if (last) void openRecord(last);
  }, [library.ready, library.books, openRecord]);

  // Draw the current PDF page.
  useEffect(() => {
    if (!doc || doc.kind !== "pdf" || !canvasRef.current) return;
    let alive = true;
    const width = Math.min(stageRef.current?.clientWidth || 680, 980) * zoom;
    setDrawing(true);
    doc.pdf
      .render(pageNo, canvasRef.current, Math.max(240, Math.floor(width)))
      .then(({ cssWidth, cssHeight }) => {
        if (alive) setCanvasSize({ w: cssWidth, h: cssHeight });
      })
      .catch(() => {
        if (alive) setNotice("This page could not be drawn. Try again, or add the file again.");
      })
      .finally(() => {
        if (alive) setDrawing(false);
      });
    return () => {
      alive = false;
    };
  }, [doc, pageNo, zoom]);

  // Save the reading position, so a refresh resumes here.
  useEffect(() => {
    if (!bookId || !doc) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void library.savePosition(bookId, pageNo, zoom);
    }, 400);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [bookId, doc, pageNo, zoom, library.savePosition]);

  useEffect(() => setPageInput(String(pageNo)), [pageNo]);

  // Arrow keys move between pages.
  useEffect(() => {
    if (!doc || doc.kind !== "pdf") return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") goToPage(pageNo + 1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") goToPage(pageNo - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const kindOf = (file: File): BookKind | null => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
    if (name.endsWith(".docx")) return "docx";
    if (name.endsWith(".pptx")) return "pptx";
    if (/\.(txt|md|markdown)$/.test(name) || file.type.startsWith("text/")) return "text";
    return null;
  };

  const addFile = async (file: File) => {
    const kind = kindOf(file);
    if (!kind) {
      setNotice(
        "Open a PDF, Word (.docx), PowerPoint (.pptx), TXT, or Markdown file. For older .doc or .ppt files, save a copy as .docx or .pptx first.",
      );
      return;
    }
    const limit = kind === "pdf" ? MAX_PDF_BYTES : kind === "text" ? MAX_TEXT_BYTES : MAX_OFFICE_BYTES;
    if (file.size > limit) {
      setNotice(`That file is larger than ${Math.round(limit / 1_000_000)} MB. Try a smaller part of it.`);
      return;
    }
    try {
      const rec = await library.add(file, kind);
      await openRecord(rec);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not add that book.");
    }
  };

  const removeBook = async (rec: LibraryBook) => {
    if (!window.confirm(`Remove “${rec.name}”, its highlights, and its chat from this device?`)) return;
    await library.remove(rec.id);
    clearHighlightsFor(rec.id);
    try {
      window.localStorage.removeItem(`stellun:reader-chat:v1:${rec.id}`);
    } catch {
      /* nothing to clean up */
    }
    if (bookId === rec.id) {
      setDoc(null);
      setBookId(null);
      setSel(null);
    }
  };

  const items: Item[] =
    doc?.kind === "pdf" ? (doc.pdf.pageWords[pageNo - 1] ?? []) : doc?.kind === "text" ? doc.tokens : [];

  const range: [number, number] | null = sel
    ? [Math.min(sel.anchor, sel.focus), Math.max(sel.anchor, sel.focus)]
    : null;
  const selItems = range ? items.slice(range[0], range[1] + 1) : [];
  const selText = selItems.map((i) => i.text).join(" ");
  const selRects = doc?.kind === "pdf" ? mergeRects(selItems) : [];
  const inSel = (i: number) => (range ? i >= range[0] && i <= range[1] : false);

  const pageHighlights = doc?.kind === "pdf" ? highlights.filter((h) => h.page === pageNo) : [];
  const textHighlighted = useMemo(() => {
    const set = new Set<number>();
    if (doc?.kind !== "text") return set;
    for (const h of highlights) {
      if (h.page !== 0 || !h.range) continue;
      for (let i = h.range[0]; i <= h.range[1]; i++) set.add(i);
    }
    return set;
  }, [doc, highlights]);

  // Pointer handling. Touch selects only on a tap, so scrolling never selects.
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const idx = indexFrom(e.target);
    if (idx === null) return;
    dragRef.current = { idx, x: e.clientX, y: e.clientY, type: e.pointerType };
    if (e.pointerType === "mouse") setSel({ anchor: idx, focus: idx });
  };

  const onPointerOver = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.type !== "mouse" || e.buttons !== 1) return;
    const idx = indexFrom(e.target);
    if (idx === null) return;
    setSel({ anchor: d.idx, focus: idx });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.type === "mouse") {
      const idx = indexFrom(e.target) ?? d.idx;
      setSel({ anchor: d.idx, focus: idx });
      return;
    }
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return;
    const idx = d.idx;
    setSel((prev) => {
      if (!prev) return { anchor: idx, focus: idx };
      if (prev.anchor === idx && prev.focus === idx) return null;
      return { anchor: prev.anchor, focus: idx };
    });
  };

  const applyHighlight = (color: HighlightColor) => {
    if (!selText || !bookId) return;
    const page = doc?.kind === "pdf" ? pageNo : 0;
    addHighlight({
      name: nameDraft,
      text: selText,
      color,
      page,
      rects: selRects,
      range: doc?.kind === "text" && range ? [range[0], range[1]] : undefined,
    });
    setSel(null);
    setNameDraft("");
  };

  /** Writes to the chat and keeps it saved for this book. */
  const updateMessages = (fn: (prev: ChatMsg[]) => ChatMsg[]) => {
    setMessages((prev) => {
      const next = fn(prev);
      if (bookId) saveChat(bookId, next);
      return next;
    });
  };

  /** Sends a question with the part of the book that matches it. */
  const send = async (question: string, passageText = "") => {
    const q = question.trim();
    if (!q || busy) return;
    const botId = newId();
    updateMessages((prev) => [
      ...prev,
      { id: newId(), role: "user", text: q, status: "done", passage: passageText || undefined },
      { id: botId, role: "assistant", text: "", status: "pending", question: q, passage: passageText || undefined },
    ]);
    setPanel("ask");
    setPanelOpen(true);
    setBusy(true);
    setDraft("");
    setPassage("");

    const controller = new AbortController();
    abortRef.current = controller;
    const excerpt = index ? buildExcerpt(q, index) : "";

    const patchBot = (patch: Partial<ChatMsg>) =>
      updateMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, ...patch } : m)));

    try {
      const answer = await askStellun({
        question: q,
        passage: passageText || undefined,
        bookTitle: current?.name,
        workspaceTitle: ws?.title,
        excerpt: excerpt || undefined,
        signal: controller.signal,
        onChunk: (text) => patchBot({ text, status: "streaming" }),
      });
      patchBot({ text: answer, status: "done" });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        updateMessages((prev) =>
          prev.map((m) =>
            m.id === botId
              ? { ...m, status: "error", text: m.text ? m.text : "Stopped before an answer arrived." }
              : m,
          ),
        );
      } else {
        patchBot({
          status: "error",
          text: err instanceof Error ? err.message : "Stellun AI is unavailable right now.",
        });
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  };

  const stopAnswer = () => {
    abortRef.current?.abort();
  };

  const askSelection = () => {
    if (!selText) return;
    const passageText = selText;
    setSel(null);
    void send("Explain this passage in plain language and tell me why it matters.", passageText);
  };

  const noteSelection = () => {
    if (!selText || !ws) return;
    update(ws.id, {
      notes: [ws.notes.trimEnd(), `“${selText}”`].filter(Boolean).join("\n\n").slice(0, MAX_NOTES),
    });
    setSel(null);
    setPanel("notes");
    setPanelOpen(true);
  };

  const copySelection = () => {
    if (!selText) return;
    void navigator.clipboard?.writeText(selText).catch(() => undefined);
    setSel(null);
  };

  const onComposerKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (draft.trim()) void send(draft, passage);
    }
  };

  const submitQuestion = (e: FormEvent) => {
    e.preventDefault();
    if (draft.trim()) void send(draft, passage);
  };

  const saveAnswerToNotes = (m: ChatMsg) => {
    if (!ws) return;
    const block = `Stellun on “${m.question ?? "a question"}”:\n${m.text}`;
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
  const pctDone = total ? Math.round((100 * done) / total) : 0;
  const bookLine = [ws.bookTitle || current?.name || "No book named yet", ws.bookAuthor].filter(Boolean).join(" · ");
  const hint = "Tap the first word of a passage, then the last word. Choose a colour, or name it first.";
  const kindLabel = (b: LibraryBook) =>
    b.kind === "pdf" ? `Page ${b.lastPage}` : b.kind === "docx" ? "Word document" : b.kind === "pptx" ? "Slides" : "Text file";

  return (
    <div className="ac-page">
      <header className="ac-top">
        <div className="ac-top-copy">
          <p className="ac-small ac-muted ac-crumb">
            <Link to="/academy/desk" className="ac-link">Study desk</Link>
            <span aria-hidden="true"> / </span>
            {ws.title || "Untitled workspace"}
          </p>
          <h1 className="ac-title">{ws.title || "Untitled workspace"}</h1>
          <p className="ac-sub">{bookLine} · checklist {pctDone}%</p>
        </div>
        <div className="ac-top-actions">
          {!ws.planAccepted && (
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => acceptPlan(ws.id)}>
              Accept plan
            </button>
          )}
          <Link to="/academy/flashcards/$workspaceId" params={{ workspaceId: ws.id }} className="ac-btn ac-btn--ghost">
            Flashcards
          </Link>
        </div>
      </header>

      <div className="ac-split" data-panel={doc && panelOpen ? "open" : "closed"}>
        <section className="ac-reader" aria-label="Reading area">
          <div className="ac-shelfbar" role="list" aria-label="Books in this workspace">
            {library.books.map((b) => (
              <div key={b.id} role="listitem" className={`ac-bookchip${b.id === bookId ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="ac-bookchip-open"
                  onClick={() => void openRecord(b)}
                  aria-current={b.id === bookId ? "true" : undefined}
                >
                  <span className="ac-bookchip-name">{b.name}</span>
                  <span className="ac-small ac-muted">{kindLabel(b)}</span>
                </button>
                <button
                  type="button"
                  className="ac-bookchip-x"
                  onClick={() => void removeBook(b)}
                  aria-label={`Remove ${b.name}`}
                  title="Remove this book"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="ac-btn ac-btn--primary ac-btn--sm ac-file-btn">
              {opening ? "Opening…" : "Add a book"}
              <input
                type="file"
                accept=".pdf,.docx,.pptx,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
                className="ac-sr-only"
                disabled={opening}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void addFile(file);
                }}
              />
            </label>
          </div>

          {current && doc && (
            <div className="ac-reader-toolbar">
              <span className="ac-reader-name" title={current.name}>{current.name}</span>
              {doc.kind === "pdf" && (
                <div className="ac-seg" role="group" aria-label="Zoom">
                  <button type="button" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))} aria-label="Zoom out">−</button>
                  <button type="button" onClick={() => setZoom(1)} aria-label="Fit to width">{Math.round(zoom * 100)}%</button>
                  <button type="button" onClick={() => setZoom((z) => Math.min(2, +(z + 0.2).toFixed(2)))} aria-label="Zoom in">+</button>
                </div>
              )}
            </div>
          )}

          {notice && (
            <p className="ac-error ac-reader-notice" role="alert">
              {notice}
            </p>
          )}

          {!doc && !opening && library.books.length === 0 && (
            <div className="ac-reader-empty">
              <p className="ac-reader-empty-title">Add a book to start reading</p>
              <p className="ac-small ac-muted">
                PDF, Word (.docx), PowerPoint (.pptx), TXT, or Markdown. The book stays on this device, so it is still here after a refresh.
              </p>
            </div>
          )}

          {!doc && !opening && library.books.length > 0 && (
            <div className="ac-reader-empty">
              <p className="ac-reader-empty-title">Choose a book above to keep reading</p>
            </div>
          )}

          {opening && (
            <div className="ac-reader-empty">
              <p className="ac-reader-empty-title">Opening your book…</p>
            </div>
          )}

          {doc?.kind === "pdf" && (
            <>
              <nav className="ac-pagebar" aria-label="Page navigation">
                <button type="button" className="ac-btn ac-btn--ghost ac-btn--sm ac-btn-edge" onClick={() => goToPage(1)} disabled={pageNo <= 1} aria-label="First page">⏮</button>
                <button type="button" className="ac-btn ac-btn--ghost ac-btn--sm" onClick={() => goToPage(pageNo - 1)} disabled={pageNo <= 1}>Previous</button>
                <label className="ac-pagebox">
                  <span className="ac-sr-only">Go to page</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={pageCount}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") goToPage(Number(pageInput) || pageNo);
                    }}
                    onBlur={() => goToPage(Number(pageInput) || pageNo)}
                  />
                  <span className="ac-small ac-muted">of {pageCount}</span>
                </label>
                <button type="button" className="ac-btn ac-btn--ghost ac-btn--sm" onClick={() => goToPage(pageNo + 1)} disabled={pageNo >= pageCount}>Next</button>
                <button type="button" className="ac-btn ac-btn--ghost ac-btn--sm ac-btn-edge" onClick={() => goToPage(pageCount)} disabled={pageNo >= pageCount} aria-label="Last page">⏭</button>
              </nav>
              <input
                className="ac-pageslider"
                type="range"
                min={1}
                max={pageCount}
                value={pageNo}
                onChange={(e) => goToPage(Number(e.target.value))}
                aria-label={`Page ${pageNo} of ${pageCount}`}
              />
              <p className="ac-hint ac-reader-hint">
                {doc.pdf.hasText
                  ? hint
                  : "This PDF has no selectable text, so it may be a scan. You can read every page, but highlights need text."}
              </p>
              <div className="ac-pages" ref={stageRef}>
                {drawing && <p className="ac-small ac-muted">Drawing page {pageNo}…</p>}
                <div className="ac-stage" style={canvasSize ? { width: canvasSize.w, height: canvasSize.h } : undefined}>
                  <canvas ref={canvasRef} className="ac-page-canvas" aria-label={`Page ${pageNo}`} />
                  <div className="ac-hl-layer" aria-hidden="true">
                    {pageHighlights.flatMap((h: ReaderHighlight) =>
                      h.rects.map((r, i) => (
                        <span
                          key={`${h.id}-${i}`}
                          className={`ac-hl-rect ac-hl-rect--${h.color}`}
                          style={{ left: pct(r.left), top: pct(r.top), width: pct(r.width), height: pct(r.height) }}
                        />
                      )),
                    )}
                  </div>
                  <div className="ac-hit-layer" onPointerDown={onPointerDown} onPointerOver={onPointerOver} onPointerUp={onPointerUp}>
                    {items.map((w, i) => (
                      <div
                        key={i}
                        data-idx={i}
                        className={`ac-hit${inSel(i) ? " is-sel" : ""}`}
                        style={{ left: pct(w.left ?? 0), top: pct(w.top ?? 0), width: pct(w.width ?? 0), height: pct(w.height ?? 0) }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {doc?.kind === "text" && (
            <>
              <p className="ac-hint ac-reader-hint">{hint}</p>
              <div className="ac-reader-body ac-no-callout" onPointerDown={onPointerDown} onPointerOver={onPointerOver} onPointerUp={onPointerUp}>
                {doc.tokens.length === 0 ? (
                  <p>This file is empty.</p>
                ) : (
                  groupByPara(doc.tokens).map((para, pi) => (
                    <p key={pi}>
                      {para.map((t) => {
                        const cls = ["ac-sent", inSel(t.i) ? "is-sel" : "", textHighlighted.has(t.i) ? "is-hl" : ""]
                          .filter(Boolean)
                          .join(" ");
                        return (
                          <span key={t.i} data-idx={t.i} className={cls}>
                            {t.text}{" "}
                          </span>
                        );
                      })}
                    </p>
                  ))
                )}
              </div>
            </>
          )}

          {sel && selText && (
            <SelectionBar
              count={selItems.length}
              preview={selText}
              name={nameDraft}
              onName={setNameDraft}
              onAsk={askSelection}
              onHighlight={applyHighlight}
              onNote={noteSelection}
              onCopy={copySelection}
              onClear={() => setSel(null)}
            />
          )}
        </section>

        {doc && (
          <aside className="ac-tools" data-open={panelOpen ? "true" : "false"} aria-label="Study panel">
            <div className="ac-tools-head">
              <strong>Study panel</strong>
              <button type="button" className="ac-btn ac-btn--ghost ac-btn--sm" onClick={() => setPanelOpen(false)}>
                Hide ›
              </button>
            </div>

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
                <div className="ac-chat">
                  <div className="ac-chat-thread" ref={threadRef} aria-live="polite">
                    {messages.length === 0 && (
                      <div className="ac-chat-empty">
                        <p className="ac-chat-empty-title">Ask about {current?.name ?? "this book"}</p>
                        <p className="ac-small ac-muted">
                          Type a question below. Stellun reads the part of the book that matches it. For a specific passage, select words and tap Ask Stellun.
                        </p>
                        {!hasBookText && (
                          <p className="ac-error">This book has no readable text, so Stellun can only answer general questions about it.</p>
                        )}
                      </div>
                    )}

                    {messages.map((m) =>
                      m.role === "user" ? (
                        <div key={m.id} className="ac-msg ac-msg--user">
                          <div className="ac-bubble ac-bubble--user">{m.text}</div>
                          {m.passage && <span className="ac-msg-quote">About “{m.passage.length > 80 ? `${m.passage.slice(0, 80)}…` : m.passage}”</span>}
                        </div>
                      ) : (
                        <div key={m.id} className="ac-msg ac-msg--bot">
                          <span className="ac-avatar" aria-hidden="true">S</span>
                          <div className="ac-bubble ac-bubble--bot">
                            {m.status === "pending" ? (
                              <Thinking label={hasBookText ? "Reading the book…" : "Thinking…"} />
                            ) : m.status === "error" ? (
                              <p className="ac-error" role="alert">{m.text}</p>
                            ) : m.status === "streaming" && !m.text ? (
                              <Thinking label="Writing…" />
                            ) : (
                              <AnswerText text={m.text} />
                            )}
                            {m.status === "done" && m.text && (
                              <div className="ac-msg-actions">
                                <button type="button" onClick={() => saveAnswerToNotes(m)}>Save to notes</button>
                                {m.question && (
                                  <button type="button" onClick={() => void send(m.question ?? "", m.passage ?? "")} disabled={busy}>
                                    Ask again
                                  </button>
                                )}
                              </div>
                            )}
                            {m.status === "error" && m.question && (
                              <div className="ac-msg-actions">
                                <button type="button" onClick={() => void send(m.question ?? "", m.passage ?? "")} disabled={busy}>
                                  Try again
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  {passage && (
                    <div className="ac-chat-quote">
                      <span className="ac-small">About “{passage.length > 120 ? `${passage.slice(0, 120)}…` : passage}”</span>
                      <button type="button" aria-label="Remove the passage" onClick={() => setPassage("")}>×</button>
                    </div>
                  )}

                  <form className="ac-composer" onSubmit={submitQuestion}>
                    <label className="ac-sr-only" htmlFor="reader-question">Your question about this book</label>
                    <textarea
                      id="reader-question"
                      className="ac-composer-input"
                      rows={1}
                      maxLength={600}
                      value={draft}
                      placeholder={passage ? "Ask about this passage…" : "Ask about this book…"}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={onComposerKey}
                    />
                    {busy ? (
                      <button type="button" className="ac-send ac-send--stop" onClick={stopAnswer} aria-label="Stop the answer">■</button>
                    ) : (
                      <button type="submit" className="ac-send" disabled={!draft.trim()} aria-label="Send question">↑</button>
                    )}
                  </form>
                </div>
              )}

              {panel === "highlights" && (
                <div className="ac-stack">
                  {highlights.length === 0 ? (
                    <p className="ac-muted">Tap a start word and a finish word, then choose a colour. Highlights appear here.</p>
                  ) : (
                    highlights.map((h) => (
                      <div key={h.id} className="ac-hl-row">
                        <span className={`ac-hl-dot ac-hl-dot--${h.color}`} aria-hidden="true" />
                        <div className="ac-stack" style={{ gap: 8, minWidth: 0 }}>
                          <input
                            key={h.id}
                            className="ac-input ac-hl-name"
                            defaultValue={h.name}
                            maxLength={60}
                            aria-label="Highlight name"
                            onBlur={(e) => renameHighlight(h.id, e.currentTarget.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                          />
                          <span className="ac-small ac-muted">{h.page > 0 ? `Page ${h.page}` : "Text"}</span>
                          <p className="ac-hl-text">{h.text.length > 240 ? `${h.text.slice(0, 240)}…` : h.text}</p>
                          <div className="ac-hl-actions">
                            {h.page > 0 && (
                              <button
                                type="button"
                                className="ac-btn ac-btn--ghost ac-btn--sm"
                                onClick={() => {
                                  goToPage(h.page);
                                  if (!isDesktop()) setPanelOpen(false);
                                }}
                              >
                                Go to page
                              </button>
                            )}
                            <button type="button" className="ac-btn ac-btn--ghost ac-btn--sm" onClick={() => { setPanel("ask"); void send("Explain this passage in plain language.", h.text); }}>
                              Ask Stellun
                            </button>
                            <button type="button" className="ac-btn ac-btn--danger ac-btn--sm" onClick={() => removeHighlight(h.id)}>
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
                    <span className="ac-hint">{ws.notes.length} of {MAX_NOTES} characters</span>
                  </label>
                </div>
              )}

              {panel === "plan" && (
                <div className="ac-stack">
                  {!ws.planAccepted && <p className="ac-hint">Review the plan, then accept it to lock the checklist.</p>}
                  {ws.plan.length === 0 ? (
                    <p className="ac-muted">No plan yet.</p>
                  ) : (
                    ws.plan.map((p) => (
                      <div key={p.id} className="ac-plan-item">
                        <strong>{p.title}</strong>
                        <div className="ac-small ac-muted">About {p.estimatedSessions} session{p.estimatedSessions === 1 ? "" : "s"}</div>
                        <p className="ac-small" style={{ margin: "6px 0 0" }}>{p.detail}</p>
                      </div>
                    ))
                  )}
                  {!ws.planAccepted && (
                    <button type="button" className="ac-btn ac-btn--primary" onClick={() => acceptPlan(ws.id)}>Accept plan</button>
                  )}
                </div>
              )}

              {panel === "checklist" && (
                <div className="ac-stack">
                  <div className="ac-bar" role="progressbar" aria-label="Checklist progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pctDone}>
                    <i style={{ width: `${pctDone}%` }} />
                  </div>
                  <p className="ac-small ac-muted" style={{ margin: 0 }}>{done} of {total} done</p>
                  {total === 0 ? (
                    <p className="ac-muted">No checklist items yet.</p>
                  ) : (
                    <ul className="ac-check-list">
                      {ws.checklist.map((item, index) => (
                        <li key={item.id}>
                          <button type="button" className="ac-check-row" aria-pressed={item.done} onClick={() => toggleChecklistItem(ws.id, item.id, index)}>
                            <span className="ac-check-box" aria-hidden="true">{item.done ? "✓" : ""}</span>
                            <span className="ac-check-label">{item.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {panel === "focus" && <FocusTimer />}
            </div>
          </aside>
        )}

        {doc && !panelOpen && (
          <button type="button" className="ac-pulltab" onClick={() => setPanelOpen(true)} aria-label="Open the study panel">
            <span aria-hidden="true">‹</span>
            <span>Study</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Groups words by paragraph, keeping each word's index for selection. */
function groupByPara(tokens: Token[]): { i: number; text: string }[][] {
  const groups: { i: number; text: string }[][] = [];
  let current = -1;
  tokens.forEach((t, i) => {
    if (t.para !== current) {
      groups.push([]);
      current = t.para;
    }
    const last = groups[groups.length - 1];
    if (last) last.push({ i, text: t.text });
  });
  return groups;
}

/** The three-dot indicator used while Stellun is thinking (same idea as the site widget). */
function Thinking({ label }: { label: string }) {
  return (
    <span className="ac-thinking" role="status">
      <span className="ac-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>{label}</span>
    </span>
  );
}

function SelectionBar({
  count,
  preview,
  name,
  onName,
  onAsk,
  onHighlight,
  onNote,
  onCopy,
  onClear,
}: {
  count: number;
  preview: string;
  name: string;
  onName: (value: string) => void;
  onAsk: () => void;
  onHighlight: (c: HighlightColor) => void;
  onNote: () => void;
  onCopy: () => void;
  onClear: () => void;
}): ReactNode {
  return (
    <div className="ac-selbar" role="toolbar" aria-label="Selected text actions">
      <div className="ac-selbar-text">
        <strong>{count} word{count === 1 ? "" : "s"} selected</strong>
        <span className="ac-small ac-muted">“{preview.length > 90 ? `${preview.slice(0, 90)}…` : preview}”</span>
      </div>
      <div className="ac-selbar-side">
        <input
          className="ac-input ac-selbar-name"
          value={name}
          maxLength={60}
          placeholder="Name this highlight (optional)"
          aria-label="Name this highlight"
          onChange={(e) => onName(e.target.value)}
        />
        <div className="ac-selbar-actions">
          <button type="button" className="ac-selbar-primary" onClick={onAsk}>Ask Stellun</button>
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`ac-swatch ac-swatch--${c.id}`}
              aria-label={`Highlight in ${c.label.toLowerCase()}`}
              title={`Highlight in ${c.label.toLowerCase()}`}
              onClick={() => onHighlight(c.id)}
            />
          ))}
          <button type="button" onClick={onNote}>Note</button>
          <button type="button" onClick={onCopy}>Copy</button>
          <button type="button" aria-label="Clear selection" onClick={onClear}>×</button>
        </div>
      </div>
    </div>
  );
}

/** A 25-minute focus timer for study sessions. */
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
      <div className="ac-timer" aria-label={`Focus time left: ${mm} minutes ${ss} seconds`}>{mm}:{ss}</div>
      <div className="ac-timer-actions">
        <button type="button" className="ac-btn ac-btn--primary ac-btn--sm" onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : secs === 0 ? "Done. Take a break" : "Start focus"}
        </button>
        <button type="button" className="ac-btn ac-btn--ghost ac-btn--sm" onClick={() => { setRunning(false); setSecs(25 * 60); }}>
          Reset
        </button>
      </div>
      <p className="ac-small ac-muted">25 minutes of focus, then a short break.</p>
    </div>
  );
}
