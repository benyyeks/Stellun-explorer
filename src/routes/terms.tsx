// STELLUN Terms of Service — educational product rules and liability limits.
// Plain-language terms for a public space-data dashboard. Not a substitute for
// advice from a lawyer licensed in your jurisdiction.
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service - STELLUN" },
      {
        name: "description",
        content:
          "Terms of use for STELLUN: educational data tools, accounts, AI limits, user content, and liability.",
      },
      { property: "og:title", content: "Terms of Service - STELLUN" },
      {
        property: "og:description",
        content: "Rules for using STELLUN’s space data tools, accounts, and AI assistant.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="page-main">
      <section>
        <div className="container narrow">
          <div className="page-hero">
            <span className="eyebrow">Legal</span>
            <h1>Terms of Service</h1>
            <p className="tagline">
              These terms govern your use of STELLUN. By using the site or creating an
              account, you agree to them. If you do not agree, do not use STELLUN.
            </p>
            <p className="scaffold-note">Last updated: 25 October 2026</p>
          </div>

          <div className="glass glass-card scaffold-card">
            <h2>1. Who we are</h2>
            <p>
              STELLUN is an independent space-data and learning dashboard. It is{" "}
              <strong>not affiliated with, endorsed by, or operated by</strong> NASA, NOAA,
              ESA, JAXA, CNSA, ISRO, or any other space agency or government body. Agency
              names appear only to identify public data sources and historical missions.
            </p>
            <p>
              Questions about these terms: use the contact details on the{" "}
              <Link to="/privacy">Privacy policy</Link> page (or the email published there
              when available).
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>2. What STELLUN is for</h2>
            <p>
              STELLUN provides educational and informational tools: orbital context, sky
              conditions, space weather summaries, mission directories, news aggregation,
              study aids, and an optional AI assistant. It is aimed at students,
              enthusiasts, and researchers for learning and planning—not for certified
              professional services.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>3. No operational or safety-critical use</h2>
            <p>
              Do <strong>not</strong> rely on STELLUN for aviation, maritime navigation,
              emergency response, spacecraft operations, launch decisions, medical advice,
              legal advice, or any activity where wrong data could cause harm, loss, or
              injury.
            </p>
            <p>
              Positions, pass times, weather indices, launch times, and similar figures are
              approximate, may be delayed, cached, or wrong, and must be checked against
              official sources before any consequential decision.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>4. Service “as is”</h2>
            <p>
              STELLUN is provided <strong>as is</strong> and <strong>as available</strong>,
              without warranties of any kind, whether express or implied, including
              accuracy, completeness, merchantability, fitness for a particular purpose, or
              non-infringement, to the fullest extent permitted by law.
            </p>
            <p>
              Feeds may go down, APIs may change, and calculations may contain errors. We
              may change, suspend, or discontinue features without notice.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>5. Accounts</h2>
            <p>
              Some features require an account. You must provide accurate information, keep
              your password confidential, and notify us if you believe your account is
              compromised. You are responsible for activity under your account.
            </p>
            <p>
              You must be at least <strong>16 years old</strong> (or the digital consent age
              in your country, if higher) to create an account. If you are under the age of
              majority where you live, you may use STELLUN only with a parent or guardian’s
              involvement as required by local law.
            </p>
            <p>
              We may suspend or terminate accounts that abuse the service, violate these
              terms, or put other users or systems at risk.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>6. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Attempt to break into, overload, or disrupt STELLUN or its providers</li>
              <li>Scrape or bulk-harvest the service in a way that harms availability or violates upstream data providers’ terms</li>
              <li>Use the service to harass others, distribute malware, or break the law</li>
              <li>Misrepresent STELLUN as an official agency product</li>
              <li>Upload content you do not have the right to use</li>
            </ul>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>7. Stellun AI</h2>
            <p>
              The optional AI assistant can produce incorrect, incomplete, or outdated
              answers. It is <strong>not</strong> a substitute for textbooks, instructors,
              primary scientific sources, or professional advice. You remain responsible for
              how you use any answer.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>8. Your content</h2>
            <p>
              If you submit feedback, suggestions, profile information, study notes, or
              files, you keep ownership of your content. You grant STELLUN a worldwide,
              non-exclusive license to host, process, and display that content as needed to
              operate the features you use.
            </p>
            <p>
              You represent that you have the rights to submit that content and that it does
              not infringe others’ rights. We may remove content that appears unlawful,
              abusive, or harmful. To report infringement or abuse, use the contact path on
              the Privacy policy page.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>9. Third-party data and links</h2>
            <p>
              Mission facts, imagery, and live feeds often come from third parties (for
              example NASA, NOAA, CelesTrak, and news APIs). Their terms and licenses still
              apply. Outbound links are for convenience; we are not responsible for
              third-party sites.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>10. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by applicable law, STELLUN and its operators
              are not liable for any indirect, incidental, special, consequential, or
              punitive damages, or for loss of data, profits, or opportunities, arising from
              your use of the service or reliance on any content.
            </p>
            <p>
              Where liability cannot be excluded, it is limited to the greater of (a) the
              amount you paid us for the service in the three months before the claim, or
              (b) zero if the service is free.
            </p>
            <p>
              Some jurisdictions do not allow certain limitations; in those places, the
              limits apply only to the maximum extent allowed.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>11. Privacy</h2>
            <p>
              How we handle personal data is described in the{" "}
              <Link to="/privacy">Privacy policy</Link>. By using STELLUN you also
              acknowledge that policy.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>12. Changes</h2>
            <p>
              We may update these terms. The “Last updated” date will change when we do. Continued
              use after changes means you accept the revised terms, except where local law
              requires a different process.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>13. Governing law</h2>
            <p>
              These terms are governed by the laws of the <strong>Federal Republic of
              Nigeria</strong>, without regard to conflict-of-law rules, except where
              mandatory consumer protections in your country of residence say otherwise.
              Courts in Nigeria shall have jurisdiction, subject to those mandatory rights.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>14. Related pages</h2>
            <p>
              <Link to="/privacy">Privacy policy</Link>
              {" · "}
              <Link to="/about">Data sources &amp; methodology</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
