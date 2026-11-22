// Academy terminology page: four sections (Aviation, Astronomy, Aerospace, STEM)
// with search and categories. Each term is a card with its short definition,
// the longer explanation, and its symbol and units where they apply.

import { useMemo, useState } from "react";
import {
  CATEGORY_TRACK,
  GLOSSARY,
  GLOSSARY_CATEGORIES,
  GLOSSARY_TRACKS,
  type GlossaryEntry,
  type GlossaryTrack,
} from "@/lib/glossary";

function matches(e: GlossaryEntry, q: string): boolean {
  if (!q) return true;
  const hay = [e.term, e.short, e.detail, e.symbol ?? "", e.units ?? "", ...(e.aka ?? [])].join(" ").toLowerCase();
  return hay.includes(q);
}

export function TerminologiesTab() {
  const [track, setTrack] = useState<GlossaryTrack | "all">("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const sections = useMemo(() => {
    return GLOSSARY_TRACKS.filter((t) => track === "all" || t.id === track).map((t) => {
      const cats = GLOSSARY_CATEGORIES.filter((c) => CATEGORY_TRACK[c.id] === t.id)
        .map((c) => ({
          ...c,
          entries: GLOSSARY.filter((e) => e.category === c.id && matches(e, q)).sort((a, b) => a.term.localeCompare(b.term)),
        }))
        .filter((c) => c.entries.length > 0);
      return { ...t, categories: cats, count: cats.reduce((n, c) => n + c.entries.length, 0) };
    });
  }, [track, q]);

  const total = sections.reduce((n, s) => n + s.count, 0);

  return (
    <div className="term-page">
      <div className="term-toolbar">
        <div className="term-tabs" role="group" aria-label="Choose a section">
          <button type="button" className="term-tab" aria-pressed={track === "all"} onClick={() => setTrack("all")}>
            All sections
          </button>
          {GLOSSARY_TRACKS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="term-tab"
              aria-pressed={track === t.id}
              onClick={() => setTrack(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="term-search">
          <span className="ac-sr-only">Search terms</span>
          <input
            type="search"
            className="ac-input"
            placeholder="Search a term, symbol, or definition"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <p className="ac-small ac-muted term-count">
          {total} of {GLOSSARY.length} terms
        </p>
      </div>

      {sections.map((s) => (
        <section key={s.id} className={`term-section term-section--${s.id}`} aria-labelledby={`term-${s.id}`}>
          <header className="term-section-head">
            <h2 id={`term-${s.id}`}>{s.label}</h2>
            <p className="ac-small ac-muted">{s.blurb}</p>
            <span className="term-section-count">{s.count} terms</span>
          </header>

          {s.categories.length === 0 ? (
            <p className="ac-muted term-empty">No terms match that search in this section.</p>
          ) : (
            s.categories.map((c) => (
              <details key={c.id} className="term-cat" open>
                <summary>
                  <span className="term-cat-label">{c.label}</span>
                  <span className="term-cat-count">{c.entries.length}</span>
                </summary>
                <p className="ac-small ac-muted term-cat-blurb">{c.blurb}</p>
                <ul className="term-grid">
                  {c.entries.map((e) => (
                    <li key={e.term} className="term-card">
                      <div className="term-card-head">
                        <h3>{e.term}</h3>
                        {e.symbol || e.units ? (
                          <span className="term-meta">
                            {e.symbol ? <span className="term-symbol">{e.symbol}</span> : null}
                            {e.units ? <span className="term-units">{e.units}</span> : null}
                          </span>
                        ) : null}
                      </div>
                      {e.aka && e.aka.length > 0 ? <p className="term-aka">Also: {e.aka.join(", ")}</p> : null}
                      <p className="term-short">{e.short}</p>
                      <p className="term-detail">{e.detail}</p>
                    </li>
                  ))}
                </ul>
              </details>
            ))
          )}
        </section>
      ))}

      {total === 0 ? <p className="ac-empty">No terms match that search. Try a shorter word.</p> : null}
    </div>
  );
}
