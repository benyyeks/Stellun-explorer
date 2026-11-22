/**
 * Homework: due dates, scores, and late penalties.
 *
 * Each task carries its own penalty rule. Four kinds exist:
 *   - percent: a percentage of the score per late day, up to a cap
 *   - points:  a fixed number of points per late day, up to a cap
 *   - zero:    full mark until a number of late days, then zero
 *   - none:    no penalty
 * Every kind can have a grace period (hours after the deadline with no penalty).
 * Late days are whole days, rounded up, counted after the grace period.
 * Sections remember the penalty rule last used for them.
 */

import { useEffect, useState } from "react";
import type { GlossaryTrack } from "@/lib/glossary";

export type Penalty =
  | { kind: "percent"; perDay: number; cap: number; graceHours: number }
  | { kind: "points"; perDay: number; cap: number; graceHours: number }
  | { kind: "zero"; afterDays: number; graceHours: number }
  | { kind: "none" };

export type Homework = {
  id: string;
  title: string;
  track: GlossaryTrack;
  dueAt: string;
  maxPoints: number;
  penalty: Penalty;
  submittedAt: string | null;
  score: number | null;
  createdAt: string;
  /** "plan" when the task came from the daily plan. planItemId stops it being added twice. */
  source?: "manual" | "plan";
  planItemId?: string;
};

export type HomeworkStatus = "upcoming" | "due-soon" | "overdue" | "submitted" | "graded";

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
const KEY = "stellun:academy-homework:v1";
const DEFAULTS_KEY = "stellun:academy-penalty-defaults:v1";

export const DEFAULT_PENALTY: Penalty = { kind: "percent", perDay: 10, cap: 50, graceHours: 0 };

const graceOf = (p: Penalty) => (p.kind === "none" ? 0 : p.graceHours);
const round1 = (n: number) => Math.round(n * 10) / 10;

export function describePenalty(p: Penalty, maxPoints: number): string {
  const grace = graceOf(p) > 0 ? ` Submissions within ${graceOf(p)} hour${graceOf(p) === 1 ? "" : "s"} of the deadline are not penalised.` : "";
  if (p.kind === "none") return "No late penalty.";
  if (p.kind === "percent") return `${p.perDay}% of the score per late day, capped at ${p.cap}%.${grace}`;
  if (p.kind === "points") return `${p.perDay} point${p.perDay === 1 ? "" : "s"} per late day, capped at ${p.cap} of ${maxPoints}.${grace}`;
  return `Full mark until ${p.afterDays} late day${p.afterDays === 1 ? "" : "s"}, then zero.${grace}`;
}

export function gradeOf(h: Homework, now: number = Date.now()) {
  const due = Date.parse(h.dueAt);
  const submitted = h.submittedAt ? Date.parse(h.submittedAt) : null;
  const end = submitted ?? now;
  const p = h.penalty;
  const lateHours = Math.max(0, (end - due) / HOUR_MS - graceOf(p));
  const lateDays = lateHours > 0 ? Math.ceil(lateHours / 24) : 0;

  let deductionPct = 0;
  let deductionPts = 0;
  let zero = false;
  if (p.kind === "percent") deductionPct = Math.min(p.cap, lateDays * p.perDay);
  if (p.kind === "points") deductionPts = Math.min(p.cap, lateDays * p.perDay);
  if (p.kind === "zero") zero = lateDays > p.afterDays;

  let finalScore: number | null = null;
  if (h.score !== null) {
    if (zero) finalScore = 0;
    else if (p.kind === "percent") finalScore = Math.max(0, h.score * (1 - deductionPct / 100));
    else if (p.kind === "points") finalScore = Math.max(0, h.score - deductionPts);
    else finalScore = h.score;
    finalScore = round1(finalScore);
  }

  const penaltyPct = zero
    ? 100
    : p.kind === "percent"
      ? deductionPct
      : p.kind === "points" && h.maxPoints > 0
        ? (deductionPts / h.maxPoints) * 100
        : 0;

  let status: HomeworkStatus;
  if (h.score !== null) status = "graded";
  else if (submitted !== null) status = "submitted";
  else if (now > due) status = "overdue";
  else status = due - now < DAY_MS ? "due-soon" : "upcoming";

  return { status, due, submitted, lateDays, penaltyPct, deductionPts, zero, finalScore };
}

export const STATUS_LABEL: Record<HomeworkStatus, string> = {
  upcoming: "Upcoming",
  "due-soon": "Due within a day",
  overdue: "Overdue",
  submitted: "Submitted, not graded",
  graded: "Graded",
};

/** Upgrades items saved by the earlier version (one fixed rule) to the penalty model. */
export function normalizeHomework(raw: unknown): Homework[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const h = item as Homework & { penaltyPerDay?: number; maxPenalty?: number };
    if (h.penalty) return h;
    const { penaltyPerDay, maxPenalty, ...rest } = h;
    return {
      ...rest,
      penalty: { kind: "percent", perDay: penaltyPerDay ?? 10, cap: maxPenalty ?? 50, graceHours: 0 },
    } as Homework;
  });
}

export function useHomework() {
  const [items, setItems] = useState<Homework[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      setItems(normalizeHomework(raw ? (JSON.parse(raw) as unknown) : []));
    } catch {
      setItems([]);
    }
  }, []);

  const save = (next: Homework[]) => {
    setItems(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full or blocked: the list stays for this visit */
    }
  };

  return {
    items,
    add: (input: Omit<Homework, "id" | "createdAt" | "submittedAt" | "score">) =>
      save([
        {
          ...input,
          id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
          submittedAt: null,
          score: null,
          createdAt: new Date().toISOString(),
        },
        ...items,
      ]),
    update: (id: string, patch: Partial<Homework>) => save(items.map((h) => (h.id === id ? { ...h, ...patch } : h))),
    remove: (id: string) => save(items.filter((h) => h.id !== id)),
  };
}

/** The penalty rule each section last used, so the next task in that section starts with it. */
export function usePenaltyDefaults() {
  const [defaults, setDefaults] = useState<Partial<Record<GlossaryTrack, Penalty>>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DEFAULTS_KEY);
      setDefaults(raw ? (JSON.parse(raw) as Partial<Record<GlossaryTrack, Penalty>>) : {});
    } catch {
      setDefaults({});
    }
  }, []);

  const remember = (track: GlossaryTrack, penalty: Penalty) => {
    const next = { ...defaults, [track]: penalty };
    setDefaults(next);
    try {
      window.localStorage.setItem(DEFAULTS_KEY, JSON.stringify(next));
    } catch {
      /* storage full or blocked */
    }
  };

  return { defaults, remember };
}
