/**
 * Which kinds of work a learner gets on a given day.
 *
 * Pure and deterministic: the same learner and date always give the same mix, so the
 * browser and the server agree without storing anything first. Not every day has tasks:
 * each week has one or two rest days, on different weekdays for different learners.
 * Homework comes about once a week, and more often when something is due soon.
 */

export type PlanType = "homework" | "quiz" | "flashcards" | "word_match" | "new_terms";

export type RhythmHints = { hasWorkspaces: boolean; homeworkDueSoon: boolean };
export type DayMix = { restDay: boolean; types: PlanType[] };

const MAX_TYPES_PER_DAY = 3;
const DAILY_RATES: Record<"quiz" | "flashcards" | "word_match" | "new_terms", number> = {
  quiz: 0.45,
  flashcards: 0.55,
  word_match: 0.3,
  new_terms: 0.35,
};
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export function hash32(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small seeded random generator (mulberry32). Returns numbers in [0, 1). */
export function rng(seed: string): () => number {
  let a = hash32(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWith<T>(rand: () => number, items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Monday (YYYY-MM-DD) of the week that contains the date. */
export function weekStart(dateKey: string): string {
  const d = new Date(dateKey + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** 0 = Monday ... 6 = Sunday. */
export function weekdayOf(dateKey: string): number {
  return (new Date(dateKey + "T00:00:00Z").getUTCDay() + 6) % 7;
}

/** True when a task that is not submitted yet is due within the next two days (or was due within the last day). */
export function homeworkDueSoon(items: { dueAt: string | null; submitted: boolean }[], nowMs: number): boolean {
  const DAY = 86_400_000;
  return items.some((h) => {
    if (h.submitted || !h.dueAt) return false;
    const due = Date.parse(h.dueAt);
    return Number.isFinite(due) && due - nowMs < 2 * DAY && nowMs - due < DAY;
  });
}

export function mixFor(userId: string, dateKey: string, hints: RhythmHints): DayMix {
  const week = weekStart(dateKey);
  const day = weekdayOf(dateKey);

  const restRand = rng(`${userId}|rest|${week}`);
  const restCount = restRand() < 0.6 ? 1 : 2;
  const restDays = shuffleWith(restRand, WEEKDAYS).slice(0, restCount);
  if (restDays.includes(day)) return { restDay: true, types: [] };
  const workDays = WEEKDAYS.filter((d) => !restDays.includes(d));

  const hwRand = rng(`${userId}|homework|${week}`);
  const hwCount = !hints.hasWorkspaces ? 0 : hints.homeworkDueSoon ? 2 : hwRand() < 0.5 ? 1 : 0;
  const homeworkDays = shuffleWith(hwRand, workDays).slice(0, hwCount);

  const dayRand = rng(`${userId}|day|${dateKey}`);
  const types: PlanType[] = [];
  if (homeworkDays.includes(day)) types.push("homework");
  for (const t of ["quiz", "flashcards", "word_match", "new_terms"] as const) {
    if (dayRand() < DAILY_RATES[t]) types.push(t);
  }
  if (types.length === 0) types.push("flashcards");
  return { restDay: false, types: types.slice(0, MAX_TYPES_PER_DAY) };
}
