import { createFileRoute, Link } from "@tanstack/react-router";
import { LEVEL_NAME, TRACK_NAME, coverUrl, findBook, relatedBooks } from "@/lib/book-catalog";

/**
 * Book detail page. One page per book: what it covers, who it is for, how to study with it,
 * free access where it has been checked, and the books to read next.
 */

export const Route = createFileRoute("/_authenticated/academy/books/$bookId")({
  head: () => ({
    meta: [
      { title: "Book · STELLUN Academy" },
      { name: "description", content: "Details of a book for aviation, astronomy, aerospace and STEM study." },
    ],
  }),
  component: BookDetailPage,
});

function BookDetailPage() {
  const { bookId } = Route.useParams();
  const book = findBook(bookId);

  if (!book) {
    return (
      <div className="ac-page">
        <div className="ac-card">
          <h1 className="ac-h2">Book not found</h1>
          <p className="ac-muted">This book is not on the shelf yet.</p>
          <Link to="/academy/shelf" className="btn">Back to the book shelf</Link>
        </div>
      </div>
    );
  }

  const cover = coverUrl(book);
  const next = relatedBooks(book);

  return (
    <div className="ac-page">
      <header className="ac-hero">
        <div className="ac-hero-copy">
          <span className="ac-kicker">{book.tracks.map((t) => TRACK_NAME[t]).join(" · ")} · {LEVEL_NAME[book.level]}</span>
          <h1 className="ac-title">{book.title}</h1>
          <p className="ac-hero-sub">{book.authors}</p>
        </div>
      </header>

      <div className="ac-card" style={{ display: "grid", gridTemplateColumns: "minmax(0, 140px) 1fr", gap: 16, alignItems: "start" }}>
        {cover ? (
          <img src={cover} alt={`Cover of ${book.title}`} loading="lazy" style={{ width: "100%", aspectRatio: "2 / 3", objectFit: "cover", borderRadius: 8 }} />
        ) : (
          <div
            aria-hidden="true"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "2 / 3", width: "100%", borderRadius: 8, padding: 10, textAlign: "center", background: "linear-gradient(160deg, #1f3556, #0f1d33)", color: "#f4efe6", fontWeight: 600, fontSize: 13 }}
          >
            {book.title}
          </div>
        )}
        <div className="ac-stack">
          <p className="ac-small ac-muted" style={{ margin: 0 }}>
            {book.audience === "technical" ? "For technical study" : "For general reading"}
            {book.isbn13 ? ` · ISBN ${book.isbn13}` : " · cover to be added after the ISBN is checked"}
          </p>
          <p style={{ margin: 0 }}>{book.summary}</p>
        </div>
      </div>

      <section className="ac-card">
        <h2 className="ac-h2">What it covers</h2>
        <ul className="ac-small" style={{ margin: 0, paddingLeft: 18 }}>
          {book.covers.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </section>

      <section className="ac-card">
        <h2 className="ac-h2">Who it is for</h2>
        <p style={{ margin: 0 }}>{book.whoFor}</p>
      </section>

      <section className="ac-card">
        <h2 className="ac-h2">How to study with it</h2>
        <ul className="ac-small" style={{ margin: 0, paddingLeft: 18 }}>
          {book.studyTips.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </section>

      {book.free ? (
        <section className="ac-card">
          <h2 className="ac-h2">Free access</h2>
          <p style={{ margin: 0 }}>
            <a href={book.free.url} target="_blank" rel="noopener noreferrer">{book.free.label}</a>
          </p>
        </section>
      ) : null}

      {next.length > 0 ? (
        <section className="ac-card">
          <h2 className="ac-h2">Read next</h2>
          <ul className="ac-small" style={{ margin: 0, paddingLeft: 18 }}>
            {next.map((b) => (
              <li key={b.id}>
                <Link to="/academy/books/$bookId" params={{ bookId: b.id }}>{b.title}</Link>
                <span className="ac-muted"> · {b.authors}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="pr-actions">
        <Link to="/academy/workspaces" className="btn btn-primary">Start a workspace</Link>
        <Link to="/academy/shelf" className="btn">Back to the book shelf</Link>
      </div>
    </div>
  );
}
