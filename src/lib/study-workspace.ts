// Personal study workspaces for Study desk (localStorage).
import { useCallback, useEffect, useState } from "react";
import { BOOK_TOPICS, bookById } from "@/lib/books";

export type ChecklistItem = { id: string; label: string; done: boolean };

export type LearningMode = "beginner" | "intermediate" | "advanced" | "exam-prep";

export type StudyPlanPhase = {
  id: string;
  title: string;
  detail: string;
  estimatedSessions: number;
};

export type StudyWorkspace = {
  id: string;
  title: string;
  topicId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  learningMode: LearningMode;
  goals: string;
  focus: string;
  notes: string;
  checklist: ChecklistItem[];
  plan: StudyPlanPhase[];
  planAccepted: boolean;
  createdAt: number;
  updatedAt: number;
};

const KEY = "stellun:study-workspaces-v2";
const MAX_WORKSPACES = 12;
export const MAX_NOTES = 12000;
export const MAX_FOCUS = 280;
export const MAX_GOALS = 500;
export const ASK_PREFILL_KEY = "stellun-ask-prefill";

export type AskPrefill = {
  mode?: "chat" | "quiz" | "explain" | "resources";
  text: string;
};

export const LEARNING_MODES: { id: LearningMode; label: string; hint: string }[] = [
  { id: "beginner", label: "Beginner", hint: "Foundations first, slower pace, more definitions" },
  { id: "intermediate", label: "Intermediate", hint: "Core theory plus worked examples" },
  { id: "advanced", label: "Advanced", hint: "Deeper models, edge cases, research-style depth" },
  { id: "exam-prep", label: "Exam prep", hint: "High-yield review, drills, and recall" },
];

const TOPIC_SEEDS: Record<string, string[]> = {
  "orbital-mechanics": [
    "Two-body problem and constants of motion",
    "Orbit types and classical elements",
    "Coordinate frames and ground tracks",
    "Hohmann and bi-elliptic transfers",
    "Perturbations (J2, drag)",
    "Rendezvous basics",
  ],
  propulsion: [
    "Rocket equation and mass ratio",
    "Nozzle flow and specific impulse",
    "Liquid engine cycles",
    "Solid motors and hybrids",
    "Electric propulsion overview",
  ],
  systems: [
    "Mission design and requirements",
    "Spacecraft subsystems map",
    "Power, thermal, and communications budgets",
    "Risk, margins, and verification",
  ],
  gnc: [
    "Attitude representations",
    "Sensors and actuators",
    "Attitude determination",
    "Control laws and stability",
  ],
  aerodynamics: [
    "Atmosphere models and dynamic pressure",
    "Lift, drag, and stability",
    "Entry, descent, and landing concepts",
  ],
  structures: [
    "Launch loads and load paths",
    "Materials and mechanisms",
    "Space environment effects",
  ],
};

function newId(): string {
  return `ws_\( {Date.now().toString(36)}_ \){Math.random().toString(36).slice(2, 8)}`;
}

function topicLabel(id: string): string {
  return BOOK_TOPICS.find((t) => t.id === id)?.label ?? id;
}

/** Rule-based study plan from mode + topic + goals (no API required). */
export function generateStudyPlan(input: {
  topicId: string;
  learningMode: LearningMode;
  bookTitle: string;
  goals: string;
}): { plan: StudyPlanPhase[]; checklist: ChecklistItem[] } {
  const seeds = TOPIC_SEEDS[input.topicId] ?? [
    "Core concepts",
    "Worked examples",
    "Practice problems",
    "Review and summary",
  ];

  const mode = input.learningMode;
  const pace =
    mode === "beginner" ? 1 : mode === "exam-prep" ? 0.7 : mode === "advanced" ? 1.2 : 1;

  const plan: StudyPlanPhase[] = [
    {
      id: "p0",
      title: "Orient",
      detail: `Skim ${input.bookTitle || "your text"} structure. Note chapter map for ${topicLabel(input.topicId)}.`,
      estimatedSessions: Math.max(1, Math.round(1 * pace)),
    },
    {
      id: "p1",
      title: mode === "beginner" ? "Build vocabulary" : "Establish framework",
      detail:
        mode === "beginner"
          ? "Define every key term you meet. Prefer plain language before equations."
          : "Map the main models and assumptions used in this topic.",
      estimatedSessions: Math.max(1, Math.round(2 * pace)),
    },
    {
      id: "p2",
      title: "Worked path",
      detail: `Work through: ${seeds.slice(0, 3).join("; ")}.`,
      estimatedSessions: Math.max(2, Math.round(3 * pace)),
    },
    {
      id: "p3",
      title: mode === "exam-prep" ? "Drill & recall" : "Apply",
      detail:
        mode === "exam-prep"
          ? "Timed problems, closed-book recall, error log."
          : "Solve end-of-chapter style problems; write short derivations in notes.",
      estimatedSessions: Math.max(2, Math.round(2 * pace)),
    },
    {
      id: "p4",
      title: "Synthesize",
      detail: input.goals.trim()
        ? `Tie notes back to your goals: ${input.goals.trim().slice(0, 160)}`
        : "One-page summary of the topic in your own words.",
      estimatedSessions: 1,
    },
  ];

  const extra =
    mode === "advanced"
      ? ["Read one primary paper or handbook section", "Challenge: derive one result without the book"]
      : mode === "exam-prep"
        ? ["Error log review", "Mock quiz (self or Stellun AI)"]
        : [];

  const checklist: ChecklistItem[] = [...seeds, ...extra].map((label, i) => ({
    id: `c\( {i}- \){label.slice(0, 10).replace(/\s+/g, "")}`,
    label,
    done: false,
  }));

  return { plan, checklist };
}

