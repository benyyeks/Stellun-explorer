import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BOOK_TOPICS } from "@/lib/books";
import { useAcademyContent, type ShelfBook } from "@/lib/academy-content";

/**
 * Book shelf
 * ----------
 * Reference books for each topic. Covers and titles only. Tapping a book opens
 * its details in the same card style as the competitions, so both feel alike.
 */

export const Route = createFileRoute("/_authenticated/academy/shelf")({
  head: () => ({
    meta: [
      { title: "Book shelf · STELLUN Academy" },
      { name: "description", content: "Reference books for aerospace, astronomy, aviation, and STEM, with details for each." },
    ],
  }),
  component: BookShelfPage,
});

const topicLabel = (id: string) => BOOK_TOPICS.find((t) => t.id === id)?.label ?? id;
const topicSub = (id: string) => BOOK_TOPICS.find((t) => t.id === id)?.sub ?? "";

function BookShelfPage() {
  const content = useAcademyContent();
  const books = content.books;
  const [topic, setTopic] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      if (topic !== "all" && b.topic !== topic) return false;
      if (!q) return true;
      return `${b.title} ${b.authors} ${b.note} ${topicLabel(b.topic)}`.toLowerCase().includes(q);
    });
  }, [books, topic, query]);

  const open: ShelfBook | null = books.find((b) => b.id === openId) ?? null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="ac-page">
      <header className="ac-hero">
        <div className="ac-hero-copy">
          <span className="ac-kicker">Academy</span>
          <h1 className="ac-title">Book shelf</h1>
          <p className="ac-hero-sub">Reference books chosen for each topic. Tap a book to see its details.</p>
        </div>
        <div className="ac-hero-meta">
          <span className="ac-chip-static">{books.length} books</span>
          <span className="ac-chip-static">{BOOK_TOPICS.length} topics</span>
        </div>
      </header>

      <div className="shelf-controls">
        <div className="shelf-chips" role="group" aria-label="Filter by topic">
          <button type="button" className="shelf-chip" aria-pressed={topic === "all"} onClick={() => setTopic("all")}>
            All topics
          </button>
          {BOOK_TOPICS.map((t) => (
            <button key={t.id} type="button" className="shelf-chip" aria-pressed={topic === t.id} onClick={() => setTopic(t.id)}>
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
              <button type="button" className="shelf-book" onClick={() => setOpenId(b.id)} aria-label={`${b.title}. Show details`}>
                <span className="shelf-cover">
                  <span className="shelf-cover-fallback">{b.title}</span>
                  <img
                    src={b.cover}
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

      {open && (
        <div className="comp-modal-backdrop" role="presentation" onClick={() => setOpenId(null)}>
          <div
            className="glass glass-card comp-modal shelf-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shelf-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="comp-modal-close" onClick={() => setOpenId(null)} aria-label="Close">
              ×
            </button>
            <div className="comp-modal-hero shelf-modal-hero">
              <span className="shelf-modal-fallback">{open.title}</span>
              <img
                src={open.cover}
                alt={`Cover of ${open.title}`}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="comp-modal-body">
              <span className="badge badge-accent">{topicLabel(open.topic)}</span>
              <h2 id="shelf-modal-title">{open.title}</h2>
              <p className="competition-org">{open.authors}</p>
              <p className="comp-modal-desc">{open.note}</p>
              <dl className="comp-meta">
                <dt>About this topic</dt>
                <dd>{topicSub(open.topic)}</dd>
                <dt>ISBN-13</dt>
                <dd className="shelf-isbn">{open.isbn13}</dd>
                {open.freeUrl ? (
                  <>
                    <dt>Free version</dt>
                    <dd>
                      <a href={open.freeUrl} target="_blank" rel="noopener noreferrer">
                        {open.freeLabel ?? "Open the free version"}
                      </a>
                    </dd>
                  </>
                ) : null}
              </dl>
              <div className="shelf-modal-actions">
                <Link to="/academy/desk" className="btn btn-primary">
                  Start a workspace with this book
                </Link>
                <button type="button" className="btn" onClick={() => setOpenId(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
