import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

/**
 * Academy layout
 * -------------
 * Parent for /academy, /academy/desk, /academy/progress.
 * Sidebar on wide screens; compact top strip on narrow ones.
 * Site-wide Settings remains at /settings (main header).
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
] as const;

function AcademyLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string, end: boolean) => {
    if (end) return pathname === "/academy" || pathname === "/academy/";
    return pathname === to || pathname.startsWith(to + "/");
  };

  return (
    <div className="academy-shell">
      <aside className="academy-side" aria-label="Academy">
        <div className="academy-side-brand">
          <span className="academy-side-kicker">Academy</span>
          <span className="academy-side-title">Study section</span>
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
          Path setup runs once on first visit. Quizzes and the full library ship in later Academy stages.
        </p>
      </aside>

      <div className="academy-main">
        <Outlet />
      </div>
    </div>
  );
}
