import { mixFor, rng, type PlanType } from "./rhythm";
import { buildPrompt } from "./prompt";
import { builtFlashcards, builtHomework, builtNewTerms, builtWordMatch } from "./fallback";
import { distractorsFor, modelFlashcards, modelHomework, modelNewTerms, parseJsonObject, textOf, type ItemContext } from "./validate";
import { buildPack, categoryStats, historyFrom, rhythmHints, weakCategories } from "./shared";
import type { DailyStore, ModelCall } from "./store";
import { COUNTS, TRACK_LABEL, type DailyPlan, type FlashcardItem, type HomeworkItem, type NewTermItem, type PackTerm, type PairItem, type PlanRequest, type TrackId } from "./types";

/**
 * Builds one learner's plan for one day. Pure apart from the store and model calls,
 * which are passed in, so the same code runs in the server route and in the tests.
 *
 * The quiz is not part of the plan: it lives on the Quiz page (see quiz.ts), so the day's
 * quiz set and the plan never disagree. A quiz day only shows a link on Today.
 */

export type ServeResult = { ok: true; plan: DailyPlan; cached: boolean } | { ok: false; code: "content_unavailable" };

const REST_SUMMARY = "Rest day. Nothing new is planned. Look back over a term you missed this week if you like.";
const LABEL: Record<PlanType, string> = {
  homework: "homework",
  quiz: "a quiz",
  flashcards: "flashcards",
  word_match: "word match",
  new_terms: "new terms",
};

export function defaultSummary(types: PlanType[]): string {
  const names = types.map((t) => LABEL[t]);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0] ?? "nothing";
  return `Today: ${list}.`;
}

export async function servePlan(args: {
  userId: string;
  request: PlanRequest;
  store: DailyStore;
  callModel: ModelCall | null;
  now?: Date;
}): Promise<ServeResult> {
  const { userId, request, store, callModel } = args;
  const now = args.now ?? new Date();

  const cached = await store.getPlan(userId, request.date);
  if (cached) return { ok: true, plan: cached, cached: true };

  const terms = await store.loadTerms();
  if (terms.length === 0) return { ok: false, code: "content_unavailable" };
  const byId = new Map(terms.map((t) => [t.id, t] as const));

  const plans = await store.recentPlans(userId, request.date, 30);
  const pools = await store.recentPools(userId, request.date, 30);
  const todayPool = await store.getPool(userId, request.date);
  const { lastUsed, avoid } = historyFrom(plans, todayPool ? [...pools, { date: request.date, questions: todayPool }] : pools);
  const stats = categoryStats(await store.recentAttempts(userId, request.date, 30));

  const mix = mixFor(userId, request.date, rhythmHints(request.context, now));
  const base = { version: 1 as const, date: request.date, mix: mix.types, restDay: mix.restDay };

  if (mix.restDay) {
    const plan: DailyPlan = { ...base, summary: REST_SUMMARY, homework: null, quiz: [], flashcards: [], word_match: [], new_terms: [], sources: {} };
    return { ok: true, plan: (await store.savePlan(userId, request.date, plan)) ?? plan, cached: false };
  }

  const rand = rng(`${userId}|items|${request.date}`);
  const pack = buildPack(terms, request.tracks, request.context.progress.weakTerms, weakCategories(stats), lastUsed, request.date, rand);
  const ctx: ItemContext = { pack: new Map(pack.map((t) => [t.id, t] as const)), taken: new Set(), avoid };
  const distract = (t: PackTerm) => distractorsFor(terms, t, rand);

  let raw: Record<string, unknown> | null = null;
  const askTypes = mix.types.filter((t) => t === "homework" || t === "flashcards" || t === "new_terms");
  if (callModel && askTypes.length > 0) {
    const weakNames = request.context.progress.weakTerms
      .map((id) => byId.get(id)?.term)
      .filter((x): x is string => typeof x === "string")
      .slice(0, 30);
    const prompt = buildPrompt({ date: request.date, types: askTypes, pack, weakNames, context: request.context, avoid: [...avoid], performance: stats.slice(0, 8) });
    let text: string | null = null;
    try {
      text = await callModel(prompt.system, prompt.user);
    } catch {
      text = null;
    }
    raw = parseJsonObject(text);
  }

  const sources: DailyPlan["sources"] = {};
  const out: {
    homework: HomeworkItem | null;
    flashcards: FlashcardItem[];
    word_match: PairItem[];
    new_terms: NewTermItem[];
  } = { homework: null, flashcards: [], word_match: [], new_terms: [] };
  const fallbackTrack: TrackId = request.tracks[0] ?? pack[0]?.track ?? "aerospace";

  for (const type of mix.types) {
    if (type === "homework") {
      const m = raw ? modelHomework(raw["homework"], avoid, fallbackTrack) : null;
      out.homework = m ?? builtHomework(request.context, pack, request.date);
      sources.homework = m ? "model" : "built";
    } else if (type === "flashcards") {
      const m = raw ? modelFlashcards(raw["flashcards"], ctx, COUNTS.flashcards) : null;
      out.flashcards = m ?? builtFlashcards(pack, ctx, COUNTS.flashcards);
      sources.flashcards = m ? "model" : "built";
    } else if (type === "word_match") {
      out.word_match = builtWordMatch(pack, ctx, COUNTS.word_match);
      sources.word_match = "built";
    } else if (type === "new_terms") {
      const m = raw ? modelNewTerms(raw["new_terms"], ctx, COUNTS.new_terms) : null;
      out.new_terms = m ?? builtNewTerms(pack, ctx, COUNTS.new_terms, (t) => TRACK_LABEL[t]);
      sources.new_terms = m ? "model" : "built";
    }
  }

  const summaryText = textOf(raw?.["summary"], 10, 200);
  const plan: DailyPlan = {
    ...base,
    summary: summaryText ?? defaultSummary(mix.types),
    homework: out.homework,
    quiz: [],
    flashcards: out.flashcards,
    word_match: out.word_match,
    new_terms: out.new_terms,
    sources,
  };
  const stored = await store.savePlan(userId, request.date, plan);
  return { ok: true, plan: stored ?? plan, cached: false };
}

