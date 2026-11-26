import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route: /deepspace renders deepspace.index.tsx, /deepspace/$objectId
// renders the object detail template. The page bodies live in the leaf routes.
export const Route = createFileRoute("/deepspace")({
  ssr: false,
  component: DeepSpaceLayout,
});

function DeepSpaceLayout() {
  return <Outlet />;
}
