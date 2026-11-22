import { homeworkDueSoon, mixFor, shuffleWith, type DayMix, type RhythmHints } from "./rhythm";
import { normalizeText } from "./validate";
import type { AttemptResult, CategoryStat } from "./store";
import type { DailyPlan, PackTerm, PlanContext, QuizItem, TrackId } from "./types";

const DAY = 86_400_000;
const dayNum = (key: string) => Date.parse(key + "T00:00:00Z") / DAY;

/** A term or question is not used again for this many days. */
export const NO_REPEAT_DAYS = 14;

export function shiftDate(key: string, days: number): string {
  const d = new Date(key + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function rhythmHints(context: PlanContext, now: Date): RhythmHints {
  const dueSoon = homeworkDueSoon(
    context.homework.map((h) => ({ dueAt: h.dueAt, submitted: h.status === "submitted" || h.status === "graded" })),
    now.getTime(),
  );
  return { hasWorkspaces: context.workspaces.length > 0, homeworkDueSoon: dueSoon };
}

export function mixOn(userId: string, date: string, context: PlanContext, now: Date): DayMix {
  return mixFor(userId, date, rhythmHints(context, now));
}

/** The next day (within `within` days) that has a quiz, so the Quiz page can say when the next one is. */
export function nextQuizDate(userId: string, fromDate: string, context: PlanContext, now: Date, within = 14): string | null {
  for (let i = 1; i <= within; i++) {
    const d = shiftDate(fromDate, i);
    if (mixOn(userId, d, context, now).types.includes("quiz")) return d;
  }
  return null;
}

/** Terms and wording used recently, from plans and quiz sets. Used to avoid repeats. */
export function historyFrom(
  plans: DailyPlan[],
  pools: { date: string; questions: QuizItem[] }[],
): { lastUsed: Map<string, string>; avoid: Set<string> } {
  const lastUsed = new Map<string, string>();
  const avoid = new Set<string>();
  const mark = (id: string, date: string) => {
    const prev = lastUsed.get(id);
    if (!prev || prev < date) lastUsed.set(id, date);
  };
  for (const p of plans) {
    for (const x of p.quiz ?? []) {
      mark(x.term_id, p.date);
      avoid.add(normalizeText(x.prompt));
    }
    for (const x of p.flashcards ?? []) {
      mark(x.term_id, p.date);
      avoid.add(normalizeText(x.front));
    }
    for (const x of p.word_match ?? []) mark(x.term_id, p.date);
    for (const x of p.new_terms ?? []) mark(x.term_id, p.date);
    if (p.homework) {
      avoid.add(normalizeText(p.homework.title));
      for (const part of p.homework.parts) avoid.add(normalizeText(part));
    }
  }
  for (const pool of pools) {
    for (const q of pool.questions) {
      mark(q.term_id, pool.date);
      avoid.add(normalizeText(q.prompt));
    }
  }
  return { lastUsed, avoid };
}

/** Success by category across the given attempts, weakest first. */
export function categoryStats(rows: { results: AttemptResult[] }[]): CategoryStat[] {
  const map = new Map<string, CategoryStat>();
  for (const row of rows) {
    for (const r of row.results) {
      const s = map.get(r.category) ?? { category: r.category, right: 0, wrong: 0 };
      if (r.correct) s.right++;
      else s.wrong++;
      map.set(r.category, s);
    }
  }
  const rate = (s: CategoryStat) => s.right / (s.right + s.wrong || 1);
  return [...map.values()].sort((a, b) => rate(a) - rate(b));
}

/** Categories where the learner is wrong more often than right, with at least two answers. */
export function weakCategories(stats: CategoryStat[]): string[] {
  return stats.filter((s) => s.wrong > s.right && s.right + s.wrong >= 2).map((s) => s.category).slice(0, 3);
}

/**
 * Terms in priority order. Terms used in the last 14 days come last. Then terms the
 * learner is weak on or in weak categories, then never-used terms, then the oldest-used.
 */
export function buildPack(
  terms: PackTerm[],
  tracks: TrackId[],
  weakTerms: string[],
  weakCats: string[],
  lastUsed: Map<string, string>,
  date: string,
  rand: () => number,
): PackTerm[] {
  const inTracks = tracks.length ? terms.filter((t) => tracks.includes(t.track)) : terms;
  const pool = shuffleWith(rand, inTracks.length >= 20 ? inTracks : terms);
  const weakIds = new Set(weakTerms);
  const weakCat = new Set(weakCats);
  const ranked = pool.map((t) => {
    const last = lastUsed.get(t.id);
    const age = last ? dayNum(date) - dayNum(last) : Infinity;
    const group = age <= NO_REPEAT_DAYS ? 3 : weakIds.has(t.id) || weakCat.has(t.category) ? 0 : last === undefined ? 1 : 2;
    return { t, group, age };
  });
  ranked.sort((a, b) => a.group - b.group || (a.age === b.age ? 0 : a.age < b.age ? 1 : -1));
  return ranked.map((r) => r.t).slice(0, 60);
}
