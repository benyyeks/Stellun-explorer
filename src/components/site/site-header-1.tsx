import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogoMark, BrandWord } from "./logo";
import { AuthControl } from "./auth-control";
import { useAuth } from "@/hooks/use-auth";

/**
 * Site header — primary navigation for STELLUN.
 *
 * Large screens (≥1040px):
 *   - Pillar dropdowns for Mission Control, Planetary Data, Operations
 *   - Academy is a single link (no dropdown) → /academy
 *   - Settings is a standalone link → /settings
 *   - Menu (hamburger) is hidden; only desktop nav shows
 *
 * Small screens:
 *   - Hamburger opens the full mobile sheet
 *   - Academy is an accordion: Dashboard, Study desk
 *   - Settings appears as its own row (site-wide, not Academy-only)
 */

type NavLink = {
  id: string;
  label: string;
  to: string;
  hint: string;
};

type Pillar = {
  id: string;
  label: string;
  links: NavLink[];
};

/** Tool groups that stay as dropdowns on desktop and accordions on mobile. */
const PILLARS: Pillar[] = [
  {
    id: "mission-control",
    label: "Mission Control",
    links: [
      { id: "tracker", label: "Orbit Tracker", to: "/tracker", hint: "Live satellite positions by regime" },
      { id: "deepspace", label: "Deep Space", to: "/deepspace", hint: "Probes and spacecraft beyond Earth" },
      { id: "sky", label: "Sky Tonight", to: "/sky", hint: "What is visible from your location" },
    ],
  },
  {
    id: "planetary-data",
    label: "Planetary Data",
    links: [
      { id: "weather", label: "Space Weather", to: "/weather", hint: "Solar activity and geomagnetic conditions" },
      { id: "neo", label: "Asteroid Watch", to: "/neo", hint: "Near-Earth object close approaches" },
      { id: "mars", label: "Mars", to: "/mars", hint: "Surface conditions and active missions" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    links: [
      { id: "launches", label: "Launch Schedule", to: "/launches", hint: "Upcoming and recent launches" },
      { id: "intelligence", label: "Mission Intelligence", to: "/intelligence", hint: "Mission profiles and flight telemetry" },
    ],
  },
];

/**
 * Academy destinations for the mobile accordion only.
 * Desktop uses a single “The Academy” link to /academy (dashboard).
 */
const ACADEMY_MOBILE_LINKS: NavLink[] = [
  { id: "academy-home", label: "Dashboard", to: "/academy", hint: "Continue where you left off" },
  { id: "academy-desk", label: "Study desk", to: "/academy/desk", hint: "Workspaces, plans, and notes" },
];

function isMatch(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const [openPillar, setOpenPillar] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user, loading } = useAuth();
  const signedIn = Boolean(user);

  // Close menus on navigation
  useEffect(() => {
    setMenuOpen(false);
    setOpenPillar(null);
    setOpenSection(null);
  }, [pathname]);

  // Prevent body scroll while the mobile sheet is open
  useEffect(() => {
    document.documentElement.classList.toggle("nav-open-lock", menuOpen);
    return () => {
      document.documentElement.classList.remove("nav-open-lock");
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      setOpenPillar(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const openNow = (id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenPillar(id);
  };
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenPillar(null), 140);
  };

  /** Guest links go through /auth with redirect; signed-in users go direct. */
  const renderToolLink = (link: NavLink, withHint: boolean) => {
    const active = isMatch(pathname, link.to);
    const common = {
      className: withHint ? undefined : "nav-mobile-link",
      "aria-current": active ? ("page" as const) : undefined,
      onClick: () => {
        setOpenPillar(null);
        setMenuOpen(false);
      },
    };

    const body = withHint ? (
      <>
        <span>{link.label}</span>
        <small>{link.hint}</small>
      </>
    ) : (
      link.label
    );

    if (!signedIn && !loading) {
      return (
        <Link key={link.id} to="/auth" search={{ redirect: link.to }} {...common}>
          {body}
        </Link>
      );
    }

    return (
      <Link key={link.id} to={link.to} {...common}>
        {body}
      </Link>
    );
  };

  const academyActive = isMatch(pathname, "/academy") || isMatch(pathname, "/study-desk");
  const settingsActive = isMatch(pathname, "/settings");

  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="brand" aria-label="STELLUN home">
            <LogoMark className="brand-mark" />
            <BrandWord />
          </Link>

          {/* Desktop primary nav — visible only ≥1040px via CSS */}
          <nav className="nav-desktop" aria-label="Primary">
            {PILLARS.map((pillar) => {
              const isOpen = openPillar === pillar.id;
              const hasActive = pillar.links.some((l) => isMatch(pathname, l.to));
              return (
                <div
                  key={pillar.id}
                  className="nav-pillar"
                  data-open={isOpen ? "true" : undefined}
                  data-active={hasActive ? "true" : undefined}
                  onMouseEnter={() => openNow(pillar.id)}
                  onMouseLeave={closeSoon}
                  onFocus={() => openNow(pillar.id)}
                  onBlur={closeSoon}
                >
                  <button
                    type="button"
                    className="nav-pillar-trigger"
                    aria-expanded={isOpen}
                    onClick={() => setOpenPillar(isOpen ? null : pillar.id)}
                  >
                    {pillar.label}
                    <svg
                      className="nav-pillar-caret"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="nav-pillar-menu" role="group" aria-label={pillar.label}>
                      {pillar.links.map((l) => renderToolLink(l, true))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Academy: one destination on desktop — the dashboard */}
            {signedIn || loading ? (
              <Link to="/academy" aria-current={academyActive ? "page" : undefined}>
                The Academy
              </Link>
            ) : (
              <Link to="/auth" search={{ redirect: "/academy" }}>
                The Academy
              </Link>
            )}

            {/* Site-wide settings (not Academy-only) */}
            {signedIn && (
              <Link to="/settings" aria-current={settingsActive ? "page" : undefined}>
                Settings
              </Link>
            )}

            {signedIn && (
              <Link to="/about" aria-current={isMatch(pathname, "/about") ? "page" : undefined}>
                About
              </Link>
            )}
          </nav>

          <div className="header-actions">
            <AuthControl />
            {/* Hamburger — CSS hides this at ≥1040px */}
            <button
              type="button"
              className="menu-toggle"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile / narrow sheet — not used as primary nav on large screens */}
      <nav className={`nav-mobile${menuOpen ? " open" : ""}`} aria-label="All sections">
        <div className="nav-group">
          <Link to="/" aria-current={pathname === "/" ? "page" : undefined} onClick={() => setMenuOpen(false)}>
            Home
          </Link>
        </div>

        {!signedIn && !loading ? (
          <p className="nav-guest-note">
            Sign in to open tools, save lists, and get results for your location.
          </p>
        ) : null}

        {PILLARS.map((pillar) => {
          const expanded = openSection === pillar.id;
          return (
            <div className="nav-group" key={pillar.id}>
              <button
                type="button"
                className="nav-accordion-trigger"
                aria-expanded={expanded}
                onClick={() => setOpenSection(expanded ? null : pillar.id)}
              >
                {pillar.label}
                <svg
                  className={`chevron${expanded ? " chevron-open" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {expanded && (
                <div className="nav-accordion-body">
                  {pillar.links.map((l) => renderToolLink(l, false))}
                </div>
              )}
            </div>
          );
        })}

        {/* Academy accordion — mobile destinations only */}
        <div className="nav-group">
          <button
            type="button"
            className="nav-accordion-trigger"
            aria-expanded={openSection === "academy"}
            onClick={() => setOpenSection(openSection === "academy" ? null : "academy")}
          >
            The Academy
            <svg
              className={`chevron${openSection === "academy" ? " chevron-open" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {openSection === "academy" && (
            <div className="nav-accordion-body">
              {ACADEMY_MOBILE_LINKS.map((l) => renderToolLink(l, false))}
            </div>
          )}
        </div>

        {signedIn && (
          <div className="nav-group">
            <Link
              to="/settings"
              aria-current={settingsActive ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              Settings
            </Link>
            <Link
              to="/about"
              aria-current={isMatch(pathname, "/about") ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              About
            </Link>
            <Link
              to="/ask"
              aria-current={isMatch(pathname, "/ask") ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              Stellun AI
            </Link>
          </div>
        )}
      </nav>
    </>
  );
}
