import { Link } from "@tanstack/react-router";
import { LogoMark, BrandWord } from "./logo";

export function SiteFooter() {
  const year = new Date().getUTCFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="brand" style={{ marginBottom: "10px" }}>
              <LogoMark className="brand-mark" />
              <BrandWord />
            </div>
            <p>
              An independent space intelligence dashboard. Not affiliated with
              NASA, NOAA, ESA, or any space agency.
            </p>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            <Link to="/tracker">Orbit Tracker</Link>
            <Link to="/deepspace">Deep Space</Link>
            <Link to="/mars">Mars</Link>
            <Link to="/weather">Space Weather</Link>
            <Link to="/sky">Sky Tonight</Link>
          </div>
          <div className="footer-col">
            <h4>More</h4>
            <Link to="/neo">Asteroid Watch</Link>
            <Link to="/launches">Launches</Link>
            <Link to="/ask">Stellun AI</Link>
            <Link to="/about">Data sources & methodology</Link>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <Link to="/privacy">Privacy policy</Link>
            <a
              href="https://www.nasa.gov/nasa-brand-center/images-and-media/"
              target="_blank"
              rel="noopener noreferrer"
            >
              NASA media usage guidelines
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            &copy; {year} STELLUN. Data courtesy of NASA, NOAA, CelesTrak, and
            JPL.
          </span>
          <span className="mono">Built with real, verified data. No filler numbers.</span>
        </div>
      </div>
    </footer>
  );
}
