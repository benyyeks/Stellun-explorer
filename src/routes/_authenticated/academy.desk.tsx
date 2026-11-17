import { createFileRoute } from "@tanstack/react-router";
import { StudyDeskPage } from "@/components/academy/study-desk-page";

/**
 * Study desk under Academy.
 * Reuses the existing StudyDeskPage implementation (workspaces, plans, notes).
 * Path: /academy/desk  ( /study-desk redirects here )
 */

export const Route = createFileRoute("/_authenticated/academy/desk")({
  head: () => ({
    meta: [
      { title: "Study desk · STELLUN Academy" },
      {
        name: "description",
        content:
          "Personal aerospace study workspaces with plans, notes, checklists, and Stellun AI.",
      },
    ],
  }),
  component: StudyDeskPage,
});
