import { mixOn, nextQuizDate, historyFrom, categoryStats, buildPack, weakCategories } from "./shared";
import { rng } from "./rhythm";
import { buildExplainPrompt, buildPrompt } from "./prompt";
import { builtExplanation, builtQuiz } from "./fallback";
import { distractorsFor, modelQuiz, parseJsonObject, textOf, type ItemContext } from "./validate";
import type { AttemptResult, AttemptRow, DailyStore, Explanation, ModelCall } from "./store";
import { COUNTS, type ExplainItem, type PackTerm, type PlanRequest, type PublicQuestion, type QuizItem } from "./types";

/**
 * The daily quiz. One set of questions per learner per day, on the days the rhythm gives a quiz.
 * The learner may take the set as many times as they like that day: each new set uses the same
 * questions, with the choices in a new order. The next day gives a new set, with no repeats.
 * Answers are checked on the server, which is the only place the answer key is read.
 */

export const DAILY_QUIZ_SIZE = COUNTS.quiz;

export type PoolOutcome =
  | { status: "ok"; date: string; questions: QuizItem[] }
  | { status: "no_quiz"; nextDate: string | null }
  | { status: "content_unavailable" };

export function toPublic(q: QuizItem): PublicQuestion {
  return { id: q.id, track: q.track, category: q.category, style: q.style, prompt: q.prompt, choices: q.choices };
}

/** Today's quiz set. Created once for the day, then returned for every attempt that day. */
export async function servePool(args: { userId: string; request: PlanRequest; store: DailyStore; callModel: ModelCall | null; now?: Date }): Promise<PoolOutcome> {
  const { userId, request, store, callModel } = args;
  const now = args.now ?? new Date();
  const { date, context } = request;

  if (!mixOn(userId, date, context, now).types.includes("quiz")) {
    return { status: "no_quiz", nextDate: nextQuizDate(userId, date, context, now) };
  }

  const existing = await store.getPool(userId, date);
  if (existing && existing.length > 0) return { status: "ok", date, questions: existing };

  const terms = await store.loadTerms();
  if (terms.length === 0) return { status: "content_unavailable" };

  const plans = await store.recentPlans(userId, date, 30);
  const pools = await store.recentPools(userId, date, 30);
  const todayPlan = await store.getPlan(userId, date);
  const { lastUsed, avoid } = historyFrom(todayPlan ? [...plans, todayPlan] : plans, pools);
  const stats = categoryStats(await store.recentAttempts(userId, date, 30));

  const rand = rng(`${userId}|quiz|${date}`);
  const pack = buildPack(terms, request.tracks, context.progress.weakTerms, weakCategories(stats), lastUsed, date, rand);
  const ctx: ItemContext = { pack: new Map(pack.map((t) => [t.id, t] as const)), taken: new Set(), avoid };
  const distract = (t: PackTerm) => distractorsFor(terms, t, rand);

  let raw: Record<string, unknown> | null = null;
  if (callModel) {
    const prompt = buildPrompt({ date, types: ["quiz"], pack, weakNames: [], context, avoid: [...avoid], quizCount: DAILY_QUIZ_SIZE, performance: stats.slice(0, 8) });
    let text: string | null = null;
    try {
      text = await callModel(prompt.system, prompt.user);
    } catch {
      text = null;
    }
    raw = parseJsonObject(text);
  }

  const modelled = raw ? modelQuiz(raw["quiz"], ctx, DAILY_QUIZ_SIZE, distract, rand) : null;
  const questions = modelled ?? builtQuiz(pack, ctx, DAILY_QUIZ_SIZE, distract, rand);
  if (questions.length < 3) return { status: "content_unavailable" };

  const stored = await store.savePool(userId, date, questions);
  return { status: "ok", date, questions: stored ?? questions };
}

export type Answer = { id: string; chosen: string | null };
export type SubmitOutcome =
  | { status: "ok"; attempt: AttemptRow }
  | { status: "no_pool" }
  | { status: "storage_unavailable" };

/** Grades one attempt at today's set. The answer key stays on the server. */
export async function submitSet(args: { userId: string; date: string; answers: Answer[]; store: DailyStore }): Promise<SubmitOutcome> {
  const { userId, date, answers, store } = args;
  const pool = await store.getPool(userId, date);
  if (!pool || pool.length === 0) return { status: "no_pool" };

  const chosenById = new Map(answers.map((a) => [a.id, a.chosen] as const));
  const results: AttemptResult[] = pool.map((q) => {
    const chosen = chosenById.get(q.id) ?? null;
    return {
      id: q.id,
      term_id: q.term_id,
      term: q.term,
      track: q.track,
      category: q.category,
      style: q.style,
      prompt: q.prompt,
      chosen,
      correct: chosen !== null && chosen === q.term,
    };
  });
  const score = results.filter((r) => r.correct).length;
  const attempt = await store.saveAttempt(userId, { date, score, total: pool.length, results });
  return attempt ? { status: "ok", attempt } : { status: "storage_unavailable" };
}

export type ExplainOutcome =
  | { status: "ok"; explanations: Explanation[]; cached: boolean }
  | { status: "not_found" };

/** Explanations for one attempt: from the model when it answers well, otherwise from the knowledge base. Stored, so a second view is free. */
export async function explainAttempt(args: { userId: string; attemptId: string; store: DailyStore; callModel: ModelCall | null }): Promise<ExplainOutcome> {
  const { userId, attemptId, store, callModel } = args;
  const attempt = await store.getAttempt(userId, attemptId);
  if (!attempt) return { status: "not_found" };
  if (attempt.explanations && attempt.explanations.length === attempt.results.length) {
    return { status: "ok", explanations: attempt.explanations, cached: true };
  }

  const terms = await store.loadTerms();
  const byId = new Map(terms.map((t) => [t.id, t] as const));
  const byName = new Map(terms.map((t) => [t.term.toLowerCase(), t] as const));
  const items: ExplainItem[] = attempt.results.map((r) => {
    const t = byId.get(r.term_id);
    const c = r.chosen ? byName.get(r.chosen.toLowerCase()) : undefined;
    return {
      id: r.id,
      prompt: r.prompt,
      term: r.term,
      correctShort: t?.short ?? "",
      correctDetail: t?.detail ?? "",
      chosen: r.chosen,
      chosenShort: c?.short ?? "",
      correct: r.correct,
    };
  });

  const modelTexts = new Map<string, string>();
  if (callModel) {
    const prompt = buildExplainPrompt(items);
    let text: string | null = null;
    try {
      text = await callModel(prompt.system, prompt.user);
    } catch {
      text = null;
    }
    const raw = parseJsonObject(text);
    const list = raw ? raw["explanations"] : null;
    if (Array.isArray(list)) {
      for (const e of list) {
        const o = (e ?? {}) as Record<string, unknown>;
        const id = typeof o["id"] === "string" ? (o["id"] as string) : "";
        const body = textOf(o["text"], 20, 600);
        if (id && body) modelTexts.set(id, body);
      }
    }
  }

  const explanations: Explanation[] = items.map((it) =>
    modelTexts.has(it.id)
      ? { id: it.id, text: modelTexts.get(it.id)!, source: "model" }
      : { id: it.id, text: builtExplanation(it), source: "built" },
  );
  await store.saveExplanations(userId, attemptId, explanations);
  return { status: "ok", explanations, cached: false };
}
