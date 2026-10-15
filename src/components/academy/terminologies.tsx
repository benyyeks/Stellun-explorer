// Academy tab 1: aerospace terminology reference with search, category
// filters, expandable definition cards, and one-click Stellun AI explain.
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  GLOSSARY,
  GLOSSARY_CATEGORIES,
  type GlossaryCategory,
  type GlossaryEntry,
} from "@/lib/glossary";
import { setAskPrefill } from "@/lib/study-workspace";

function matches(entry: GlossaryEntry, q: string): boolean {
  if (!q) return true;
  const hay = [entry.term, entry.short, entry.detail, entry.symbol ?? "", ...(entry.aka ?? [])]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function TerminologiesTab() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GlossaryCategory | "all">("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    return GLOSSARY_CATEGORIES.filter((c) => category === "all" || c.id === category)
      .map((c) => ({
        ...c,
        entries: GLOSSARY.filter((e) => e.category === c.id && matches(e, q)),
      }))
      .filter((g) => g.entries.length > 0);
  }, [category, q]);

  const total = useMemo(() => groups.reduce((n, g) => n + g.entries.length, 0), [groups]);

  const toggle = (term: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });

  const explainTerm = (term: string, short: string) => {
    setAskPrefill({
      mode: "explain",
      text: `Explain "${term}" for an engineering student. Short definition to expand on: ${short}. Use one concrete spaceflight example. Label any estimate as an estimate.`,
    });
    void navigate({ to: "/ask" });
  };

  return (
    <section className="academy-tab-body">
      <div className="container">
        <div className="academy-toolbar">
          <label className="field-label" htmlFor="glossary-search">
            Search terminology
          </label>
          <input
            id="glossary-search"
            type="search"
            className="input"
            placeholder="Delta-v, inclination, specific impulse, Kp index"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <p className="academy-count mono">
            {total} of {GLOSSARY.length} entries
          </p>
        </div>

        <div className="chip-row" role="group" aria-label="Filter terminology by category">
          <button
            type="button"
            className={`chip${category === "all" ? " chip-active" : ""}`}
            onClick={() => setCategory("all")}
            aria-pressed={category === "all"}
          >
            All categories
          </button>
          {GLOSSARY_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip${category === c.id ? " chip-active" : ""}`}
              onClick={() => setCategory(c.id)}
              aria-pressed={category === c.id}
            >
              {c.label}
            </button>
          ))}
        </div>

        {groups.length === 0 ? (
          <div className="glass glass-card scaffold-card" style={{ marginTop: 16 }}>
            <p className="ask-hint">
              No terms match that search. Try a shorter phrase, or clear the filters to browse
              every category.
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <div className="glossary-group" key={g.id} id={g.id}>
              <div className="glossary-group-head">
                <h2>{g.label}</h2>
                <p>{g.blurb}</p>
              </div>
              <div className="glossary-grid">
                {g.entries.map((e) => {
                  const isOpen = open.has(e.term) || !!q;
                  return (
                    <article className="glossary-card" key={e.term}>
                      <button
                        type="button"
                        className="glossary-card-head"
                        onClick={() => toggle(e.term)}
                        aria-expanded={isOpen}
                      >
                        <span className="glossary-term">
                          {e.term}
                          {e.symbol && <span className="glossary-symbol mono">{e.symbol}</span>}
                        </span>
                        <svg
                          className={`chevron${isOpen ? " chevron-open" : ""}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          aria-hidden="true"
                        >
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <p className="glossary-short">{e.short}</p>
                      {isOpen && (
                        <div className="glossary-detail">
                          <p>{e.detail}</p>
                          <div className="glossary-meta">
                            {e.units && (
                              <span>
                                Units <b className="mono">{e.units}</b>
                              </span>
                            )}
                            {e.aka && e.aka.length > 0 && (
                              <span>Also called {e.aka.join(", ")}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm glossary-ask-btn"
                            onClick={() => explainTerm(e.term, e.short)}
                          >
                            Explain in Stellun AI
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
