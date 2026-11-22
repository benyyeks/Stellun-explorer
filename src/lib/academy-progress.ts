/**
 * Learner progress for the academy, kept on this device.
 * Quiz sets, flashcards, word match and new terms are recorded here, so the page can show
 * the learner's own success rate. The server keeps its own copy of every quiz attempt,
 * and that copy is what the daily plan uses for planning.
 */

const KEY = "stellun:academy-progress:v1";
const QUIZ_KEY = "stellun:academy-quiz-history:v1";

type Entry = { track: string; right: number; wrong: number; last: string };

function read(): Record<string, Entry> {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, Entry>) : {};
  } catch {
    return {};
  }
}

export function recordTermResult(termId: string, track: string, correct: boolean): void {
  const all = read();
  const prev: Entry = all[termId] ?? { track, right: 0, wrong: 0, last: "" };
  all[termId] = {
    track,
    right: prev.right + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    last: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage full or blocked: progress is simply not kept */
  }
}

/** Terms the learner gets wrong more often than right, and every term seen so far. */
export function progressForPlan(): { weakTerms: string[]; seenTerms: string[] } {
  const all = read();
  const seen = Object.keys(all);
  const weak = seen.filter((k) => (all[k]?.wrong ?? 0) > (all[k]?.right ?? 0));
  return { weakTerms: weak.slice(0, 60), seenTerms: seen.slice(0, 400) };
}

export type QuizSetRecord = {
  date: string;
  attemptId: string;
  score: number;
  total: number;
  at: string;
  items: { track: string; category: string; style: string; correct: boolean }[];
};

export function readQuizHistory(): QuizSetRecord[] {
  try {
    const raw = window.localStorage.getItem(QUIZ_KEY);
    return raw ? (JSON.parse(raw) as QuizSetRecord[]) : [];
  } catch {
    return [];
  }
}

export function recordQuizSet(rec: Omit<QuizSetRecord, "at">): void {
  const list = [{ ...rec, at: new Date().toISOString() }, ...readQuizHistory()].slice(0, 100);
  try {
    window.localStorage.setItem(QUIZ_KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked */
  }
}

/** Overall and per-category success from this device's quiz history. */
export function quizSummary(): {
  sets: number;
  right: number;
  total: number;
  successRate: number | null;
  byCategory: { category: string; right: number; wrong: number; rate: number }[];
} {
  const history = readQuizHistory();
  let right = 0;
  let total = 0;
  const map = new Map<string, { right: number; wrong: number }>();
  for (const set of history) {
    for (const it of set.items) {
      total++;
      if (it.correct) right++;
      const s = map.get(it.category) ?? { right: 0, wrong: 0 };
      if (it.correct) s.right++;
      else s.wrong++;
      map.set(it.category, s);
    }
  }
  const byCategory = [...map.entries()]
    .map(([category, s]) => ({ category, ...s, rate: s.right / (s.right + s.wrong || 1) }))
    .sort((a, b) => a.rate - b.rate);
  return { sets: history.length, right, total, successRate: total ? right / total : null, byCategory };
}
