// Study desk workspaces — localStorage. Create → plan → accept → desk.
import { useCallback, useEffect, useState } from "react";
import { BOOK_TOPICS, BOOKS, bookById } from "@/lib/books";

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
  { id: "beginner", label: "Beginner", hint: "Foundations, definitions, slower pace" },
  { id: "intermediate", label: "Intermediate", hint: "Core theory and worked examples" },
  { id: "advanced", label: "Advanced", hint: "Deeper models and edge cases" },
  { id: "exam-prep", label: "Exam prep", hint: "High-yield review and drills" },
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

function newId() {
  return `ws_\( {Date.now().toString(36)}_ \){Math.random().toString(36).slice(2, 8)}`;
}

function topicLabel(id: string) {
  return BOOK_TOPICS.find((t) => t.id === id)?.label ?? id;
}

export function booksForTopic(topicId: string) {
  return BOOKS.filter((b) => b.topic === topicId);
}

export function generateStudyPlan(input: {
  topicId: string;
  learningMode: LearningMode;
  bookTitle: string;
  goals: string;
}): { plan: StudyPlanPhase[]; checklist: ChecklistItem[] } {
  const seeds =
    TOPIC_SEEDS[input.topicId] ??
    ["Core concepts", "Worked examples", "Practice problems", "Review and summary"];
  const mode = input.learningMode;
  const pace = mode === "beginner" ? 1.1 : mode === "exam-prep" ? 0.75 : mode === "advanced" ? 1.15 : 1;

  const plan: StudyPlanPhase[] = [
    {
      id: "p0",
      title: "Orient",
      detail: `Skim the structure of ${input.bookTitle || "your text"} for ${topicLabel(input.topicId)}.`,
      estimatedSessions: Math.max(1, Math.round(1 * pace)),
    },
    {
      id: "p1",
      title: mode === "beginner" ? "Build vocabulary" : "Establish framework",
      detail:
        mode === "beginner"
          ? "Define every key term in plain language before heavy equations."
          : "Map the main models and assumptions used in this topic.",
      estimatedSessions: Math.max(1, Math.round(2 * pace)),
    },
    {
      id: "p2",
      title: "Worked path",
      detail: `Cover: ${seeds.slice(0, 3).join("; ")}.`,
      estimatedSessions: Math.max(2, Math.round(3 * pace)),
    },
    {
      id: "p3",
      title: mode === "exam-prep" ? "Drill & recall" : "Apply",
      detail:
        mode === "exam-prep"
          ? "Timed problems, closed-book recall, keep an error log."
          : "Solve problems and write short derivations in Notes.",
      estimatedSessions: Math.max(2, Math.round(2 * pace)),
    },
    {
      id: "p4",
      title: "Synthesize",
      detail: input.goals.trim()
        ? `Connect notes to your goals: ${input.goals.trim().slice(0, 160)}`
        : "Write a one-page summary of the topic in your own words.",
      estimatedSessions: 1,
    },
  ];

  const extra =
    mode === "advanced"
      ? ["Primary paper or handbook section", "Derive one result without the book"]
      : mode === "exam-prep"
        ? ["Error-log review", "Mock quiz (self or Stellun AI)"]
        : [];

  const checklist: ChecklistItem[] = [...seeds, ...extra].map((label, i) => ({
id: `c\( {i}- \){label.slice(0, 12).replace(/\s+/g, "")}`,
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

/** Alias used by /ask — do not remove. */
export function consumeAskPrefill(): AskPrefill | null {
  return takeAskPrefill();
}
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
  const bookLine = ws.bookAuthor
    ? `Book: ${ws.bookTitle} by ${ws.bookAuthor}.`
    : `Book: ${ws.bookTitle}.`;
  return [
    `I'm studying in workspace "${ws.title}".`,
    `Topic: ${topicLabel(ws.topicId)}.`,
    bookLine,
    `Mode: ${ws.learningMode}.`,
    ws.goals ? `Goals: ${ws.goals}` : "",
    ws.focus ? `Current focus: ${ws.focus}` : "",
    "Explain clearly for this level; use equations only when they help.",
  ]
    .filter(Boolean)
    .join("\n");
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
    const create = useCallback(
    (input: { title?: string; topicId: string; bookId: string }) => {
      const shelf = bookById(input.bookId);
      if (!shelf) return null;
      return createDraft({
        title: input.title ?? "",
        topicId: input.topicId,
        bookId: input.bookId,
        bookTitle: shelf.title,
        bookAuthor: shelf.authors,
        learningMode: "intermediate",
        goals: "",
      });
    },
    [createDraft],
  );
    (input: CreateWorkspaceInput) => {
      if (readAll().length >= MAX_WORKSPACES) return null;
      const shelf = input.bookId ? bookById(input.bookId) : null;
      const bookTitle = (input.bookTitle || shelf?.title || "").trim();
      const bookAuthor = (input.bookAuthor || shelf?.authors || "").trim();
      const { plan, checklist } = generateStudyPlan({
        topicId: input.topicId,
        learningMode: input.learningMode,
        bookTitle: bookTitle || "Primary text",
        goals: input.goals,
      });
      const now = Date.now();
      const ws: StudyWorkspace = {
        id: newId(),
        title: (input.title.trim() || `${topicLabel(input.topicId)} study`).slice(0, 120),
        topicId: input.topicId,
        bookId: input.bookId || shelf?.id || "",
        bookTitle: bookTitle.slice(0, 160),
        bookAuthor: bookAuthor.slice(0, 120),
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
      persist([ws, ...readAll()].slice(0, MAX_WORKSPACES));
      return ws;
    },
    [persist],
  );

  const acceptPlan = useCallback(
    (id: string) => {
      persist(readAll().map((w) => (w.id === id ? { ...w, planAccepted: true, updatedAt: Date.now() } : w)));
    },
    [persist],
  );

  const update = useCallback(
    (
      id: string,
      patch: Partial<Pick<StudyWorkspace, "title" | "focus" | "notes" | "checklist" | "goals">>,
    ) => {
      const now = Date.now();
      persist(
        readAll().map((w) => {
          if (w.id !== id) return w;
          return {
            ...w,
            title: patch.title !== undefined ? patch.title.slice(0, 120) : w.title,
            focus: patch.focus !== undefined ? patch.focus.slice(0, MAX_FOCUS) : w.focus,
            notes: patch.notes !== undefined ? patch.notes.slice(0, MAX_NOTES) : w.notes,
            goals: patch.goals !== undefined ? patch.goals.slice(0, MAX_GOALS) : w.goals,
            checklist: patch.checklist ?? w.checklist,
            updatedAt: now,
          };
        }),
      );
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => persist(readAll().filter((w) => w.id !== id)),
    [persist],
  );

  return { workspaces, ready, createDraft, acceptPlan, update, remove, max: MAX_WORKSPACES };
      }
