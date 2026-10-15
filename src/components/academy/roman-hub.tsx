// Roman study hub inside the Academy: a reading shelf, the primary sources a
// student would actually cite, and a condensed mission record. Every link is an
// official mission, archive, or publisher page. Nothing here is invented, and
// figures match the Roman mission page.
import { Link } from "@tanstack/react-router";
import { BOOKS, bookCoverUrl } from "@/lib/books";
import { HARDWARE, MILESTONES, ROMAN, milestoneStates } from "@/lib/roman";
import { useNow } from "@/hooks/use-now";

// Shelf picks: existing catalogue titles that carry the physics and engineering
// behind Roman's science case, each with a line on why it belongs here.
const SHELF: { id: string; why: string }[] = [
  {
    id: "wertz-larson-smad",
    why: "Mission design at the level Roman's survey planning works at: budgets, coverage, and the trade between field of view and depth.",
  },
  {
    id: "fortescue-systems",
    why: "Spacecraft subsystems, including the thermal design that lets an infrared observatory hold below 100 kelvin.",
  },
  {
    id: "markley-crassidis-attitude",
    why: "Attitude determination and control, the discipline behind holding a pointing stable enough for weak lensing shape measurement.",
  },
  {
    id: "hastings-garrett-environment",
    why: "The radiation and thermal environment at the second Sun-Earth Lagrange point, and what it does to detectors.",
  },
  {
    id: "curtis-orbital-mechanics",
    why: "Libration point orbits and transfer trajectories, the mechanics of the cruise Roman is flying now.",
  },
];

const SOURCES = [
  {
    name: "Roman Space Telescope mission site",
    provider: "NASA Goddard Space Flight Center",
    url: "https://roman.gsfc.nasa.gov/",
    what: "The project's own site: instrument descriptions, survey definitions, and mission status.",
  },
  {
    name: "Roman documentation",
    provider: "Space Telescope Science Institute",
    url: "https://roman-docs.stsci.edu/",
    what: "Technical documentation for the Wide Field Instrument and the Coronagraph Instrument, including bandpasses, detector behaviour, and data products.",
  },
  {
    name: "Mikulski Archive for Space Telescopes",
    provider: "Space Telescope Science Institute",
    url: "https://archive.stsci.edu/",
    what: "The archive Roman data is published through, alongside Hubble and Webb records of the same sky.",
  },
  {
    name: "New Worlds, New Horizons in Astronomy and Astrophysics",
    provider: "National Academies of Sciences, Engineering, and Medicine",
    url: "https://nap.nationalacademies.org/catalog/12951/",
    what: "The 2010 decadal survey that ranked a wide-field infrared survey telescope as the decade's highest priority large mission.",
  },
  {
    name: "Roman science and instrument literature",
    provider: "NASA Astrophysics Data System",
    url: "https://ui.adsabs.harvard.edu/search/q=Roman%20Space%20Telescope",
    what: "Peer reviewed papers and preprints on the survey designs, microlensing yields, and weak lensing systematics.",
  },
  {
    name: "Roman Research Nexus",
    provider: "Space Telescope Science Institute",
    url: "https://nexus.stsci.edu/",
    what: "The cloud analysis platform where Roman products can be worked on next to the data instead of downloaded.",
  },
];

export function RomanHub() {
  const now = useNow(60_000);
  const states = milestoneStates((now ?? new Date()).getTime());
  const currentIndex = states.lastIndexOf("current");
  const current = currentIndex >= 0 ? MILESTONES[currentIndex] : null;

  const shelf = SHELF.map((pick) => ({
    pick,
    book: BOOKS.find((b) => b.id === pick.id),
  })).filter((row) => row.book);

  return (
    <div className="container academy-panel">
      <header className="section-head">
        <h2>Roman study hub</h2>
        <p>
          Everything needed to study the Nancy Grace Roman Space Telescope in one place:
          a reading shelf, the primary sources, and the mission record as it stands.
        </p>
      </header>

      <section className="roman-section">
        <h3>Mission record</h3>
        <div className="detail-rows">
          <div className="detail-row">
            <span>Launch</span>
            <b className="mono">{ROMAN.launchLabel}</b>
          </div>
          <div className="detail-row">
            <span>Vehicle</span>
            <b className="mono">{ROMAN.launchVehicle}</b>
          </div>
          <div className="detail-row">
            <span>Operating orbit</span>
            <b className="mono">{ROMAN.orbit}</b>
          </div>
          <div className="detail-row">
            <span>Primary mirror</span>
            <b className="mono">{ROMAN.primaryMirror}</b>
          </div>
          <div className="detail-row">
            <span>Primary instrument</span>
            <b className="mono">{ROMAN.primaryInstrument}</b>
          </div>
          <div className="detail-row">
            <span>Mission life</span>
            <b className="mono">{ROMAN.missionLife}</b>
          </div>
        </div>
        {current ? (
          <p className="roman-note">
            Current phase: {current.title}. {current.detail}
          </p>
        ) : null}
        <p className="roman-note">
          {ROMAN.orbitDetail} Field of view: {ROMAN.fovVsHubble}, which is what makes
          statistical surveys of hundreds of millions of galaxies practical.
        </p>
        <Link to="/roman" className="detail-link">
          Open the full Roman mission page, with the timeline, instrument simulator, and
          archive coverage
        </Link>
      </section>

      <section className="roman-section">
        <h3>Reading shelf</h3>
        <p className="roman-note">
          Standard references from the STELLUN textbook shelf, chosen for what each one
          explains about this observatory.
        </p>
        <div className="shelf-grid">
          {shelf.map(({ pick, book }) => (
            <article key={pick.id} className="glass glass-card shelf-card">
              <img
                src={bookCoverUrl(book!.isbn13)}
                alt={`Cover of ${book!.title}`}
                loading="lazy"
                className="shelf-cover"
              />
              <div>
                <h4>{book!.title}</h4>
                <p className="roman-note">{book!.authors}</p>
                <p>{pick.why}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="roman-section">
        <h3>Primary sources</h3>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Published by</th>
                <th scope="col">What it holds</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => (
                <tr key={s.url}>
                  <td>
                    <a href={s.url} target="_blank" rel="noreferrer noopener">
                      {s.name}
                    </a>
                  </td>
                  <td>{s.provider}</td>
                  <td>{s.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="roman-section">
        <h3>Instrument reference</h3>
        <div className="card-grid">
          {HARDWARE.map((h) => (
            <article key={h.id} className="glass glass-card">
              <h4>{h.label}</h4>
              <p className="roman-note">{h.headline}</p>
              <div className="detail-rows">
                {h.specs.map((s) => (
                  <div className="detail-row" key={s.label}>
                    <span>{s.label}</span>
                    <b className="mono">{s.value}</b>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
