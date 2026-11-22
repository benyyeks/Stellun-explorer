/**
 * Daily items that change each day and do not repeat.
 *
 * Each kind of item (word match, puzzle, daily question) keeps a history of the
 * items already shown. A new pick draws only from items not yet shown. When every
 * item has been shown once, the history starts again and the pick says so.
 * The day's pick is saved, so reopening the page on the same day shows the same items.
 */

export const dayKey = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked */
  }
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export type Pick<T> = { items: T[]; reset: boolean };

const historyKey = (kind: string) => `stellun:practice-history:v1:${kind}`;
const dailyKey = (kind: string) => `stellun:practice-daily:v1:${kind}`;

/** Draws items not shown before. Starts the history again when the pool runs out. */
export function freshPick<T>(kind: string, pool: T[], keyOf: (t: T) => string, count: number): Pick<T> {
  // An empty pool (content still loading) must not change the history.
  if (pool.length === 0) return { items: [], reset: false };
  const used = new Set(readJSON<string[]>(historyKey(kind), []));
  let candidates = pool.filter((t) => !used.has(keyOf(t)));
  let reset = false;
  if (candidates.length < count) {
    used.clear();
    candidates = [...pool];
    reset = true;
  }
  const items = shuffle(candidates).slice(0, count);
  for (const t of items) used.add(keyOf(t));
  writeJSON(historyKey(kind), [...used]);
  return { items, reset };
}

/** The day's items. Stable for the whole day; a new set, not seen before, the next day. */
export function dailyPick<T>(kind: string, pool: T[], keyOf: (t: T) => string, count: number, date: string = dayKey()): Pick<T> {
  // An empty pool (content still loading) must not overwrite the day's saved pick.
  if (pool.length === 0) return { items: [], reset: false };
  const byKey = new Map(pool.map((t) => [keyOf(t), t] as const));
  const saved = readJSON<{ date: string; keys: string[] }>(dailyKey(kind), { date: "", keys: [] });
  if (saved.date === date) {
    const items = saved.keys.map((k) => byKey.get(k)).filter((x): x is T => x !== undefined);
    if (items.length === Math.min(count, pool.length)) return { items, reset: false };
  }
  const picked = freshPick(kind, pool, keyOf, count);
  writeJSON(dailyKey(kind), { date, keys: picked.items.map(keyOf) });
  return picked;
}
