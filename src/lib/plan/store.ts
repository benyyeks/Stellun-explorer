import type { DailyPlan, PackTerm, QuestionStyle, QuizItem, TrackId } from "./types";

/** One answered question, as stored with an attempt. The server writes these; the browser never does. */
export type AttemptResult = {
  id: string;
  term_id: string;
  term: string;
  track: TrackId;
  category: string;
  style: QuestionStyle;
  prompt: string;
  chosen: string | null;
  correct: boolean;
};

export type Explanation = { id: string; text: string; source: "model" | "built" };

export type AttemptRow = {
  id: string;
  date: string;
  score: number;
  total: number;
  results: AttemptResult[];
  explanations: Explanation[] | null;
};

export type CategoryStat = { category: string; right: number; wrong: number };

export type ModelCall = (system: string, user: string) => Promise<string | null>;

/**
 * Everything the plan and quiz logic reads or writes. The server route supplies a
 * Supabase version; the tests supply an in-memory one.
 */
export type DailyStore = {
  getPlan(userId: string, date: string): Promise<DailyPlan | null>;
  recentPlans(userId: string, date: string, days: number): Promise<DailyPlan[]>;
  savePlan(userId: string, date: string, plan: DailyPlan): Promise<DailyPlan | null>;
  loadTerms(): Promise<PackTerm[]>;
  getPool(userId: string, date: string): Promise<QuizItem[] | null>;
  recentPools(userId: string, date: string, days: number): Promise<{ date: string; questions: QuizItem[] }[]>;
  savePool(userId: string, date: string, questions: QuizItem[]): Promise<QuizItem[] | null>;
  saveAttempt(userId: string, row: { date: string; score: number; total: number; results: AttemptResult[] }): Promise<AttemptRow | null>;
  getAttempt(userId: string, attemptId: string): Promise<AttemptRow | null>;
  saveExplanations(userId: string, attemptId: string, items: Explanation[]): Promise<void>;
  recentAttempts(userId: string, date: string, days: number): Promise<{ date: string; results: AttemptResult[] }[]>;
};
