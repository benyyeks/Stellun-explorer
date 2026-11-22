import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import "@/styles/academy.css";
import { useAcademyPrefs } from "@/lib/academy-prefs";
import { useStudyWorkspaces } from "@/lib/study-workspace";

/**
 * Academy layout
 * --------------
 * Phones and tablets: navigation is a bar pinned under the site header.
 *   Page content starts below it.
 * Laptops and desktops: navigation is a sidebar.
 * Reader and flashcard pages: a compact bar at every width, so the page has room.
 * The open workspace appears in the bar as the current item (not a link).
 */

export const Route = createFileRoute("/_authenticated/academy")({
  head: () => ({
    meta: [
      { title: "The Academy · STELLUN" },
      {
        name: "description",
        content: "Study dashboard, workspaces, flashcards, and aerospace reference tools in one place.",
      },
      { property: "og:title", content: "The Academy · STELLUN" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcademyLayout,
});

const NAV = [
  { to: "/academy", label: "Dashboard", end: true },
  { to: "/academy/desk", label: "Workspaces", end: false },
  { to: "/academy/shelf", label: "Book shelf", end: false },
  { to: "/academy/practice", label: "Practice", end: false },
  { to: "/academy/progress", label: "Your progress", end: false },
  { to: "/academy/quiz", label: "Quick quiz", end: false },
  { to: "/academy/settings", label: "Settings", end: false },
] as const;

function AcademyLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [prefs] = useAcademyPrefs();
  const { workspaces } = useStudyWorkspaces();

  const match = pathname.match(/^\/academy\/(workspace|flashcards)\/([^/]+)/);
  const kind = match ? match[1] : null;
  const currentWs = match ? workspaces.find((w) => w.id === match[2]) : undefined;
  const nowTitle = currentWs?.title || "Workspace";
  const nowKind = kind === "flashcards" ? "Flashcards" : "Reading";

  const isActive = (to: string, end: boolean) => {
    if (end) return pathname === "/academy" || pathname === "/academy/";
    return pathname === to || pathname.startsWith(`${to}/`);
  };

  return (
    <div
      className="ac-shell"
      data-academy-theme={prefs.appearance}
      data-text-size={prefs.textSize}
      data-compact={kind ? "true" : "false"}
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
            {kind && (
              <li className="ac-nav-now" aria-current="page">
                <span className="ac-nav-now-label">{nowKind}</span>
                <span className="ac-nav-now-title">{nowTitle}</span>
              </li>
            )}
          </ul>
        </nav>
        <p className="ac-side-foot">Your workspaces and settings are saved in this browser.</p>
      </aside>

      <div className="ac-main">
        <Outlet />
      </div>
    </div>
  );
}
