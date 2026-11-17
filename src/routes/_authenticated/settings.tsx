import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/**
 * Site-wide Settings
 * ------------------
 * Not nested under Academy. Linked from the main nav on every screen size.
 * Appearance follows the system color scheme today (no forced theme toggle in CSS);
 * preferences that need storage can write to localStorage or profiles later.
 */

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings · STELLUN" },
      { name: "description", content: "Account and display preferences for STELLUN." },
    ],
  }),
  component: SettingsPage,
});

type Prefs = {
  studyReminders: boolean;
  achievementAlerts: boolean;
  weeklyEmail: boolean;
};

const PREFS_KEY = "stellun.settings.v1";

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { studyReminders: true, achievementAlerts: true, weeklyEmail: false };
    return { ...{ studyReminders: true, achievementAlerts: true, weeklyEmail: false }, ...JSON.parse(raw) };
  } catch {
    return { studyReminders: true, achievementAlerts: true, weeklyEmail: false };
  }
}

function SettingsPage() {
  const [prefs, setPrefs] = useState<Prefs>({ studyReminders: true, achievementAlerts: true, weeklyEmail: false });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore quota */
    }
  }, [prefs, ready]);

  const toggle = (key: keyof Prefs) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <main className="page-main settings-page">
      <section className="container page-hero">
        <span className="eyebrow">Account</span>
        <h1>Settings</h1>
        <p className="tagline">
          Site-wide preferences. Academy study tools are under{" "}
          <Link to="/academy">The Academy</Link>.
        </p>
      </section>

      <section className="container settings-grid-page">
        <div className="card glass glass-card">
          <h2 className="academy-sec">Appearance</h2>
          <p className="muted small" style={{ marginBottom: 12 }}>
            STELLUN follows your device light or dark setting. A manual override can be added
            later without changing the palette tokens.
          </p>
          <p className="muted small">Current mode: system preference</p>
        </div>

        <div className="card glass glass-card">
          <h2 className="academy-sec">Notifications</h2>
          <div className="settings-row">
            <div>
              <div className="settings-label">Learning reminders</div>
              <div className="muted small">Nudge at your usual study time</div>
            </div>
            <button
              type="button"
              className={`settings-sw${prefs.studyReminders ? " on" : ""}`}
              role="switch"
              aria-checked={prefs.studyReminders}
              onClick={() => toggle("studyReminders")}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Achievement alerts</div>
              <div className="muted small">When you hit a milestone</div>
            </div>
            <button
              type="button"
              className={`settings-sw${prefs.achievementAlerts ? " on" : ""}`}
              role="switch"
              aria-checked={prefs.achievementAlerts}
              onClick={() => toggle("achievementAlerts")}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Weekly summary email</div>
              <div className="muted small">Sunday recap (when mail is configured)</div>
            </div>
            <button
              type="button"
              className={`settings-sw${prefs.weeklyEmail ? " on" : ""}`}
              role="switch"
              aria-checked={prefs.weeklyEmail}
              onClick={() => toggle("weeklyEmail")}
            />
          </div>
        </div>

        <div className="card glass glass-card">
          <h2 className="academy-sec">Privacy</h2>
          <p className="muted small">
            See the{" "}
            <Link to="/privacy">privacy policy</Link> and{" "}
            <Link to="/terms">terms</Link>. Data export for study workspaces can be added when
            the profile API is ready.
          </p>
        </div>
      </section>
    </main>
  );
}