function readAll(): StudyWorkspace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudyWorkspace[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: StudyWorkspace[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function setAskPrefill(p: AskPrefill) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ASK_PREFILL_KEY, JSON.stringify(p));
}

export function takeAskPrefill(): AskPrefill | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ASK_PREFILL_KEY);
    sessionStorage.removeItem(ASK_PREFILL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AskPrefill;
    if (!parsed?.text?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildStudyAskPrompt(ws: StudyWorkspace): string {
  return [
    `I'm studying in workspace "${ws.title}".`,
    `Topic: ${topicLabel(ws.topicId)}.`,
    `Book: \( {ws.bookTitle} \){ws.bookAuthor ? ` by ${ws.bookAuthor}` : ""}.`,
    `Mode: ${ws.learningMode}.`,
    ws.goals ? `Goals: ${ws.goals}` : "",
    ws.focus ? `Current focus: ${ws.focus}` : "",
    "Explain the current focus clearly for this level, with equations only when needed.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function booksForTopic(topicId: string) {
  return bookById
    ? // prefer shelf books for topic
      (awaitableTopicBooks(topicId) as ReturnType<typeof import("@/lib/books").BOOKS extends infer B ? B : never>)
    : [];
}

// Avoid circular import issues — re-export helper from books pattern used before:
import { BOOKS } from "@/lib/books";
export function booksForTopicSafe(topicId: string) {
  return BOOKS.filter((b) => b.topic === topicId);
}

export type CreateWorkspaceInput = {
  title: string;
  topicId: string;
  bookId?: string;
  bookTitle: string;
  bookAuthor: string;
  learningMode: LearningMode;
  goals: string;
};

export function useStudyWorkspaces() {
  const [workspaces, setWorkspaces] = useState<StudyWorkspace[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setWorkspaces(readAll());
    setReady(true);
  }, []);

  const persist = useCallback((next: StudyWorkspace[]) => {
    setWorkspaces(next);
    writeAll(next);
  }, []);

  const createDraft = useCallback(
    (input: CreateWorkspaceInput) => {
      if (readAll().length >= MAX_WORKSPACES) return null;
      const shelf = input.bookId ? bookById(input.bookId) : null;
      const { plan, checklist } = generateStudyPlan({
        topicId: input.topicId,
        learningMode: input.learningMode,
        bookTitle: input.bookTitle || shelf?.title || "Primary text",
        goals: input.goals,
      });
      const now = Date.now();
      const ws: StudyWorkspace = {
        id: newId(),
        title: input.title.trim().slice(0, 120) || `${topicLabel(input.topicId)} study`,
        topicId: input.topicId,
        bookId: input.bookId || shelf?.id || "",
        bookTitle: (input.bookTitle || shelf?.title || "").slice(0, 160),
        bookAuthor: (input.bookAuthor || "").slice(0, 120),
        learningMode: input.learningMode,
        goals: input.goals.trim().slice(0, MAX_GOALS),
        focus: "",
        notes: "",
        checklist,
        plan,
        planAccepted: false,
        createdAt: now,
        updatedAt: now,
      };
      const next = [ws, ...readAll()].slice(0, MAX_WORKSPACES);
      persist(next);
      return ws;
    },
    [persist],
  );

  const acceptPlan = useCallback(
    (id: string) => {
      const next = readAll().map((w) =>
        w.id === id ? { ...w, planAccepted: true, updatedAt: Date.now() } : w,
      );
      persist(next);
    },
    [persist],
  );

  const update = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<StudyWorkspace, "title" | "focus" | "notes" | "checklist" | "goals" | "plan">
      >,
    ) => {
      const now = Date.now();
      const next = readAll().map((w) => {
        if (w.id !== id) return w;
        return {
          ...w,
          title: patch.title !== undefined ? patch.title.slice(0, 120) : w.title,
          focus: patch.focus !== undefined ? patch.focus.slice(0, MAX_FOCUS) : w.focus,
          notes: patch.notes !== undefined ? patch.notes.slice(0, MAX_NOTES) : w.notes,
          goals: patch.goals !== undefined ? patch.goals.slice(0, MAX_GOALS) : w.goals,
          checklist: patch.checklist ?? w.checklist,
          plan: patch.plan ?? w.plan,
          updatedAt: now,
        };
      });
      persist(next);
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(readAll().filter((w) => w.id !== id));
    },
    [persist],
  );

  return {
    workspaces,
    ready,
    createDraft,
    acceptPlan,
    update,
    remove,
    max: MAX_WORKSPACES,
  };
}
