import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  TRACKS,
  readAcademyProfile,
  writeAcademyProfile,
  type AcademyProfile,
  type AcademyTrackId,
} from "@/lib/academy-profile";
import {
  useAcademyPrefs,
  type AcademyAppearance,
  type AcademyPrefs,
  type AcademyTextSize,
} from "@/lib/academy-prefs";
import { useStudyWorkspaces } from "@/lib/study-workspace";

/**
 * Academy settings
 * ----------------
 * Study goals, reading, appearance, notifications, and data.
 * Everything here is saved in this browser. Notification choices are
 * recorded but not delivered yet (email and phone alerts are not connected).
 */

export const Route = createFileRoute("/_authenticated/academy/settings")({
  head: () => ({
    meta: [
      { title: "Academy settings · STELLUN" },
      {
        name: "description",
        content: "Set up study goals, reading, appearance, and notifications for the Academy.",
      },
    ],
  }),
  component: AcademySettingsPage,
});

type SectionId = "goals" | "reading" | "display" | "notifications" | "data";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "goals", label: "Study goals" },
  { id: "reading", label: "Reading" },
  { id: "display", label: "Display" },
  { id: "notifications", label: "Notifications" },
  { id: "data", label: "Data and privacy" },
];

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function AcademySettingsPage() {
  const [section, setSection] = useState<SectionId>("goals");

  return (
    <div className="ac-page">
      <div className="ac-top">
        <div>
          <h1 className="ac-title">Academy settings</h1>
          <p className="ac-sub">
            Set up how the Academy works for you. Changes save as you make them, in this browser.
          </p>
        </div>
      </div>

      <div className="ac-settings">
        <nav className="ac-settings-nav" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-current={section === s.id ? "true" : undefined}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="ac-section-stack">
          {section === "goals" && <GoalsSection />}
          {section === "reading" && <ReadingSection />}
          {section === "display" && <DisplaySection />}
          {section === "notifications" && <NotificationsSection />}
          {section === "data" && <DataSection />}
        </div>
      </div>
    </div>
  );
}

