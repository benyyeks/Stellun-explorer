import { createFileRoute } from "@tanstack/react-router";
import { StudyDeskPage } from "@/components/academy/study-desk-page";

export const Route = createFileRoute("/_authenticated/study-desk")({
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
