import { useMemo } from "react";
import { bookCoverUrl, recommendBooks, type Book } from "@/lib/books";

/**
 * Suggestions for the New workspace dialog.
 * Books come from the shelf and match the workspace title and topic.
 * Picking one fills the topic, title, and author, so the student does not retype them.
 */
export function BookRecommendations({
  title,
  topicId,
  selectedId,
  onPick,
}: {
  title: string;
  topicId: string;
  selectedId: string;
  onPick: (book: Book) => void;
}) {
  const picks = useMemo(() => recommendBooks({ title, topicId, limit: 4 }), [title, topicId]);

  return (
    <section className="ac-recs" aria-labelledby="ac-recs-h">
      <div className="ac-recs-head">
        <span className="ac-label" id="ac-recs-h">Books from the shelf</span>
        <span className="ac-small ac-muted">
          {title.trim() ? "Matched to your title and topic" : "Type a title to see matches"}
        </span>
      </div>

      {picks.length === 0 ? (
        <p className="ac-small ac-muted" style={{ margin: 0 }}>
          No close matches yet. You can still type a book below, or browse the full shelf.
        </p>
      ) : (
        <ul className="ac-rec-grid">
          {picks.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className={`ac-rec${selectedId === b.id ? " is-picked" : ""}`}
                onClick={() => onPick(b)}
                aria-pressed={selectedId === b.id}
              >
                <span className="ac-rec-cover">
                  <span className="ac-rec-fallback">{b.title}</span>
                  <img
                    src={bookCoverUrl(b.isbn13)}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </span>
                <span className="ac-rec-title">{b.title}</span>
                <span className="ac-small ac-muted">{b.authors}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
