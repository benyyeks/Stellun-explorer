import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CATALOG, LEVEL_NAME, TRACK_NAME, coverUrl, type CatalogAudience, type CatalogTrack } from "@/lib/book-catalog";

/**
 * Book shelf
 * ----------
 * The catalogue of books for aviation, astronomy, aerospace and STEM, for technical and general
 * readers. Each book has its own detail page. Covers appear where the ISBN has been checked.
 */

export const Route = createFileRoute("/_authenticated/academy/shelf")({
  head: () => ({
    meta: [
      { title: "Book shelf · STELLUN Academy" },
      { name: "description", content: "Books for aviation, astronomy, aerospace and STEM, for technical and general readers." },
    ],
  }),
  component: BookShelfPage,
});

function BookShelfPage() {
  const [audience, setAudience] = useState<"all" | CatalogAudience>("all");
  const [track, setTrack] = useState<"all" | CatalogTrack>("all");
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((b) => {
      if (audience !== "all" && b.audience !== audience) return false;
      if (track !== "all" && !b.tracks.includes(track)) return false;
      if (!q) return true;
      return `${b.title} ${b.authors} ${b.summary}`.toLowerCase().includes(q);
    });
  }, [audience, track, query]);

  return (
    <div className="ac-page">
      <header className="ac-hero">
        <div className="ac-hero-copy">
          <span className="ac-kicker">Academy</span>
          <h1 className="ac-title">Book shelf</h1>
          <p className="ac-hero-sub">Books you can study from, for technical study and for general reading. Open a book for its details.</p>
        </div>
      </header>

      <div className="ac-stack">
        <div className="pr-actions" role="group" aria-label="Reader">
          {([["all", "All readers"], ["technical", "Technical study"], ["general", "General reading"]] as const).map(([id, label]) => (
            <button key={id} type="button" className="ac-tab" aria-pressed={audience === id} onClick={() => setAudience(id)}>{label}</button>
          ))}
        </div>
        <div className="pr-actions" role="group" aria-label="Subject">
          <button type="button" className="ac-tab" aria-pressed={track === "all"} onClick={() => setTrack("all")}>All subjects</button>
          {(Object.keys(TRACK_NAME) as CatalogTrack[]).map((t) => (
            <button key={t} type="button" className="ac-tab" aria-pressed={track === t} onClick={() => setTrack(t)}>{TRACK_NAME[t]}</button>
          ))}
        </div>
        <label className="ac-search">
          <span className="ac-sr-only">Search books</span>
          <input className="ac-input" type="search" placeholder="Search by title, author or topic" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <p className="ac-small ac-muted" style={{ margin: 0 }}>{list.length} of {CATALOG.length} books</p>
      </div>

      {list.length === 0 ? (
        <p className="ac-empty">No books match these filters.</p>
      ) : (
        <ul className="ac-shelf" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {list.map((b) => {
            const cover = coverUrl(b);
            return (
              <li key={b.id}>
                <Link to="/academy/books/$bookId" params={{ bookId: b.id }} className="ac-shelf-card" style={{ textDecoration: "none", height: "100%" }}>
                  {cover ? (
                    <img src={cover} alt={`Cover of ${b.title}`} loading="lazy" style={{ width: "100%", aspectRatio: "2 / 3", objectFit: "cover", borderRadius: 8 }} />
                  ) : (
                    <span
                      aria-hidden="true"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "2 / 3", width: "100%", borderRadius: 8, padding: 10, textAlign: "center", background: "linear-gradient(160deg, #1f3556, #0f1d33)", color: "#f4efe6", fontWeight: 600, fontSize: 13 }}
                    >
                      {b.title}
                    </span>
                  )}
                  <span className="ac-shelf-name">{b.title}</span>
                  <span className="ac-small ac-muted">{b.authors}</span>
                  <span className="ac-small ac-muted" style={{ marginTop: "auto" }}>
                    {b.tracks.map((t) => TRACK_NAME[t]).join(" · ")} · {LEVEL_NAME[b.level]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
