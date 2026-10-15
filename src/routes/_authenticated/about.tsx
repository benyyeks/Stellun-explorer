import { createFileRoute, Link } from "@tanstack/react-router";
import { FeedbackForm } from "@/components/site/feedback-form";

export const Route = createFileRoute("/_authenticated/about")({
  head: () => ({
    meta: [
      { title: "About & Data Sources — STELLUN" },
      {
        name: "description",
        content:
          "How STELLUN gets its numbers: every figure is fetched live from NASA, NOAA, CelesTrak, JPL, The Space Devs, and Open-Meteo, or computed from documented formulas. Nothing is invented.",
      },
      { property: "og:title", content: "About & Data Sources — STELLUN" },
      {
        property: "og:description",
        content:
          "Every STELLUN figure is fetched live or computed from a documented formula. See the full source list and methodology.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

type Source = {
  name: string;
  org: string;
  url: string;
  feeds: string;
};

const SOURCES: Source[] = [
  { name: "NeoWs (NEO Feed)", org: "NASA", url: "https://api.nasa.gov/", feeds: "Asteroid Watch: close-approach data for the next 7 days." },
  { name: "Mars Rover Photos API", org: "NASA", url: "https://api.nasa.gov/", feeds: "Mars: latest imagery from Curiosity and Perseverance, plus mission manifests." },
  { name: "Astronomy Picture of the Day", org: "NASA", url: "https://api.nasa.gov/", feeds: "Featured daily imagery and explanation." },
  { name: "DONKI", org: "NASA", url: "https://api.nasa.gov/", feeds: "Space Weather: solar flare, CME, and geomagnetic storm notifications." },
  { name: "Planetary K-Index", org: "NOAA SWPC", url: "https://www.swpc.noaa.gov/", feeds: "Space Weather: current and forecast Kp geomagnetic index." },
  { name: "Solar Wind (plasma + mag)", org: "NOAA SWPC", url: "https://www.swpc.noaa.gov/", feeds: "Space Weather: solar wind speed, density, and IMF Bz." },
  { name: "NORAD element sets", org: "CelesTrak", url: "https://celestrak.org/", feeds: "Orbit Tracker: satellite TLE/OMM data for ISS and catalog groups." },
  { name: "Horizons System", org: "JPL", url: "https://ssd.jpl.nasa.gov/horizons/", feeds: "Deep Space: live position vectors for Voyager 1/2, New Horizons, Parker Solar Probe, JWST, and Juno." },
  { name: "Launch Library 2", org: "The Space Devs", url: "https://thespacedevs.com/", feeds: "Launches: upcoming orbital launches with countdowns and provider details." },
  { name: "Forecast API", org: "Open-Meteo", url: "https://open-meteo.com/", feeds: "Local sky conditions: cloud cover and weather for stargazing clarity." },
  { name: "Spaceflight News API", org: "Spaceflight News", url: "https://spaceflightnewsapi.net/", feeds: "Space news: articles, blogs, and reports, refreshed daily." },
];

function AboutPage() {
  return (
    <main className="page-main">
      <section>
        <div className="container narrow">
          <div className="page-hero">
            <span className="eyebrow">Methodology</span>
            <h1>Data sources & how the numbers work</h1>
            <p className="tagline">
              STELLUN is an independent, research-grade space intelligence dashboard.
              Every number is either fetched live from a named, credible source or
              computed from a documented, verifiable formula. Nothing is invented,
              and unverifiable values are labeled as estimates.
            </p>
          </div>

          <div className="glass glass-card scaffold-card">
            <h2>The core promise</h2>
            <p>
              If a figure cannot be traced to a source or a formula, it does not appear
              on STELLUN. If a source is temporarily unreachable, the page shows the most
              recent verified reading with its timestamp, rather than a blank space or an
              invented value.
            </p>
            <p>
              STELLUN is not affiliated with NASA, NOAA, ESA, or any space agency. It
              aggregates publicly available data for education and research.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>Verified data sources</h2>
            <p>Each table row names the upstream provider and what STELLUN uses it for.</p>
            <div className="source-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Provider</th>
                    <th>Feeds</th>
                  </tr>
                </thead>
                <tbody>
                  {SOURCES.map((s) => (
                    <tr key={s.name}>
                      <td>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-accent">
                          {s.name}
                        </a>
                      </td>
                      <td>{s.org}</td>
                      <td>{s.feeds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>How positions are computed</h2>
            <ul className="feature-list">
              <li>
                <strong>Planets:</strong> positions use JPL Keplerian elements for the
                eight major planets, valid through 2050 AD. Distances are derived from the
                heliocentric ecliptic vectors.
              </li>
              <li>
                <strong>Satellites:</strong> the ISS and catalog groups are propagated from
                NORAD element sets using a Kepler orbit solver with J2 secular perturbations.
              </li>
              <li>
                <strong>Deep-space probes:</strong> positions are queried from JPL Horizons.
                When a live position is unavailable, STELLUN extrapolates from the probe's
                last known state using documented orbital mechanics, and labels the result
                as an estimate.
              </li>
              <li>
                <strong>Moon:</strong> lunar phase and illumination use a standard
                ecliptic-longitude theory derived from the Moon's mean longitude and the
                Sun's position.
              </li>
            </ul>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>Freshness & accuracy</h2>
            <p>
              Each dataset is refreshed on a schedule matched to how quickly it changes:
              solar wind and geomagnetic readings every few minutes, asteroid approaches
              and launch schedules throughout the day, and the news deck daily. Every figure
              carries a timestamp, so you can always see when the most recent verified
              reading was taken.
            </p>
            <p className="scaffold-note">
              Want to dig into a specific tool?{" "}
              <Link to="/tracker" className="text-accent">Open the Orbit Tracker</Link>,{" "}
              <Link to="/weather" className="text-accent">check space weather</Link>, or{" "}
              <Link to="/sky" className="text-accent">see what is visible tonight</Link>.
            </p>
          </div>
          <FeedbackForm />
        </div>
      </section>
    </main>
  );
}
