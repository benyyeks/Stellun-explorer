/**
 * Academy preferences: appearance, reading text size, study goal, and
 * notification choices. Stored in this browser only (localStorage).
 * Email and push delivery are not wired up yet, so the notification
 * toggles record intent and do not send anything.
 */

import { useEffect, useState } from "react";

export type AcademyAppearance = "system" | "light" | "dark";
export type AcademyTextSize = "small" | "medium" | "large";

export type AcademyPrefs = {
  appearance: AcademyAppearance;
  textSize: AcademyTextSize;
  weeklyGoalHours: number;
  examDate: string;
  remindersOn: boolean;
  achievementAlerts: boolean;
  weeklySummary: boolean;
};

export const DEFAULT_ACADEMY_PREFS: AcademyPrefs = {
  appearance: "system",
  textSize: "medium",
  weeklyGoalHours: 10,
  examDate: "",
  remindersOn: true,
  achievementAlerts: true,
  weeklySummary: false,
};

const KEY = "stellun:academy-prefs:v1";
const EVENT = "stellun:academy-prefs-changed";

export function readAcademyPrefs(): AcademyPrefs {
  if (typeof window === "undefined") return DEFAULT_ACADEMY_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_ACADEMY_PREFS;
    const parsed = JSON.parse(raw) as Partial<AcademyPrefs>;
    return { ...DEFAULT_ACADEMY_PREFS, ...parsed };
  } catch {
    return DEFAULT_ACADEMY_PREFS;
  }
}

export function writeAcademyPrefs(patch: Partial<AcademyPrefs>): AcademyPrefs {
  const next = { ...readAcademyPrefs(), ...patch };
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* storage full or blocked: keep the in-memory value */
  }
  return next;
}

/** Live preferences for components. Updates everywhere when one part saves. */
export function useAcademyPrefs(): [AcademyPrefs, (patch: Partial<AcademyPrefs>) => void] {
  const [prefs, setPrefs] = useState<AcademyPrefs>(DEFAULT_ACADEMY_PREFS);

  useEffect(() => {
    const sync = () => setPrefs(readAcademyPrefs());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const save = (patch: Partial<AcademyPrefs>) => {
    setPrefs(writeAcademyPrefs(patch));
  };

  return [prefs, save];
}
