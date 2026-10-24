import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogoMark, BrandWord } from "./logo";
import { AuthControl } from "./auth-control";
import { useAuth } from "@/hooks/use-auth";

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

// Four pillars carry every destination. Anything outside them is a standalone
// link, so the bar stays short and the hierarchy reads at a glance.
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
    id: "academy",
    label: "The Academy",
    links: [
      { id: "academy-terms", label: "Aerospace Terminologies", to: "/academy", hint: "Working glossary of orbital and spacecraft terms" },
      { id: "academy-library", label: "Research Library", to: "/academy", hint: "Accredited archives and mission breakdowns" },
      { id: "academy-resources", label: "Learning Resources", to: "/academy", hint: "Textbooks, programs, and competitions" },
    { id: "academy-study", label: "Study desk", to: "/study-desk", hint: "Workspaces, study plans, notes, and Stellun AI" },
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

// Academy links carry a tab so each menu entry opens its own view.
const ACADEMY_TAB: Record<string, "terminologies" | "library" | "resources"> = {
  "academy-terms": "terminologies",
  "academy-library": "library",
  "academy-resources": "resources",
};

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
  const signedIn = Boolean(user) || loading;

  // Signed out visitors are sent to the sign in page by the route gate, so the
  // pillars only appear once an account is present.
  const pillars = signedIn ? PILLARS : [];

  useEffect(() => {
    setMenuOpen(false);
    setOpenPillar(null);
  }, [pathname]);

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

  const renderLink = (link: NavLink, withHint: boolean) => {
    const tab = ACADEMY_TAB[link.id];
    const active = tab
      ? isMatch(pathname, "/academy")
      : isMatch(pathname, link.to);
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

    if (tab) {
      return (
        <Link key={link.id} to="/academy" search={{ tab, list: undefined }} {...common}>
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

  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="brand" aria-label="STELLUN home">
            <LogoMark className="brand-mark" />
            <BrandWord />
          </Link>
          <nav className="nav-desktop" aria-label="Primary">
            {pillars.map((pillar) => {
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
                      {pillar.links.map((l) => renderLink(l, true))}
                    </div>
                  )}
                </div>
              );
            })}
            {signedIn && (
              <Link to="/about" aria-current={isMatch(pathname, "/about") ? "page" : undefined}>
                About
              </Link>
            )}
          </nav>
          <div className="header-actions">
            <AuthControl />
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
      <nav className={`nav-mobile${menuOpen ? " open" : ""}`} aria-label="All sections">
        <div className="nav-group">
          <Link to="/" aria-current={pathname === "/" ? "page" : undefined}>
            Home
          </Link>
        </div>
        {pillars.map((pillar) => {
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
                  {pillar.links.map((l) => renderLink(l, false))}
                </div>
              )}
            </div>
          );
        })}
        {signedIn && (
          <div className="nav-group">
            <Link to="/about" aria-current={isMatch(pathname, "/about") ? "page" : undefined}>
              About
            </Link>
            <Link to="/ask" aria-current={isMatch(pathname, "/ask") ? "page" : undefined}>
              Stellun AI
            </Link>
          </div>
        )}
      </nav>
    </>
  );
}
