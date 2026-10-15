import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { SkeletonImage } from "@/components/site/skeleton-image";
import { EngineeringNotes } from "@/components/academy/engineering-notes";
import { StudyPathsPanel } from "@/components/academy/study-paths-panel";
import { useQuery } from "@tanstack/react-query";
import { getCompetitions } from "@/lib/news.functions";
import {
  BOOKS,
  BOOK_TOPICS,
  bookById,
  bookCoverUrl,
  type Book,
} from "@/lib/books";
import { useShareSettings } from "@/lib/share-settings";
import {
  MAX_NOTE,
  decodeShareParam,
  encodeShareParam,
  parseWishlistFile,
  serializeWishlist,
  useWishlist,
} from "@/lib/wishlist";

const SECTIONS: { id: string; label: string }[] = [
  { id: "orbital-mechanics", label: "Orbital mechanics" },
  { id: "orbital-regimes", label: "Orbital regimes" },
  { id: "spacecraft-engineering", label: "Spacecraft engineering" },
  { id: "shelf", label: "Textbook shelf" },
  { id: "reading-list", label: "My reading list" },
  { id: "stem", label: "STEM programs" },
  { id: "citizen-science", label: "Citizen science" },
  { id: "competitions", label: "Student competitions" },
];

// Copies text to the clipboard with a fallback for browsers that block the
// async clipboard API outside secure gestures.
type SortKey = "recent" | "title" | "author" | "topic";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function LearningResourcesTab({ sharedParam }: { sharedParam?: string | undefined }) {
  const navigate = useNavigate();
  const { entries, toggle, importMany, isSaved, setNote } = useWishlist();
  const {
    settings: shareSettings,
    save,
    available: shareAvailable,
  } = useShareSettings();
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [shareTitle, setShareTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep the title box in step with the stored setting once it loads.
  useEffect(() => {
    setShareTitle(shareSettings.title);
  }, [shareSettings.title]);

  const validIds = useMemo(() => new Set(BOOKS.map((b) => b.id)), []);
  const sharedBooks = useMemo(
    () =>
      (sharedParam ? decodeShareParam(sharedParam, validIds) : [])
        .map((id) => bookById(id))
        .filter((b): b is Book => !!b),
    [sharedParam, validIds]
  );
  const savedBooks = useMemo(
    () =>
      entries
        .map((e) => bookById(e.id))
        .filter((b): b is Book => !!b),
    [entries]
  );

  const noteOf = (id: string) => entries.find((e) => e.id === id)?.note ?? "";

  const topicLabel = (id: string) =>
    BOOK_TOPICS.find((t) => t.id === id)?.label ?? "Aerospace";

  const visibleBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const order = new Map(entries.map((e, i) => [e.id, i]));
    const filtered = q
      ? savedBooks.filter((b) =>
          [b.title, b.authors, topicLabel(b.topic)]
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : savedBooks;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "author") return a.authors.localeCompare(b.authors);
      if (sort === "topic")
        return (
          topicLabel(a.topic).localeCompare(topicLabel(b.topic)) ||
          a.title.localeCompare(b.title)
        );
      return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
    });
    return sorted;
  }, [entries, query, savedBooks, sort]);

  const copyListPageLink = async () => {
    if (!shareSettings.shareId) return;
    const url = `${window.location.origin}/list/${shareSettings.shareId}`;
    const ok = await copyText(url);
    setNotice(
      ok
        ? "List page link copied. It will always open your current list."
        : `Copy this link to share your list page: ${url}`
    );
  };

  const copyShareLink = async () => {
    const url = `${window.location.origin}/academy?tab=resources&list=${encodeShareParam(
      entries.map((e) => e.id)
    )}`;
    const ok = await copyText(url);
    setNotice(
      ok
        ? "Share link copied. Anyone opening it will see this reading list."
        : `Copy this link to share your list: ${url}`
    );
  };

  const exportList = () => {
    const blob = new Blob([serializeWishlist(entries, bookById)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stellun-reading-list.json";
    a.click();
    URL.revokeObjectURL(a.href);
    setNotice("Reading list exported as a JSON file.");
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const ids = parseWishlistFile(await file.text(), validIds);
      const added = importMany(ids);
      setNotice(
        added > 0
          ? `Added ${added} ${added === 1 ? "book" : "books"} to your reading list.`
          : "Every book in that file was already on your list."
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "That file could not be read.");
    }
  };

  const saveSharedList = () => {
    const added = importMany(sharedBooks.map((b) => b.id));
    setNotice(
      added > 0
        ? `Added ${added} ${added === 1 ? "book" : "books"} to your reading list.`
        : "Every shared book was already on your list."
    );
    navigate({ to: "/academy", search: { tab: "resources", list: undefined }, replace: true });
  };

  const dismissSharedList = () =>
    navigate({ to: "/academy", search: { tab: "resources", list: undefined }, replace: true });

  return (
    <section className="academy-tab-body">
        <div className="container narrow">
          <nav className="section-jump" aria-label="Sections in learning resources">
            {SECTIONS.map((sec) => (
              <a key={sec.id} href={`#${sec.id}`} className="section-jump-link">
                {sec.label}
              </a>
            ))}
          </nav>

          <EngineeringNotes />
          <StudyPathsPanel />

          <div
            className="glass glass-card scaffold-card"
            id="stem"
            style={{ marginTop: 24 }}
          >
            <h2>STEM programs</h2>
            <p>
              NASA offers programs for students from middle school through
              college, ranging from design challenges to hands-on engineering
              experience.
            </p>
            <ul className="feature-list">
              <li>
                <strong>
                  <a
                    href="https://www.nasa.gov/learning-resources/nasa-stem-opportunities-activities/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent"
                  >
                    NASA STEM Opportunities
                  </a>
                  :{" "}
                </strong>
                Challenges and activities for middle school, high school, and
                college students across the United States.
              </li>
              <li>
                <strong>
                  <a
                    href="https://www.nasa.gov/learning-resources/join-artemis/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent"
                  >
                    Join the Artemis Mission to the Moon
                  </a>
                  :{" "}
                </strong>
                Design challenges, hands-on activities, and competitions tied to
                the Artemis program, open to students and educators.
              </li>
              <li>
                <strong>
                  <a
                    href="https://www.nasa.gov/learning-resources/launch-into-a-new-school-year-with-nasa/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent"
                  >
                    NASA Learning Resources
                  </a>
                  :{" "}
                </strong>
                A broad catalog of experiences connecting students with NASA
                missions, internships, and career pathways.
              </li>
            </ul>
            <h3 className="stem-subhead">International programs</h3>
            <ul className="feature-list">
              {INTL_STEM.map((p) => (
                <li key={p.name}>
                  <strong>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-accent">
                      {p.name}
                    </a>
                    :{" "}
                  </strong>
                  {p.text}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="glass glass-card scaffold-card"
            id="citizen-science"
            style={{ marginTop: 24 }}
          >
            <h2>Citizen science</h2>
            <p>
              NASA sponsors dozens of citizen science projects open to everyone,
              regardless of citizenship or background. Volunteers have helped
              make thousands of important scientific discoveries through these
              programs.
            </p>
            <ul className="feature-list">
              <li>
                <a
                  href="https://science.nasa.gov/citizen-science/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent"
                >
                  NASA Citizen Science Projects
                </a>
                {" "}: 46 active projects open to the public, spanning
                astrophysics, heliophysics, planetary science, and Earth science.
              </li>
            </ul>
          </div>

          <div
            className="glass glass-card scaffold-card"
            id="competitions"
            style={{ marginTop: 24 }}
          >
            <h2>Student competitions</h2>
            <p>
              These are verified, active competitions for student teams
              interested in aerospace engineering and space science.
            </p>
            <CompetitionGrid />
          </div>

          {sharedBooks.length > 0 && (
            <div
              className="glass glass-card scaffold-card shared-list"
              style={{ marginTop: 24 }}
            >
              <h2>A reading list was shared with you</h2>
              <p>
                Someone sent you {sharedBooks.length}{" "}
                {sharedBooks.length === 1 ? "book" : "books"} from the STELLUN
                textbook shelf. Save them to keep the list in this browser.
              </p>
              <ul className="feature-list">
                {sharedBooks.map((b) => (
                  <li key={b.id}>
                    <strong>{b.title}</strong>,{" "}
                    <span className="book-author">{b.authors}</span>
                  </li>
                ))}
              </ul>
              <div className="list-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={saveSharedList}
                >
                  Save to my list
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={dismissSharedList}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div
            className="glass glass-card scaffold-card"
            id="reading-list"
            style={{ marginTop: 24 }}
          >
            <h2>My reading list</h2>
            {savedBooks.length === 0 ? (
              <p>
                Nothing saved yet. Use the Save button beside any book on the
                shelf below to start a personal reading list. Sign in to keep it
                on your account, add a study note to each title, and publish a
                permanent link others can open.
              </p>
            ) : (
              <>
                <div className="list-filters">
                  <label className="field">
                    <span className="field-label">Search saved books</span>
                    <input
                      type="search"
                      value={query}
                      placeholder="Title, author or discipline"
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <label className="field field-sm">
                    <span className="field-label">Sort by</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                    >
                      <option value="recent">Recently saved</option>
                      <option value="title">Title</option>
                      <option value="author">Author</option>
                      <option value="topic">Discipline</option>
                    </select>
                  </label>
                </div>

                {visibleBooks.length === 0 ? (
                  <p className="list-notice">
                    No saved book matches that search. Clear the box to see the
                    whole list again.
                  </p>
                ) : (
                  <ul className="wishlist">
                    {visibleBooks.map((b) => (
                      <li key={b.id} className="book-row">
                        <SkeletonImage
                          src={bookCoverUrl(b.isbn13)}
                          className="book-cover book-cover-sm"
                          alt={`Cover of ${b.title}`}
                        />
                        <div className="book-meta">
                          <strong>{b.title}</strong>
                          <span className="book-author">{b.authors}</span>
                          <span className="book-sub">{topicLabel(b.topic)}</span>
                          <label className="note-field">
                            <span className="visually-hidden">
                              Study notes for {b.title}
                            </span>
                            <textarea
                              rows={2}
                              maxLength={MAX_NOTE}
                              placeholder="Study notes: chapters to read, questions, page references"
                              value={noteOf(b.id)}
                              onChange={(e) => setNote(b.id, e.target.value)}
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          className="book-save saved"
                          aria-label={`Remove ${b.title} from the saved list`}
                          onClick={() => {
                            toggle(b.id);
                            setNotice("");
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <div className="list-actions">
              {savedBooks.length > 0 && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={copyShareLink}
                  >
                    Copy share link
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={exportList}
                  >
                    Export list
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => fileRef.current?.click()}
              >
                Import list
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="visually-hidden"
                aria-label="Import a reading list file"
                onChange={onImportFile}
              />
            </div>

            {shareAvailable && (
              <div className="share-panel">
                <h3>Permanent list page</h3>
                <p>
                  Publish your list to a fixed address. The link stays the same
                  every time, so anyone you send it to always opens the current
                  version of your list.
                </p>
                <label className="field">
                  <span className="field-label">List title</span>
                  <input
                    type="text"
                    maxLength={120}
                    value={shareTitle}
                    placeholder="For example: Second year astrodynamics reading"
                    onChange={(e) => setShareTitle(e.target.value)}
                    onBlur={() => void save({ title: shareTitle })}
                  />
                </label>
                <div className="share-toggles">
                  <label className="checkline">
                    <input
                      type="checkbox"
                      checked={shareSettings.isPublic}
                      onChange={(e) =>
                        void save({ isPublic: e.target.checked }).then((next) =>
                          setNotice(
                            e.target.checked && next?.shareId
                              ? "Your list page is live. Use Copy list page link to share it."
                              : "Your list page is now private. Existing links will no longer open it."
                          )
                        )
                      }
                    />
                    <span>Publish this list to a permanent page</span>
                  </label>
                  <label className="checkline">
                    <input
                      type="checkbox"
                      checked={shareSettings.includeNotes}
                      onChange={(e) =>
                        void save({ includeNotes: e.target.checked })
                      }
                    />
                    <span>Include my study notes on the shared page</span>
                  </label>
                </div>
                {shareSettings.isPublic && shareSettings.shareId && (
                  <div className="list-actions">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={copyListPageLink}
                    >
                      Copy list page link
                    </button>
                    <Link
                      to="/list/$shareId"
                      params={{ shareId: shareSettings.shareId }}
                      className="btn btn-sm"
                    >
                      Open list page
                    </Link>
                  </div>
                )}
              </div>
            )}

            {notice && (
              <p className="list-notice" role="status">
                {notice}
              </p>
            )}
          </div>

          <div
            className="glass glass-card scaffold-card"
            id="shelf"
            style={{ marginTop: 24 }}
          >
            <h2>Textbook shelf</h2>
            <p>
              A reading list of the standard references in each discipline of
              aerospace engineering: the books used in university courses and
              industry design offices. Each entry names the author so the exact
              title is easy to find in a library or bookstore.
            </p>

            {BOOK_TOPICS.map((topic) => (
              <div className="book-topic" key={topic.id}>
                <h3>{topic.label}</h3>
                <p className="book-sub">{topic.sub}</p>
                <ul className="book-list">
                  {BOOKS.filter((b) => b.topic === topic.id).map((b) => {
                    const saved = isSaved(b.id);
                    return (
                      <li key={b.id} className="book-row">
                        <SkeletonImage
                          src={bookCoverUrl(b.isbn13)}
                          className="book-cover"
                          alt={`Cover of ${b.title}`}
                        />
                        <div className="book-meta">
                          <strong>{b.title}</strong>,{" "}
                          <span className="book-author">{b.authors}</span>:{" "}
                          {b.note}
                          {b.freeUrl && b.freeLabel && (
                            <>
                              {" "}
                              <a
                                href={b.freeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent"
                              >
                                {b.freeLabel}
                              </a>
                              .
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          className={`book-save${saved ? " saved" : ""}`}
                          aria-pressed={saved}
                          aria-label={`${
                            saved ? "Remove" : "Save"
                          } ${b.title} ${saved ? "from" : "to"} my reading list`}
                          onClick={() => toggle(b.id)}
                        >
                          {saved ? "Saved" : "Save"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            <p className="scaffold-note">
              Most of these titles can be borrowed through university libraries
              or interlibrary loan. The NASA engine design handbook listed above
              is free to download.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>Hands-on learning with STELLUN</h2>
            <p>
              The best way to understand orbital mechanics is to see it in
              action. These STELLUN tools put real data in your hands.
            </p>
            <ul className="feature-list">
              <li>
                <Link to="/tracker" className="text-accent">
                  Orbit Tracker
                </Link>
                : watch live satellites orbit Earth in 3D, filtered by regime.
              </li>
              <li>
                <Link to="/sky" className="text-accent">
                  Sky Tonight
                </Link>
                : see what is visible from your location tonight, with rise and
                set times computed from documented formulas.
              </li>
              <li>
                <Link to="/neo" className="text-accent">
                  Asteroid Watch
                </Link>
                : track near-Earth objects approaching in the coming week.
              </li>
              <li>
                <Link to="/weather" className="text-accent">
                  Space Weather
                </Link>
                : monitor the geomagnetic index and solar wind conditions in real
                time.
              </li>
            </ul>
          </div>
        </div>
    </section>
  );
}

const INTL_STEM = [
  { name: "ESA Education", url: "https://www.esa.int/Education", text: "European Space Agency programs for schools and universities, including Fly Your Satellite and the ESA Academy training courses." },
  { name: "Canadian Space Agency: Youth and educators", url: "https://www.asc-csa.gc.ca/eng/youth-educators/", text: "Classroom activities, student challenges and internships run by Canada's space agency." },
  { name: "JAXA Space Education Center", url: "https://edu.jaxa.jp/en/", text: "Japan's space agency program of school activities, teacher support and youth events." },
  { name: "ISRO YUVIKA", url: "https://www.isro.gov.in/", text: "The Indian Space Research Organisation's young scientist program for school students." },
  { name: "UNOOSA capacity building", url: "https://www.unoosa.org/oosa/en/ourwork/capacitybuilding/index.html", text: "United Nations Office for Outer Space Affairs fellowships and training open to students from every country." },
  { name: "Space Generation Advisory Council", url: "https://spacegeneration.org/", text: "A global network for students and young professionals in the space sector, with congresses and project groups." },
];

function fmtDeadline(d: string | null) {
  if (!d) return "Rolling";
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function CompetitionGrid() {
  const q = useQuery({ queryKey: ["stellun", "competitions"], queryFn: () => getCompetitions() });
  if (q.isLoading) return <p className="academy-count">Loading competitions.</p>;
  const items = q.data?.items ?? [];
  if (items.length === 0) {
    return <p className="academy-count">Competitions are unavailable right now. Please check back soon.</p>;
  }
  return (
    <div className="competition-grid">
      {items.map((c) => (
        <article key={c.id} className="competition-card">
          {c.category ? <span className="competition-tag">{c.category}</span> : null}
          <h3>{c.name}</h3>
          {c.organizer ? <p className="competition-org">{c.organizer}</p> : null}
          {c.description ? <p className="competition-desc">{c.description}</p> : null}
          <div className="competition-foot">
            <span className="mono">Deadline {fmtDeadline(c.deadline)}</span>
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
              Details
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
