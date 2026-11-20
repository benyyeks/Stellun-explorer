import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BOOKS, BOOK_TOPICS, bookCoverUrl, type Book } from "@/lib/books";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Book shelf
 * ----------
 * The reference books chosen for each topic. The shelf shows covers and titles.
 * Tapping a book opens its details in a centred dialog.
 */

export const Route = createFileRoute("/_authenticated/academy/shelf")({
  head: () => ({
    meta: [
      { title: "Book shelf · STELLUN Academy" },
      {
        name: "description",
        content: "Reference books for aerospace, astronomy, and aviation, with details for each.",
      },
    ],
  }),
  component: BookShelfPage,
});

const topicLabel = (id: string) => BOOK_TOPICS.find((t) => t.id === id)?.label ?? id;
const topicSub = (id: string) => BOOK_TOPICS.find((t) => t.id === id)?.sub ?? "";

function BookShelfPage() {
  const [topic, setTopic] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BOOKS.filter((b) => {
      if (topic !== "all" && b.topic !== topic) return false;
      if (!q) return true;
      return `${b.title} ${b.authors} ${b.note} ${topicLabel(b.topic)}`.toLowerCase().includes(q);
    });
  }, [topic, query]);

  const open: Book | null = BOOKS.find((b) => b.id === openId) ?? null;

  return (
    <div className="ac-page">
      <header className="ac-hero">
        <div className="ac-hero-copy">
          <span className="ac-kicker">Academy</span>
          <h1 className="ac-title">Book shelf</h1>
          <p className="ac-hero-sub">
            Reference books chosen for each topic. Tap a book to see its details.
          </p>
        </div>
        <div className="ac-hero-meta">
          <span className="ac-chip-static">{BOOKS.length} books</span>
          <span className="ac-chip-static">{BOOK_TOPICS.length} topics</span>
        </div>
      </header>

      <div className="shelf-controls">
        <div className="shelf-chips" role="group" aria-label="Filter by topic">
          <button type="button" className="shelf-chip" aria-pressed={topic === "all"} onClick={() => setTopic("all")}>
            All topics
          </button>
          {BOOK_TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="shelf-chip"
              aria-pressed={topic === t.id}
              onClick={() => setTopic(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="shelf-search">
          <span className="ac-sr-only">Search the shelf</span>
          <input
            type="search"
            className="ac-input"
            placeholder="Search by title, author, or topic"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {list.length === 0 ? (
        <div className="ac-empty">
          <p>No books match that search. Try another topic or word.</p>
        </div>
      ) : (
        <ul className="shelf-grid">
          {list.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className="shelf-book"
                onClick={() => setOpenId(b.id)}
                aria-label={`${b.title}. Show details`}
              >
                <span className="shelf-cover">
                  <span className="shelf-cover-fallback">{b.title}</span>
                  <img
                    src={bookCoverUrl(b.isbn13)}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </span>
                <span className="shelf-title">{b.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpenId(null)}>
        <DialogContent className="shelf-dialog">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.title}</DialogTitle>
                <DialogDescription>{open.authors}</DialogDescription>
              </DialogHeader>

              <div className="shelf-detail">
                <div className="shelf-detail-cover">
                  <span className="shelf-cover">
                    <span className="shelf-cover-fallback">{open.title}</span>
                    <img
                      src={bookCoverUrl(open.isbn13)}
                      alt={`Cover of ${open.title}`}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </span>
                </div>

                <dl className="shelf-facts">
                  <div>
                    <dt>Topic</dt>
                    <dd>{topicLabel(open.topic)}</dd>
                  </div>
                  <div>
                    <dt>About the topic</dt>
                    <dd>{topicSub(open.topic)}</dd>
                  </div>
                  <div>
                    <dt>Why it is on the shelf</dt>
                    <dd>{open.note}</dd>
                  </div>
                  <div>
                    <dt>ISBN-13</dt>
                    <dd className="shelf-isbn">{open.isbn13}</dd>
                  </div>
                </dl>

                <div className="shelf-actions">
                  {open.freeUrl && (
                    <a className="ac-btn ac-btn--ghost" href={open.freeUrl} target="_blank" rel="noreferrer">
                      {open.freeLabel ?? "Free version"}
                    </a>
                  )}
                  <Link to="/academy/desk" className="ac-btn ac-btn--primary">
                    Open Study desk
                  </Link>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
