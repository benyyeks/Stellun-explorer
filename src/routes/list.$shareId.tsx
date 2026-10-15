// A stable, public view of one shared reading list. The share identifier lives
// in the path, so a copied link always resolves to the same page without
// depending on query parameters or the size of the list.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { SkeletonImage } from "@/components/site/skeleton-image";
import { PageHeroSkeleton } from "@/components/site/page-skeleton";
import { BOOK_TOPICS, bookById, bookCoverUrl, type Book } from "@/lib/books";
import { getSharedList, type SharedListView } from "@/lib/shared-list.functions";

export const Route = createFileRoute("/list/$shareId")({
  loader: async ({ params }): Promise<SharedListView> => {
    try {
      return await getSharedList({ data: { shareId: params.shareId } });
    } catch {
      return { found: false, title: null, includeNotes: false, books: [] };
    }
  },
  head: ({ loaderData }) => {
    const title = loaderData?.found
      ? `${loaderData.title || "Shared reading list"} — STELLUN`
      : "Reading list unavailable — STELLUN";
    const description = loaderData?.found
      ? `A shared aerospace reading list of ${loaderData.books.length} ${
          loaderData.books.length === 1 ? "textbook" : "textbooks"
        } from the STELLUN shelf.`
      : "This reading list is not available. The owner may have turned sharing off.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        ...(loaderData?.found ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  pendingComponent: () => (
    <main className="page-main">
      <section>
        <div className="container narrow">
          <PageHeroSkeleton />
        </div>
      </section>
    </main>
  ),
  errorComponent: () => <SharedListMissing />,
  component: SharedListPage,
});

function SharedListMissing() {
  return (
    <main className="page-main">
      <section>
        <div className="container narrow">
          <div className="page-hero">
            <span className="eyebrow">Reading list</span>
            <h1>This list is not available</h1>
            <p className="tagline">
              The link may have been changed, or the owner has turned sharing
              off. The full textbook shelf is always open to browse.
            </p>
          </div>
          <div className="list-actions">
            <Link to="/academy" search={{ tab: "resources", list: undefined }} className="btn btn-primary btn-sm">
              Open the textbook shelf
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function SharedListPage() {
  const view = Route.useLoaderData();

  const items = useMemo(
    () =>
      view.books
        .map((b) => ({ book: bookById(b.bookId), note: b.note }))
        .filter(
          (x): x is { book: Book; note: string | null } => !!x.book
        ),
    [view.books]
  );

  if (!view.found) return <SharedListMissing />;

  const topicLabel = (id: string) =>
    BOOK_TOPICS.find((t) => t.id === id)?.label ?? "Aerospace";

  return (
    <main className="page-main">
      <section>
        <div className="container narrow">
          <div className="page-hero">
            <span className="eyebrow">Shared reading list</span>
            <h1>{view.title || "An aerospace reading list"}</h1>
            <p className="tagline">
              {items.length} {items.length === 1 ? "textbook" : "textbooks"} from
              the STELLUN shelf, selected by the person who shared this link.
            </p>
          </div>

          <div className="glass glass-card scaffold-card">
            {items.length === 0 ? (
              <p>
                This list is currently empty. Browse the full shelf to build one
                of your own.
              </p>
            ) : (
              <ul className="wishlist">
                {items.map(({ book, note }) => (
                  <li key={book.id} className="book-row">
                    <SkeletonImage
                      src={bookCoverUrl(book.isbn13)}
                      className="book-cover book-cover-sm"
                      alt={`Cover of ${book.title}`}
                    />
                    <div className="book-meta">
                      <strong>{book.title}</strong>
                      <span className="book-author">{book.authors}</span>
                      <span className="book-sub">{topicLabel(book.topic)}</span>
                      {view.includeNotes && note && (
                        <p className="book-note">{note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="list-actions">
              <Link to="/academy" search={{ tab: "resources", list: undefined }} className="btn btn-primary btn-sm">
                Browse the full shelf
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
