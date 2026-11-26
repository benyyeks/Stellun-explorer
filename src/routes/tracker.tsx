import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route: /tracker renders tracker.index.tsx, /tracker/$noradId renders
// the object detail template. The page bodies live in the leaf routes.
export const Route = createFileRoute("/tracker")({
  ssr: false,
  component: TrackerLayout,
});

function TrackerLayout() {
  return <Outlet />;
}
