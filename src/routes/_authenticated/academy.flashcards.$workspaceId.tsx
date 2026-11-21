import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStudyWorkspaces } from "@/lib/study-workspace";
import { readHighlightsForBooks } from "@/lib/reader-highlights";
import { useBookLibrary } from "@/lib/book-library";
import { askStellun } from "@/lib/reader-ask";
import { artSrc } from "@/lib/academy-art";
import { buildDeck, readKnownCards, writeKnownCards, type FlashCard } from "@/lib/workspace-cards";

/**
 * Flashcards
 * ----------
 * Cards come from this workspace: its study plan, checklist, and highlights.
 * Each card shows a picture that fits its content. Show the answer to turn the
 * card over, then mark it learned or still learning. Stuck? Ask Stellun.
 */

export const Route = createFileRoute("/_authenticated/academy/flashcards/$workspaceId")({
  head: () => ({
    meta: [
      { title: "Flashcards · STELLUN Academy" },
      { name: "description", content: "Review cards built from your study plan and highlights." },
    ],
  }),
  component: FlashcardsRoute,
});

function FlashcardsRoute() {
  const { workspaceId } = Route.useParams();
  return <FlashcardsPage key={workspaceId} workspaceId={workspaceId} />;
}

const KIND_LABEL: Record<FlashCard["kind"], string> = {
  concept: "Concept",
  checklist: "Checklist",
  passage: "Passage",
};

type Explain = { status: "idle" | "loading" | "done" | "error"; text: string };

