import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy path. Study desk now lives under the Academy at /academy/desk.
 */
export const Route = createFileRoute("/_authenticated/study-desk")({
  beforeLoad: () => {
    throw redirect({ to: "/academy/desk" });
  },
});
