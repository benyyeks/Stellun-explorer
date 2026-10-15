// Study paths block for the Learning resources tab: ordered book sequences
// plus a one-click Stellun AI seed and optional live STELLUN page link.
import { Link, useNavigate } from "@tanstack/react-router";
import { BOOK_TOPICS, bookById } from "@/lib/books";
import { STUDY_PATHS } from "@/lib/study-paths";
import { setAskPrefill } from "@/lib/study-workspace";

export function StudyPathsPanel() {
  const navigate = useNavigate();

  const openAsk = (text: string) => {
    setAskPrefill({ mode: "explain", text });
    void navigate({ to: "/ask" });
  };

  return (
    <div className="glass glass-card scaffold-card" id="study-paths" style={{ marginTop: 24 }}>
      <h2>Study paths</h2>
      <p>
        Short sequences through the textbook shelf. Follow a path in order, keep notes on the
        Study desk, and use Stellun AI when a concept needs a clearer explanation.
      </p>

      <div className="study-path-grid">
        {STUDY_PATHS.map((path) => {
          const topic = BOOK_TOPICS.find((t) => t.id === path.topicId);
          return (
            <article className="study-path-card" key={path.topicId}>
              <h3>{topic?.label ?? path.topicId}</h3>
              <p className="study-path-blurb">{path.blurb}</p>
              <ol className="study-path-steps">
                {path.steps.map((step, i) => {
                  const book = bookById(step.bookId);
                  if (!book) return null;
                  return (
                    <li key={step.bookId}>
                      <span className="study-path-step-num mono">{i + 1}</span>
                      <div>
                        <strong>{book.title}</strong>
                        <span className="book-author"> — {book.authors}</span>
                        <p className="study-path-why">{step.why}</p>
                        {book.freeUrl && book.freeLabel && (
                          <a
                            href={book.freeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent"
                          >
                            {book.freeLabel}
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div className="study-path-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => openAsk(path.askSeed)}>
                  Stellun AI
                </button>
                <Link
                  to="/academy"
                  search={{ tab: "study", list: undefined }}
                  className="btn btn-ghost btn-sm"
                >
                  Open Study desk
                </Link>
                {path.liveLink && (
                  <Link to={path.liveLink.to} className="btn btn-ghost btn-sm">
                    {path.liveLink.label}
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
