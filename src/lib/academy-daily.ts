/**
 * Academy daily tasks & lightweight quiz bank (Stage 3).
 * Tasks come from open checklist items first; flashcards fill the rest.
 * Stored only in memory + derived from local workspace data — no extra API.
 */

import type { StudyWorkspace } from "@/lib/study-workspace";

export type DailyTask = {
  id: string;
  label: string;
  source: "checklist" | "flashcard";
  workspaceId?: string;
  workspaceTitle?: string;
};

export type QuizQuestion = {
  id: string;
  track: "aerospace" | "astronomy" | "aviation" | "general";
  prompt: string;
  choices: string[];
  /** Index into choices */
  answer: number;
  explain: string;
};

/** Seed flashcards when the learner has no open checklist items. */
const FLASHCARD_SEEDS: DailyTask[] = [
  {
    id: "fc-visviva",
    label: "Recall the vis-viva equation and when energy is negative",
    source: "flashcard",
  },
  {
    id: "fc-altimeter",
    label: "Name the cockpit instrument that reports altitude above mean sea level",
    source: "flashcard",
  },
  {
    id: "fc-kepler3",
    label: "State Kepler’s third law for two bodies in a simple form",
    source: "flashcard",
  },
  {
    id: "fc-hohmann",
    label: "Sketch a Hohmann transfer: two burns, elliptical bridge orbit",
    source: "flashcard",
  },
];

export function buildDailyTasks(workspaces: StudyWorkspace[], limit = 5): DailyTask[] {
  const fromChecklist: DailyTask[] = [];
  for (const w of workspaces) {
    for (const c of w.checklist) {
      if (c.done) continue;
      fromChecklist.push({
        id: `chk-${w.id}-${c.id}`,
        label: c.label,
        source: "checklist",
        workspaceId: w.id,
        workspaceTitle: w.title,
      });
      if (fromChecklist.length >= limit) return fromChecklist;
    }
  }
  const need = limit - fromChecklist.length;
  return [...fromChecklist, ...FLASHCARD_SEEDS.slice(0, Math.max(0, need))];
}

/** Small fixed quiz bank — Stage 3 shell; expand later without schema changes. */
export const QUIZ_BANK: QuizQuestion[] = [
  {
    id: "q-periapsis",
    track: "aerospace",
    prompt: "In a closed two-body orbit, periapsis is the point of…",
    choices: [
      "Highest altitude and lowest speed",
      "Lowest altitude and highest speed",
      "Equal altitude and speed to apoapsis",
      "Zero orbital energy",
    ],
    answer: 1,
    explain:
      "Near periapsis the spacecraft is closest to the central body, so speed is highest for that orbit.",
  },
  {
    id: "q-iss-period",
    track: "astronomy",
    prompt: "Roughly how long does the ISS take to complete one orbit of Earth?",
    choices: ["About 45 minutes", "About 90 minutes", "About 6 hours", "About 24 hours"],
    answer: 1,
    explain: "Low Earth orbit stations complete a circuit roughly every 90 minutes.",
  },
  {
    id: "q-aileron",
    track: "aviation",
    prompt: "Ailerons primarily control which aircraft axis?",
    choices: ["Pitch", "Yaw", "Roll", "Throttle"],
    answer: 2,
    explain: "Ailerons create differential lift on the wings and roll the aircraft.",
  },
  {
    id: "q-delta-v",
    track: "aerospace",
    prompt: "Delta-v (Δv) is best described as…",
    choices: [
      "The mass of propellant on board",
      "A measure of change in velocity a vehicle can impart",
      "The time until atmospheric re-entry",
      "Antenna gain toward Earth",
    ],
    answer: 1,
    explain: "Δv budgets capture how much velocity change maneuvers require, independent of vehicle mass.",
  },
  {
    id: "q-magnitude",
    track: "astronomy",
    prompt: "In the astronomical magnitude scale, a smaller (or more negative) number means the object is…",
    choices: ["Farther away", "Dimmer", "Brighter", "Cooler"],
    answer: 2,
    explain: "The magnitude scale is inverted: brighter objects have smaller magnitudes.",
  },
];

export function pickQuizSet(count = 3): QuizQuestion[] {
  const copy = [...QUIZ_BANK];
  // Stable daily-ish shuffle from UTC date
  const day = new Date().toISOString().slice(0, 10);
  let seed = 0;
  for (let i = 0; i < day.length; i++) seed = (seed * 33 + day.charCodeAt(i)) >>> 0;
  for (let i = copy.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}
