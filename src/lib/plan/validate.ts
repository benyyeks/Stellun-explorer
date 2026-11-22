import { shuffleWith } from "./rhythm";
import { TRACK_IDS, type FlashcardItem, type HomeworkItem, type NewTermItem, type PackTerm, type QuizItem, type TrackId } from "./types";

/** What the checks need: the allowed terms, terms already used, and recent wording to avoid. */
export type ItemContext = { pack: Map<string, PackTerm>; taken: Set<string>; avoid: Set<string> };

/** Finds the first JSON object in the model's reply, even when it is wrapped in markdown. */
export function parseJsonObject(text: string | null): Record<string, unknown> | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(text.slice(start, end + 1)) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Text of an acceptable length, or null. */
export function textOf(v: unknown, min: number, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  return t.length >= min && t.length <= max ? t : null;
}

export const normalizeText = (s: string): string => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Three other term names for multiple-choice answers. Same track first. Null when there are not enough. */
export function distractorsFor(all: PackTerm[], term: PackTerm, rand: () => number): string[] | null {
  const names = new Set([term.term.toLowerCase()]);
  const same = shuffleWith(rand, all.filter((t) => t.track === term.track && t.id !== term.id));
  const other = shuffleWith(rand, all.filter((t) => t.track !== term.track && t.id !== term.id));
  const out: string[] = [];
  for (const t of [...same, ...other]) {
    const key = t.term.toLowerCase();
    if (names.has(key)) continue;
    names.add(key);
    out.push(t.term);
    if (out.length === 3) return out;
  }
  return null;
}

const mentionsTerm = (text: string, term: string) => text.toLowerCase().includes(term.toLowerCase());

/**
 * Model quiz items. The answer is always the term itself, and the choices come from the
 * knowledge base, so a wrong term id or a made-up answer cannot get through.
 * Question ids are by position (q1, q2, ...) so they reveal nothing about the answer.
 */
export function modelQuiz(
  list: unknown,
  ctx: ItemContext,
  want: number,
  distract: (t: PackTerm) => string[] | null,
  rand: () => number,
): QuizItem[] | null {
  if (!Array.isArray(list)) return null;
  const out: QuizItem[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const o = (raw ?? {}) as Record<string, unknown>;
    const id = typeof o["term_id"] === "string" ? (o["term_id"] as string) : "";
    const term = ctx.pack.get(id);
    const prompt = textOf(o["prompt"], 15, 240);
    const explain = textOf(o["explain"] ?? "", 0, 240);
    if (!term || seen.has(id) || ctx.taken.has(id) || !prompt || explain === null) continue;
    if (mentionsTerm(prompt, term.term) || ctx.avoid.has(normalizeText(prompt))) continue;
    const others = distract(term);
    if (!others) continue;
    const choices = shuffleWith(rand, [term.term, ...others]);
    out.push({
      id: `q${out.length + 1}`,
      term_id: id,
      term: term.term,
      track: term.track,
      category: term.category,
      style: "scenario",
      prompt,
      choices,
      answer: choices.indexOf(term.term),
      explain: explain || term.short,
    });
    seen.add(id);
    if (out.length === want) break;
  }
  if (out.length !== want) return null;
  for (const q of out) ctx.taken.add(q.term_id);
  return out;
}

export function modelFlashcards(list: unknown, ctx: ItemContext, want: number): FlashcardItem[] | null {
  if (!Array.isArray(list)) return null;
  const out: FlashcardItem[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const o = (raw ?? {}) as Record<string, unknown>;
    const id = typeof o["term_id"] === "string" ? (o["term_id"] as string) : "";
    const term = ctx.pack.get(id);
    const front = textOf(o["front"], 10, 240);
    if (!term || seen.has(id) || ctx.taken.has(id) || !front) continue;
    if (mentionsTerm(front, term.term) || ctx.avoid.has(normalizeText(front))) continue;
    out.push({ id: `f-${id}`, term_id: id, term: term.term, track: term.track, front, back: term.short, detail: term.detail });
    seen.add(id);
    if (out.length === want) break;
  }
  if (out.length !== want) return null;
  for (const f of out) ctx.taken.add(f.term_id);
  return out;
}

export function modelNewTerms(list: unknown, ctx: ItemContext, want: number): NewTermItem[] | null {
  if (!Array.isArray(list)) return null;
  const out: NewTermItem[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const o = (raw ?? {}) as Record<string, unknown>;
    const id = typeof o["term_id"] === "string" ? (o["term_id"] as string) : "";
    const term = ctx.pack.get(id);
    const why = textOf(o["why"], 10, 240);
    if (!term || seen.has(id) || ctx.taken.has(id) || !why) continue;
    out.push({ term_id: id, term: term.term, track: term.track, short: term.short, detail: term.detail, why });
    seen.add(id);
    if (out.length === want) break;
  }
  if (out.length !== want) return null;
  for (const n of out) ctx.taken.add(n.term_id);
  return out;
}

/** The model's homework. Checked for shape and length, and not repeated from recent titles. */
export function modelHomework(raw: unknown, avoid: Set<string>, fallbackTrack: TrackId): HomeworkItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = textOf(o["title"], 4, 120);
  const instructions = textOf(o["instructions"], 10, 400);
  const modelAnswer = textOf(o["model_answer"], 10, 700);
  const parts = Array.isArray(o["parts"]) ? (o["parts"] as unknown[]).map((p) => textOf(p, 5, 240)) : [];
  if (!title || !instructions || !modelAnswer || parts.length < 2 || parts.length > 4 || parts.some((p) => p === null)) return null;
  if (avoid.has(normalizeText(title))) return null;
  const track = (TRACK_IDS as string[]).includes(o["track"] as string) ? (o["track"] as TrackId) : fallbackTrack;
  return { title, track, instructions, parts: parts as string[], model_answer: modelAnswer };
}
