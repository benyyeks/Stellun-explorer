import type { PlanType } from "./rhythm";

export type TrackId = "aviation" | "astronomy" | "aerospace" | "stem";
export const TRACK_IDS: TrackId[] = ["aviation", "astronomy", "aerospace", "stem"];
export const TRACK_LABEL: Record<TrackId, string> = {
  aviation: "Aviation",
  astronomy: "Astronomy",
  aerospace: "Aerospace",
  stem: "STEM",
};

/** A term from the knowledge base that the plan may use. */
export type PackTerm = { id: string; term: string; track: TrackId; category: string; short: string; detail: string };

/** "scenario": the model wrote the question. "definition": built from the knowledge base. */
export type QuestionStyle = "scenario" | "definition";

/** A quiz question as stored. It holds the answer, so it never goes to the browser. */
export type QuizItem = {
  id: string;
  term_id: string;
  term: string;
  track: TrackId;
  category: string;
  style: QuestionStyle;
  prompt: string;
  choices: string[];
  answer: number;
  explain: string;
};

/** A quiz question as the browser sees it: no answer, no term id. */
export type PublicQuestion = {
  id: string;
  track: TrackId;
  category: string;
  style: QuestionStyle;
  prompt: string;
  choices: string[];
};

export type FlashcardItem = { id: string; term_id: string; term: string; track: TrackId; front: string; back: string; detail: string };
export type PairItem = { term_id: string; term: string; track: TrackId; short: string };
export type NewTermItem = { term_id: string; term: string; track: TrackId; short: string; detail: string; why: string };
export type HomeworkItem = { title: string; track: TrackId; instructions: string; parts: string[]; model_answer: string };

/** What the browser tells the server about the learner. Nothing here is a secret, and long text is cut short. */
export type PlanContext = {
  workspaces: { title: string; topic: string; focus: string; goals: string; openItems: string[]; doneCount: number }[];
  books: { title: string; workspace: string }[];
  homework: { title: string; track: TrackId; status: string; dueAt: string | null; score: number | null; maxPoints: number }[];
  progress: { weakTerms: string[]; seenTerms: string[] };
  profile: { tracks: TrackId[]; jobs: string[] };
};

export type PlanRequest = { date: string; tracks: TrackId[]; context: PlanContext };

export type DailyPlan = {
  version: 1;
  date: string;
  mix: PlanType[];
  restDay: boolean;
  summary: string;
  homework: HomeworkItem | null;
  /** Quiz questions are on the Quiz page now. Kept empty here. */
  quiz: QuizItem[];
  flashcards: FlashcardItem[];
  word_match: PairItem[];
  new_terms: NewTermItem[];
  /** "model": the AI wrote it. "built": our code built it from the knowledge base. */
  sources: Partial<Record<PlanType, "model" | "built">>;
};

/** What the explanation step needs about one answered question. */
export type ExplainItem = {
  id: string;
  prompt: string;
  term: string;
  correctShort: string;
  correctDetail: string;
  chosen: string | null;
  chosenShort: string;
  correct: boolean;
};

export const COUNTS = { quiz: 5, flashcards: 5, word_match: 6, new_terms: 3 } as const;
