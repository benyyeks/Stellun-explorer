import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/**
 * Academy layout
 * --------------
 * Parent for /academy, /academy/desk, /academy/progress.
 * Sidebar collapses on desktop; a floating control restores it.
 * Site Settings stays at /settings (global header).
 */

export const Route = createFileRoute("/_authenticated/academy")({
  head: () => ({
    meta: [
      { title: "The Academy · STELLUN" },
      {
        name: "description",
        content:
          "Study dashboard, workspaces, and aerospace reference tools in one place.",
      },
      { property: "og:title", content: "The Academy · STELLUN" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcademyLayout,
});

const SIDE_LINKS = [
  { to: "/academy", label: "Dashboard", end: true },
  { to: "/academy/desk", label: "Study desk", end: false },
  { to: "/academy/progress", label: "Your Progress", end: false },
  { to: "/academy/quiz", label: "Quick quiz", end: false },
] as const;

const SIDEBAR_KEY = "stellun:academy-sidebar-open";

function AcademyLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_KEY);
      if (raw === "0") setOpen(false);
      if (raw === "1") setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const setSidebar = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const isActive = (to: string, end: boolean) => {
    if (end) return pathname === "/academy" || pathname === "/academy/";
    return pathname === to || pathname.startsWith(to + "/");
  };

  return (
    <div className={`academy-shell${open ? "" : " is-side-collapsed"}`}>
      <aside className="academy-side" aria-label="Academy" hidden={!open ? undefined : undefined} data-open={open ? "true" : "false"}>
        <div className="academy-side-top">
          <div className="academy-side-brand">
            <span className="academy-side-kicker">Academy</span>
            <span className="academy-side-title">Study section</span>
          </div>
          <button
            type="button"
            className="academy-side-toggle"
            aria-label="Collapse Academy menu"
            onClick={() => setSidebar(false)}
          >
            ‹
          </button>
        </div>
        <nav className="academy-side-nav">
          {SIDE_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="academy-side-link"
              data-active={isActive(l.to, l.end) ? "true" : undefined}
              aria-current={isActive(l.to, l.end) ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="academy-side-foot">
          Path setup runs once on first visit. Quizzes and the full library expand in later stages.
        </p>
      </aside>

      {!open && (
        <button
          type="button"
          className="academy-side-reopen"
          aria-label="Open Academy menu"
          onClick={() => setSidebar(true)}
        >
          Menu
        </button>
      )}

      <div className="academy-main">
        <Outlet />
      </div>
    </div>
  );
}
