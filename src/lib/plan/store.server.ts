// Server-only: the Supabase version of the store. Errors are treated as "nothing stored",
// so the plan and quiz still work before the SQL has been run.
import { CATEGORY_TRACK, GLOSSARY } from "@/lib/glossary";
import { TRACK_IDS, type DailyPlan, type PackTerm, type QuizItem, type TrackId } from "./types";
import type { AttemptResult, AttemptRow, DailyStore, Explanation } from "./store";
import { shiftDate } from "./shared";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** The terms built into the app. Same ids as the Supabase table, so plans stay consistent. */
export function bundledTerms(): PackTerm[] {
  return GLOSSARY.map((e) => ({
    id: slug(e.term),
    term: e.term,
    track: CATEGORY_TRACK[e.category],
    category: String(e.category),
    short: e.short,
    detail: e.detail,
  }));
}

type Db = { from: (table: string) => any };

function toAttempt(row: Record<string, unknown>): AttemptRow {
  return {
    id: String(row["id"]),
    date: String(row["quiz_date"]),
    score: Number(row["score"]),
    total: Number(row["total"]),
    results: (row["results"] ?? []) as AttemptResult[],
    explanations: (row["explanations"] as Explanation[] | null) ?? null,
  };
}

export async function makeStore(): Promise<DailyStore> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Db;
  return {
    getPlan: async (userId, date) => {
      const { data, error } = await db.from("academy_daily_plans").select("plan").eq("user_id", userId).eq("plan_date", date).maybeSingle();
      return error ? null : ((data?.plan as DailyPlan | undefined) ?? null);
    },
    recentPlans: async (userId, date, days) => {
      const { data, error } = await db
        .from("academy_daily_plans")
        .select("plan_date, plan")
        .eq("user_id", userId)
        .gte("plan_date", shiftDate(date, -days))
        .lt("plan_date", date)
        .order("plan_date", { ascending: false })
        .limit(days);
      if (error || !Array.isArray(data)) return [];
      return data.map((row: { plan_date: string; plan: DailyPlan }) => ({ ...row.plan, date: String(row.plan_date) }));
    },
    savePlan: async (userId, date, plan) => {
      try {
        await db.from("academy_daily_plans").upsert(
          { user_id: userId, plan_date: date, mix: plan.mix, rest_day: plan.restDay, source: plan.restDay ? "rest" : "model", plan },
          { onConflict: "user_id,plan_date", ignoreDuplicates: true },
        );
        const { data } = await db.from("academy_daily_plans").select("plan").eq("user_id", userId).eq("plan_date", date).maybeSingle();
        return (data?.plan as DailyPlan | undefined) ?? plan;
      } catch {
        return null;
      }
    },
    loadTerms: async () => {
      const { data, error } = await db.from("academy_terms").select("id, term, track, category, short, detail").limit(1000);
      if (error || !Array.isArray(data) || data.length === 0) return bundledTerms();
      const rows: PackTerm[] = [];
      for (const r of data as { id: string; term: string; track: string; category: string; short: string; detail: string }[]) {
        if ((TRACK_IDS as string[]).includes(r.track)) {
          rows.push({ id: r.id, term: r.term, track: r.track as TrackId, category: r.category, short: r.short, detail: r.detail });
        }
      }
      return rows.length ? rows : bundledTerms();
    },
    getPool: async (userId, date) => {
      const { data, error } = await db.from("academy_daily_quizzes").select("questions").eq("user_id", userId).eq("quiz_date", date).maybeSingle();
      return error ? null : ((data?.questions as QuizItem[] | undefined) ?? null);
    },
    recentPools: async (userId, date, days) => {
      const { data, error } = await db
        .from("academy_daily_quizzes")
        .select("quiz_date, questions")
        .eq("user_id", userId)
        .gte("quiz_date", shiftDate(date, -days))
        .lt("quiz_date", date)
        .order("quiz_date", { ascending: false })
        .limit(days);
      if (error || !Array.isArray(data)) return [];
      return data.map((r: { quiz_date: string; questions: QuizItem[] }) => ({ date: String(r.quiz_date), questions: r.questions }));
    },
    savePool: async (userId, date, questions) => {
      try {
        await db.from("academy_daily_quizzes").upsert({ user_id: userId, quiz_date: date, questions }, { onConflict: "user_id,quiz_date", ignoreDuplicates: true });
        const { data } = await db.from("academy_daily_quizzes").select("questions").eq("user_id", userId).eq("quiz_date", date).maybeSingle();
        return (data?.questions as QuizItem[] | undefined) ?? null;
      } catch {
        return null;
      }
    },
    saveAttempt: async (userId, row) => {
      const { data, error } = await db
        .from("academy_quiz_attempts")
        .insert({ user_id: userId, quiz_date: row.date, score: row.score, total: row.total, results: row.results })
        .select("id, quiz_date, score, total, results, explanations")
        .single();
      if (error || !data) return null;
      return toAttempt(data as Record<string, unknown>);
    },
    getAttempt: async (userId, attemptId) => {
      const { data, error } = await db
        .from("academy_quiz_attempts")
        .select("id, quiz_date, score, total, results, explanations")
        .eq("id", attemptId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !data) return null;
      return toAttempt(data as Record<string, unknown>);
    },
    saveExplanations: async (userId, attemptId, items) => {
      await db.from("academy_quiz_attempts").update({ explanations: items }).eq("id", attemptId).eq("user_id", userId);
    },
    recentAttempts: async (userId, date, days) => {
      const { data, error } = await db
        .from("academy_quiz_attempts")
        .select("quiz_date, results")
        .eq("user_id", userId)
        .gte("quiz_date", shiftDate(date, -days))
        .lt("quiz_date", date)
        .limit(200);
      if (error || !Array.isArray(data)) return [];
      return data.map((r: { quiz_date: string; results: AttemptResult[] }) => ({ date: String(r.quiz_date), results: r.results ?? [] }));
    },
  };
}

/** Used only if the database client cannot be loaded: plans and quizzes are built, but nothing is stored. */
export function offlineStore(): DailyStore {
  return {
    getPlan: async () => null,
    recentPlans: async () => [],
    savePlan: async (_u, _d, plan) => plan,
    loadTerms: async () => bundledTerms(),
    getPool: async () => null,
    recentPools: async () => [],
    savePool: async (_u, _d, questions) => questions,
    saveAttempt: async () => null,
    getAttempt: async () => null,
    saveExplanations: async () => {},
    recentAttempts: async () => [],
  };
}