function GoalsSection() {
  const [prefs, save] = useAcademyPrefs();
  const [profile, setProfile] = useState<AcademyProfile | null>(null);

  useEffect(() => {
    setProfile(readAcademyProfile());
  }, []);

  const tracks = profile?.tracks ?? [];

  const toggleTrack = (id: AcademyTrackId) => {
    if (!profile) return;
    const next = tracks.includes(id) ? tracks.filter((x) => x !== id) : [...tracks, id];
    const primary =
      profile.primaryTrack && next.includes(profile.primaryTrack) ? profile.primaryTrack : null;
    setProfile(writeAcademyProfile({ tracks: next, primaryTrack: primary }));
  };

  const setPrimary = (value: string) => {
    if (!profile) return;
    setProfile(writeAcademyProfile({ primaryTrack: (value || null) as AcademyTrackId | null }));
  };

  return (
    <section className="ac-card" aria-labelledby="goals-h">
      <h2 id="goals-h" className="ac-h2">
        Study goals
      </h2>

      <div className="ac-setting">
        <div>
          <div className="ac-setting-label" id="goal-hours-label">
            Weekly study goal
          </div>
          <div className="ac-setting-help">Hours you plan to study each week.</div>
        </div>
        <input
          className="ac-input"
          style={{ maxWidth: 140 }}
          type="number"
          inputMode="numeric"
          min={1}
          max={60}
          aria-labelledby="goal-hours-label"
          value={prefs.weeklyGoalHours}
          onChange={(e) =>
            save({ weeklyGoalHours: clampInt(e.target.value, 1, 60, prefs.weeklyGoalHours) })
          }
        />
      </div>

      <div className="ac-setting">
        <div>
          <div className="ac-setting-label" id="exam-date-label">
            Exam date
          </div>
          <div className="ac-setting-help">Optional. Used for planning, not for reminders yet.</div>
        </div>
        <input
          className="ac-input"
          style={{ maxWidth: 200 }}
          type="date"
          aria-labelledby="exam-date-label"
          value={prefs.examDate}
          onChange={(e) => save({ examDate: e.target.value })}
        />
      </div>

      <fieldset className="ac-setting ac-setting--stack" style={{ border: 0, margin: 0, padding: "16px 0" }}>
        <legend className="ac-setting-label" style={{ padding: 0 }}>
          Subjects
        </legend>
        <div className="ac-setting-help" style={{ marginTop: 0 }}>
          Subjects you follow appear first on the dashboard.
        </div>
        <div className="ac-stack" style={{ gap: 10, marginTop: 8 }}>
          {TRACKS.map((t) => (
            <label key={t.id} className="ac-check-row" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={tracks.includes(t.id)}
                onChange={() => toggleTrack(t.id)}
                style={{ width: 18, height: 18, marginTop: 2 }}
              />
              <span>
                <strong>{t.label}</strong>
                <span className="ac-setting-help" style={{ display: "block", marginTop: 2 }}>
                  {t.blurb}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {tracks.length > 0 && (
        <div className="ac-setting ac-setting--stack">
          <label className="ac-field">
            <span className="ac-setting-label">Primary subject</span>
            <select
              className="ac-select"
              value={profile?.primaryTrack ?? ""}
              onChange={(e) => setPrimary(e.target.value)}
            >
              <option value="">None</option>
              {tracks.map((id) => (
                <option key={id} value={id}>
                  {TRACKS.find((t) => t.id === id)?.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </section>
  );
}

function ReadingSection() {
  const [prefs, save] = useAcademyPrefs();
  const sizes: { id: AcademyTextSize; label: string }[] = [
    { id: "small", label: "Small" },
    { id: "medium", label: "Medium" },
    { id: "large", label: "Large" },
  ];

  return (
    <section className="ac-card" aria-labelledby="reading-h">
      <h2 id="reading-h" className="ac-h2">
        Reading
      </h2>
      <div className="ac-setting">
        <div>
          <div className="ac-setting-label" id="text-size-label">
            Text size
          </div>
          <div className="ac-setting-help">Applies in the workspace reader.</div>
        </div>
        <div className="ac-seg" role="group" aria-labelledby="text-size-label">
          {sizes.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={prefs.textSize === s.id}
              onClick={() => save({ textSize: s.id })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function DisplaySection() {
  const [prefs, save] = useAcademyPrefs();
  const options: { id: AcademyAppearance; label: string }[] = [
    { id: "system", label: "Match device" },
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
  ];

  return (
    <section className="ac-card" aria-labelledby="display-h">
      <h2 id="display-h" className="ac-h2">
        Display
      </h2>
      <div className="ac-setting">
        <div>
          <div className="ac-setting-label" id="appearance-label">
            Appearance
          </div>
          <div className="ac-setting-help">
            Applies to the Academy only. Match device follows your phone or computer setting.
          </div>
        </div>
        <div className="ac-seg" role="group" aria-labelledby="appearance-label">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={prefs.appearance === o.id}
              onClick={() => save({ appearance: o.id })}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="ac-switch"
      onClick={() => onChange(!checked)}
    />
  );
}

function NotificationsSection() {
  const [prefs, save] = useAcademyPrefs();
  const rows: {
    key: "remindersOn" | "achievementAlerts" | "weeklySummary";
    label: string;
    help: string;
  }[] = [
    { key: "remindersOn", label: "Learning reminders", help: "A reminder at your usual study time." },
    { key: "achievementAlerts", label: "Milestone alerts", help: "When you reach a milestone." },
    { key: "weeklySummary", label: "Weekly summary", help: "A short summary of the week." },
  ];

  return (
    <section className="ac-card" aria-labelledby="notif-h">
      <h2 id="notif-h" className="ac-h2">
        Notifications
      </h2>
      <p className="ac-setting-help" style={{ marginTop: 0 }}>
        These choices are saved in this browser. Email and phone alerts are not connected yet, so
        nothing is sent for now.
      </p>
      {rows.map((r) => (
        <div key={r.key} className="ac-setting">
          <div>
            <div className="ac-setting-label">{r.label}</div>
            <div className="ac-setting-help">{r.help}</div>
          </div>
          <Switch
            label={r.label}
            checked={Boolean(prefs[r.key])}
            onChange={(next) => save({ [r.key]: next } as Partial<AcademyPrefs>)}
          />
        </div>
      ))}
    </section>
  );
}

function DataSection() {
  const { workspaces, remove, ready } = useStudyWorkspaces();
  const [prefs] = useAcademyPrefs();
  const [message, setMessage] = useState("");

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      workspaces,
      profile: readAcademyProfile(),
      preferences: prefs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stellun-academy-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Your export has started. Check your downloads.");
  };

  const deleteAll = () => {
    if (!workspaces.length) {
      setMessage("There are no workspaces to delete.");
      return;
    }
    if (!window.confirm("Delete all workspaces and their notes? This cannot be undone.")) return;
    workspaces.forEach((w) => remove(w.id));
    setMessage("All workspaces were deleted.");
  };

  return (
    <section className="ac-card ac-danger-zone" aria-labelledby="data-h">
      <h2 id="data-h" className="ac-h2">
        Data and privacy
      </h2>

      <div className="ac-setting">
        <div>
          <div className="ac-setting-label">Export study data</div>
          <div className="ac-setting-help">
            Workspaces, notes, plans, and settings as a file on your device.
          </div>
        </div>
        <button type="button" className="ac-btn ac-btn--ghost" onClick={exportData}>
          Export
        </button>
      </div>

      <div className="ac-setting">
        <div>
          <div className="ac-setting-label">Delete all workspaces</div>
          <div className="ac-setting-help">
            Removes every workspace and note from this browser. This cannot be undone.
          </div>
        </div>
        <button type="button" className="ac-btn ac-btn--danger" onClick={deleteAll} disabled={!ready}>
          Delete
        </button>
      </div>

      {message && (
        <p className="ac-small" role="status" aria-live="polite" style={{ margin: 0 }}>
          {message}
        </p>
      )}
    </section>
  );
}
