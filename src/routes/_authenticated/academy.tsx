import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import "@/styles/academy.css";
import { useAcademyPrefs } from "@/lib/academy-prefs";

/**
 * Academy layout
 * --------------
 * Parent for /academy, /academy/desk, /academy/progress, /academy/quiz,
 * /academy/settings, and /academy/workspace/:id.
 *
 * Navigation is one list, shown three ways:
 *   phone (<640px)   fixed bottom tab bar
 *   tablet (640-899) sticky top bar
 *   desktop (900+)   left sidebar
 */

export const Route = createFileRoute("/_authenticated/academy")({
  head: () => ({
    meta: [
      { title: "The Academy · STELLUN" },
      {
        name: "description",
        content: "Study dashboard, workspaces, and aerospace reference tools in one place.",
      },
      { property: "og:title", content: "The Academy · STELLUN" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcademyLayout,
});

const NAV = [
  { to: "/academy", label: "Dashboard", short: "Home", end: true },
  { to: "/academy/desk", label: "Study desk", short: "Desk", end: false },
  { to: "/academy/progress", label: "Your progress", short: "Progress", end: false },
  { to: "/academy/quiz", label: "Quick quiz", short: "Quiz", end: false },
  { to: "/academy/settings", label: "Settings", short: "Settings", end: false },
] as const;

function AcademyLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [prefs] = useAcademyPrefs();

  const isActive = (to: string, end: boolean) => {
    if (end) return pathname === "/academy" || pathname === "/academy/";
    return pathname === to || pathname.startsWith(`${to}/`);
  };

  return (
    <div
      className="ac-shell"
      data-academy-theme={prefs.appearance}
      data-text-size={prefs.textSize}
    >
      <aside className="ac-side" aria-label="Academy">
        <div className="ac-side-brand">
          <span className="ac-side-kicker">Academy</span>
          <span className="ac-side-title">Study section</span>
        </div>
        <nav aria-label="Academy sections">
          <ul className="ac-nav">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="ac-nav-link"
                  aria-current={isActive(item.to, item.end) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="ac-side-foot">
          Your workspaces and settings are saved in this browser. Sign in on the same device to keep
          using them.
        </p>
      </aside>

      <div className="ac-main">
        <Outlet />
      </div>

      <nav className="ac-bottom-nav" aria-label="Academy sections">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            aria-label={item.label}
            aria-current={isActive(item.to, item.end) ? "page" : undefined}
          >
            {item.short}
          </Link>
        ))}
      </nav>
    </div>
  );
}
