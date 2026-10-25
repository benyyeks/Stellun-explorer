// STELLUN Privacy policy — written to match the live product (accounts, AI,
// location, captcha, hosting processors). Update this page when data practices change.
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy - STELLUN" },
      {
        name: "description",
        content:
          "STELLUN privacy policy: accounts, location, AI chats, cookies, third-party processors, and how to delete your data.",
      },
      { property: "og:title", content: "Privacy Policy - STELLUN" },
      {
        property: "og:description",
        content: "What STELLUN collects, who processes it, and your choices.",
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
              This policy explains what STELLUN collects, why, who processes it, and how
              you can control or delete it. It is meant to match the product as it runs
              today—not an earlier, account-free draft.
            </p>
            <p className="scaffold-note">Last updated: 25 October 2026</p>
          </div>

          <div className="glass glass-card scaffold-card">
            <h2>1. Summary</h2>
            <p>
              Many STELLUN tools work in the browser with public scientific data. An
              account is optional for core browsing of public pages, but signing in unlocks
              saved chats, profile features, and cross-device sync for some items.
            </p>
            <p>
              When you create an account we store your email and authentication data. If you
              use optional features we may also store profile details, AI conversations,
              feedback, suggestions, and (only if you allow it) location-related data for
              sky and pass features. We do not sell personal data and we do not run
              advertising trackers on STELLUN.
            </p>
            <p>
              Related rules of use: <Link to="/terms">Terms of Service</Link>.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>2. Who operates STELLUN</h2>
            <p>
              STELLUN is an independent educational dashboard. It is not affiliated with
              NASA, NOAA, ESA, or any other space agency. For privacy requests, use the
              contact method in section 12 below.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>3. Data we process</h2>

            <h3>3.1 Without an account</h3>
            <ul>
              <li>
                <strong>Technical logs.</strong> Hosting infrastructure (for example
                Cloudflare) may process IP address, user agent, and request metadata needed
                to deliver the site and protect it from abuse. These logs are controlled by
                the host’s own retention practices.
              </li>
              <li>
                <strong>Browser storage.</strong> Preferences such as theme, and some study
                or list data, may stay in your browser (local storage) and never leave your
                device unless a feature explicitly sends them.
              </li>
              <li>
                <strong>Location (optional).</strong> Sky and satellite-pass features can
                use your device location only after you grant permission in the browser.
                Coordinates may be sent to STELLUN’s servers for calculations or for a
                weather lookup (Open-Meteo). We do not use location for advertising.
              </li>
              <li>
                <strong>Feedback or suggestions.</strong> If you submit a form, we store the
                message and any name or email you choose to include, so we can improve the
                product or reply.
              </li>
            </ul>

            <h3>3.2 With an account</h3>
            <ul>
              <li>
                <strong>Account credentials.</strong> Email address and authentication
                secrets (handled by our auth provider). Password reset flows use email
                links.
              </li>
              <li>
                <strong>Profile.</strong> Optional display name and avatar (uploaded image
                or a preset). Avatar files are stored in object storage tied to your user
                id.
              </li>
              <li>
                <strong>Stellun AI conversations.</strong> When you are signed in, questions
                and answers can be saved to your account so you can reopen them on another
                device. You can delete individual chats or all saved chats from the Stellun
                AI page. Signed-out use does not keep a permanent chat history on the
                server in the same way.
              </li>
              <li>
                <strong>Session.</strong> Sign-in uses session tokens (typically in cookies
                or equivalent browser storage) so you stay signed in securely.
              </li>
            </ul>

            <h3>3.3 Operational data (not for marketing)</h3>
            <ul>
              <li>
                Cached public feeds (launches, weather indices, catalogues, news) so the
                site stays fast and respects upstream rate limits.
              </li>
              <li>
                Diagnostic or error events used to keep feeds healthy (admin tooling). These
                are for reliability, not for building advertising profiles.
              </li>
            </ul>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>4. Why we process data</h2>
            <ul>
              <li>Provide and secure the website and accounts</li>
              <li>Sync optional saved content you request</li>
              <li>Compute location-based sky and pass information you ask for</li>
              <li>Reply to feedback and improve the product</li>
              <li>Prevent abuse (including captcha on auth flows)</li>
              <li>Meet legal obligations if they apply</li>
            </ul>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>5. Cookies and similar technologies</h2>
            <p>
              STELLUN does <strong>not</strong> use third-party advertising or analytics
              cookies.
            </p>
            <p>
              If you sign in, <strong>essential session/auth storage</strong> is used so the
              product can recognize your account. Local storage may hold preferences and
              client-only study data. Blocking all storage may break sign-in or those
              features.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>6. Processors and third parties</h2>
            <p>
              We use service providers to run STELLUN. They process data only to provide
              their service to us:
            </p>
            <ul>
              <li>
                <strong>Supabase</strong> — authentication, database, and file storage
                (accounts, profiles, saved chats, feedback, caches).
              </li>
              <li>
                <strong>Cloudflare</strong> — hosting and delivery of the application
                (Workers / edge network).
              </li>
              <li>
                <strong>hCaptcha</strong> — bot protection on sign-in, sign-up, and password
                reset when configured.
              </li>
              <li>
                <strong>Open-Meteo</strong> — weather-related lookups when a feature needs
                them and location is provided.
              </li>
              <li>
                <strong>Public science and news sources</strong> (examples: NASA, NOAA,
                CelesTrak, Spaceflight News API, launch data providers) — requested from our
                servers or your browser to show public information. Those organizations set
                their own terms for the underlying data.
              </li>
              <li>
                <strong>AI model provider</strong> — when you use Stellun AI, the text of
                the conversation (or a recent slice of it) is sent to generate a reply.
                Avoid pasting secrets or sensitive personal data into the assistant.
              </li>
            </ul>
            <p>
              Some processors may store or process data outside Nigeria. By using STELLUN
              you understand that cross-border processing can occur as needed to operate the
              service.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>7. Location</h2>
            <p>
              Location is requested through your browser’s permission prompt. You can deny
              or revoke it in browser settings. Without location, sky and pass tools fall
              back to manual coordinates or limited functionality.
            </p>
            <p>
              We do not sell location data. Coordinates used for a request are not used to
              build a marketing profile.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>8. Children</h2>
            <p>
              STELLUN is aimed at students and enthusiasts. Under the{" "}
              <Link to="/terms">Terms of Service</Link>, accounts are for users who meet the
              stated minimum age (16, or higher if your country’s digital-consent age is
              higher).
            </p>
            <p>
              We do not knowingly create accounts for children below that age. If you believe
              a child under the minimum age has an account, contact us (section 12) and we
              will delete it.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>9. Retention</h2>
            <ul>
              <li>
                <strong>Account data</strong> — kept while the account exists.
              </li>
              <li>
                <strong>AI chats</strong> — until you delete them or the account is deleted.
              </li>
              <li>
                <strong>Feedback / suggestions</strong> — until handled or no longer needed
                for product improvement.
              </li>
              <li>
                <strong>Caches and diagnostics</strong> — short-lived operational retention
                appropriate to feed health.
              </li>
              <li>
                <strong>Host logs</strong> — per the host’s standard security practices.
              </li>
            </ul>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>10. Your choices</h2>
            <ul>
              <li>Use many features without creating an account</li>
              <li>Refuse or revoke browser location permission</li>
              <li>Delete AI conversations from the Stellun AI page when signed in</li>
              <li>Update or clear profile avatar and display name when signed in</li>
              <li>Request account and personal data deletion (section 12)</li>
            </ul>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>11. Security</h2>
            <p>
              We use industry-standard providers and access controls (including restricted
              admin access to operational data). No method of transmission or storage is
              perfectly secure. Use a unique password and protect your email account.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>12. Contact and deletion requests</h2>
            <p>
              To request access, correction, or deletion of personal data associated with
              your account, email:
            </p>
            <p>
              <strong>
                <a href="mailto:benyyeks@gmail.com">benyyeks@gmail.com</a>
              </strong>
            </p>
            <p>
              Use the same address you registered with, if you have an account, so we can
              verify the request. We will respond within a reasonable time.
            </p>
            <p className="scaffold-note">
              If you later use a dedicated domain email (for example legal@…), update this
              section so it stays accurate.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>13. Changes</h2>
            <p>
              If STELLUN’s data practices change in a material way, we will update this page
              and the “Last updated” date. Continued use after an update means you
              acknowledge the revised policy, except where local law requires more.
            </p>
          </div>

          <div className="glass glass-card scaffold-card" style={{ marginTop: 24 }}>
            <h2>14. Related pages</h2>
            <p>
              <Link to="/terms">Terms of Service</Link>
              {" · "}
              <Link to="/about">Data sources &amp; methodology</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
            }
