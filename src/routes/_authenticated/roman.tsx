import { createFileRoute } from "@tanstack/react-router";
import { MissionHeader } from "@/components/roman/mission-header";
import { MissionTimeline } from "@/components/roman/mission-timeline";
import { RomanNews } from "@/components/roman/roman-news";
import { FovCompare } from "@/components/roman/fov-compare";
import { WfiSimulator } from "@/components/roman/wfi-simulator";
import { ArchiveCoverage } from "@/components/roman/archive-coverage";
import { HardwareTabs } from "@/components/roman/hardware-tabs";

export const Route = createFileRoute("/_authenticated/roman")({
  head: () => ({
    meta: [
      { title: "Nancy Grace Roman Space Telescope - STELLUN" },
      {
        name: "description",
        content:
          "Launch window countdown, mission updates, survey field of view comparison against Hubble and Webb, and hardware specifications for NASA's Nancy Grace Roman Space Telescope.",
      },
      { property: "og:title", content: "Nancy Grace Roman Space Telescope - STELLUN" },
      {
        property: "og:description",
        content:
          "NASA's flagship observatory for dark energy, exoplanet microlensing, and wide-field infrared astronomy, with live mission updates and hardware specifications.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RomanPage,
});

function RomanPage() {
  return (
    <main className="roman-page">
      <MissionHeader />
      <MissionTimeline />
      <RomanNews />
      <FovCompare />
      <WfiSimulator />
      <section className="container roman-section" id="archive">
        <header className="section-head">
          <h2>Survey fields in the archive</h2>
          <p>
            What has already been recorded where Roman will survey, taken straight from
            the public archive.
          </p>
        </header>
        <ArchiveCoverage />
      </section>
      <HardwareTabs />
    </main>
  );
}