function FlashcardsPage({ workspaceId }: { workspaceId: string }) {
  const { ready, workspaces } = useStudyWorkspaces();
  const ws = workspaces.find((w) => w.id === workspaceId) ?? null;
  const library = useBookLibrary(workspaceId);
  const highlights = useMemo(() => readHighlightsForBooks(library.books.map((b) => b.id)), [library.books]);
  const deck = useMemo(() => (ws ? buildDeck(ws, highlights) : []), [ws, highlights]);

  const [known, setKnown] = useState<string[]>([]);
  const [mode, setMode] = useState<"all" | "unknown">("all");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [explain, setExplain] = useState<Explain>({ status: "idle", text: "" });

  useEffect(() => {
    setKnown(readKnownCards(workspaceId));
  }, [workspaceId]);

  const queue = useMemo(
    () => (mode === "unknown" ? deck.filter((c) => !known.includes(c.id)) : deck),
    [deck, known, mode],
  );
  const card = queue[index];
  const learned = deck.filter((c) => known.includes(c.id)).length;
  const pct = deck.length ? Math.round((100 * learned) / deck.length) : 0;

  const resetCard = () => {
    setFlipped(false);
    setExplain({ status: "idle", text: "" });
  };

  const mark = (ok: boolean) => {
    if (!card) return;
    const next = ok ? Array.from(new Set([...known, card.id])) : known.filter((id) => id !== card.id);
    setKnown(next);
    writeKnownCards(workspaceId, next);
    resetCard();
    setIndex((i) => (mode === "unknown" && ok ? i : i + 1));
  };

  const jumpTo = (id: string) => {
    let pos = queue.findIndex((c) => c.id === id);
    if (pos < 0) {
      setMode("all");
      pos = deck.findIndex((c) => c.id === id);
    }
    setIndex(Math.max(0, pos));
    resetCard();
  };

  const explainCard = async () => {
    if (!card) return;
    setExplain({ status: "loading", text: "" });
    try {
      const text = await askStellun({
        question: `Explain "${card.front}" in plain language, with one short example.`,
        passage: card.back,
        bookTitle: ws?.bookTitle,
        workspaceTitle: ws?.title,
        onChunk: (t) => setExplain({ status: "loading", text: t }),
      });
      setExplain({ status: "done", text });
    } catch (err) {
      setExplain({
        status: "error",
        text: err instanceof Error ? err.message : "Stellun AI is unavailable right now.",
      });
    }
  };

  if (!ready) {
    return (
      <div className="ac-page">
        <p className="ac-muted">Loading your cards…</p>
      </div>
    );
  }

  if (!ws) {
    return (
      <div className="ac-page">
        <div className="ac-empty">
          <p>This workspace could not be found.</p>
          <Link to="/academy/desk" className="ac-btn ac-btn--primary">
            Back to Study desk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ac-page">
      <header className="ac-top">
        <div>
          <p className="ac-small ac-muted" style={{ margin: 0 }}>
            <Link to="/academy/desk" className="ac-link">Study desk</Link>
            {" / "}
            <Link to="/academy/workspace/$workspaceId" params={{ workspaceId: ws.id }} className="ac-link">
              {ws.title || "Untitled workspace"}
            </Link>
            {" / Flashcards"}
          </p>
          <h1 className="ac-title" style={{ marginTop: 4 }}>Flashcards</h1>
          <p className="ac-sub">
            {deck.length} card{deck.length === 1 ? "" : "s"} from your plan, checklist, and highlights.
          </p>
        </div>
        <div className="ac-seg" role="group" aria-label="Which cards to show">
          <button type="button" aria-pressed={mode === "all"} onClick={() => { setMode("all"); setIndex(0); resetCard(); }}>
            All cards
          </button>
          <button type="button" aria-pressed={mode === "unknown"} onClick={() => { setMode("unknown"); setIndex(0); resetCard(); }}>
            Still learning
          </button>
        </div>
      </header>

      <div className="ac-deck-progress">
        <div className="ac-bar ac-bar--hl" role="progressbar" aria-label="Cards learned" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className="ac-small ac-muted">{learned} of {deck.length} learned</span>
      </div>

      {deck.length === 0 ? (
        <div className="ac-empty">
          <p>No cards yet. Accept your study plan, add checklist items, or highlight passages in the reader.</p>
          <Link to="/academy/workspace/$workspaceId" params={{ workspaceId: ws.id }} className="ac-btn ac-btn--primary">
            Open the reader
          </Link>
        </div>
      ) : !card ? (
        <div className="ac-card ac-deck-done">
          <p className="ac-title" style={{ fontSize: "1.6rem" }}>
            {mode === "unknown" ? "Nothing left to review" : "Deck complete"}
          </p>
          <p className="ac-muted">
            {mode === "unknown"
              ? "Every card here is marked as learned. Well done."
              : `You have learned ${learned} of ${deck.length} cards.`}
          </p>
          <div className="ac-hero-actions">
            <button type="button" className="ac-btn ac-btn--primary" onClick={() => { setMode("all"); setIndex(0); resetCard(); }}>
              Go through all cards again
            </button>
            <Link to="/academy/desk" className="ac-btn ac-btn--ghost">Back to Study desk</Link>
          </div>
        </div>
      ) : (
        <div className="ac-flip-scene">
          <article
            className={`ac-flip ac-flip--${card.kind}${flipped ? " is-flipped" : ""}`}
            aria-live="polite"
          >
            <div className="ac-flip-face ac-flip-front">
              <div className="ac-flip-art">
                <img src={artSrc(card.art)} alt="" />
              </div>
              <div className="ac-flip-body">
                <div className="ac-flashcard-meta">
                  <span className="ac-type ac-type--flashcards">{KIND_LABEL[card.kind]}</span>
                  <span className="ac-small ac-muted">{card.topic} · {index + 1} of {queue.length}</span>
                </div>
                <h2 className="ac-flashcard-front">{card.front}</h2>
                <button type="button" className="ac-btn ac-btn--primary" onClick={() => setFlipped(true)}>
                  Show answer
                </button>
              </div>
            </div>

            <div className="ac-flip-face ac-flip-back" aria-hidden={!flipped}>
              <div className="ac-flashcard-meta">
                <span className="ac-type ac-type--flashcards">Answer</span>
                <span className="ac-small ac-muted">{card.front}</span>
              </div>
              <div className="ac-flashcard-back">{card.back}</div>
              <div className="ac-flashcard-actions">
                <button type="button" className="ac-btn ac-btn--danger" onClick={() => mark(false)}>Still learning</button>
                <button type="button" className="ac-btn ac-btn--primary" onClick={() => mark(true)}>Got it</button>
              </div>
            </div>
          </article>

          <div className="ac-explain">
            <button type="button" className="ac-btn ac-btn--ghost ac-btn--sm" onClick={explainCard} disabled={explain.status === "loading"}>
              {explain.status === "loading" ? "Asking Stellun…" : "Explain with Stellun"}
            </button>
            {explain.status === "error" && <p className="ac-error" role="alert">{explain.text}</p>}
            {explain.text && <div className="ac-answer">{explain.text}</div>}
          </div>
        </div>
      )}

      <section aria-labelledby="all-cards-h">
        <h2 id="all-cards-h" className="ac-h2">All cards</h2>
        <ul className="ac-deck-grid">
          {deck.map((c) => {
            const isKnown = known.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={`ac-deck-item ac-deck-item--${c.kind}${isKnown ? " is-known" : ""}${card?.id === c.id ? " is-current" : ""}`}
                  onClick={() => jumpTo(c.id)}
                >
                  <img className="ac-deck-thumb" src={artSrc(c.art)} alt="" loading="lazy" />
                  <span className="ac-small ac-muted">{KIND_LABEL[c.kind]} · {isKnown ? "Learned" : "Learning"}</span>
                  <span className="ac-deck-item-front">{c.front}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
