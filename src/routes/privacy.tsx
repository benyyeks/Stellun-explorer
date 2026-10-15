import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy - STELLUN" },
      {
        name: "description",
        content:
          "STELLUN privacy policy: what data is collected, how location is used, third-party providers, and your choices. No accounts required for core tools.",
      },
      { property: "og:title", content: "Privacy Policy - STELLUN" },
      {
        property: "og:description",
        content: "What STELLUN collects, how location is used, and your choices.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="page-main">
      <section>
        <div className="container narrow">
          <div className="page-hero">
            <span className="eyebrow">Legal</span>
            <h1>Privacy policy</h1>
            <p className="tagline">
              STELLUN is built to work without an account. This policy explains what is
              collected, how your location is used, and the third-party services involved.
            </p>
          </div>

          <div className="glass glass-card scaffold-card">
            <h2>Summary</h2>
            <p>
              You can use every STELLUN tool without signing in or providing personal
              information. The only personal data the app ever sees is your approximate
              location, only when you choose to share it for the local sky conditions
              feature, and whatever you choose to type into the feedback form. No tracking,
              advertising, or analytics identifiers are collected.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>Location</h2>
            <p>
              Features such as local sky conditions and satellite pass predictions ask for
              your location through your browser's geolocation prompt. Your latitude and
              longitude stay on your device by default. When they are used for weather, they
              are sent to STELLUN's own server, which forwards them to Open-Meteo and then
              discards them. Your coordinates are never shared with any other party.
            </p>
            <p>
              If you are signed in, your saved observing location is stored with your account
              so it carries across your devices. You can clear it at any time, which removes
              it from both your device and your account.
            </p>
            <p>
              You can decline the location prompt and the rest of STELLUN continues to work
              normally. Location is requested only when you tap the relevant button, never
              automatically.
            </p>

          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>Third-party data providers</h2>
            <p>
              STELLUN fetches data from NASA, NOAA, CelesTrak, JPL, The Space Devs,
              Open-Meteo, and the Spaceflight News API. These requests are made from
              STELLUN's server, not your browser, so your IP address is not sent directly
              to those providers. Each provider has its own privacy policy governing the
              data they collect at their endpoints.
            </p>
            <ul className="feature-list">
              <li>NASA APIs: api.nasa.gov</li>
              <li>NOAA Space Weather Prediction Center: swpc.noaa.gov</li>
              <li>CelesTrak: celestrak.org</li>
              <li>JPL Horizons: ssd.jpl.nasa.gov</li>
              <li>The Space Devs (Launch Library 2): thespacedevs.com</li>
              <li>Open-Meteo: open-meteo.com</li>
              <li>Spaceflight News API: spaceflightnewsapi.net</li>
            </ul>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>News and feedback</h2>
            <p>
              Space news headlines are gathered daily from the Spaceflight News API. They
              contain only public, already-published content and no personal data. If you
              submit the feedback form, your message is stored securely and used only to
              improve STELLUN. Including your name or email is optional, and your address is
              used solely to reply to you if you ask for a response.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>Accounts and saved items</h2>
            <p>
              An account is optional. Without one, your theme preference, saved satellites,
              and reading list are kept in your browser's local storage only. No cookies are
              set for tracking, and the app does not use advertising or analytics cookies.
            </p>
            <p>
              If you create an account, STELLUN stores your email address and your saved
              satellites, reading list, and observing location so they follow you across
              devices. Access rules restrict each record to its owner, so no other user can
              read your saved items. Nothing you save is sold or shared, and asking us to
              delete your account removes these records.
            </p>
            <p>
              Questions you send to the STELLUN assistant are processed to generate a reply
              and are not used to build a profile of you. With an account, your assistant
              conversations are saved to your account so they are available on any device.
              You can delete a single conversation, or all of them, from the Stellun AI
              page at any time. Signed out, nothing from the assistant is stored.
            </p>

          </div>


          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>Children and education</h2>
            <p>
              STELLUN is designed for students, researchers, and space enthusiasts. It does
              not knowingly collect any personal information from children. Because no
              accounts or personal data are required, there is nothing to disclose to or
              delete on behalf of a minor.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>Changes to this policy</h2>
            <p className="scaffold-note">
              If STELLUN adds a feature that changes how data is handled, this page will be
              updated to reflect it. The tools themselves are designed so that no personal
              data is needed to use them.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
