// Study desk workspaces — localStorage. Create → plan → accept → desk.
// Checklist items always carry unique ids (migrated on read) so one click
// cannot flip every row.

import { useCallback, useEffect, useState } from "react";
import { BOOK_TOPICS, BOOKS } from "@/lib/books";

export type LearningMode = "beginner" | "intermediate" | "advanced" | "exam-prep";

export type ChecklistItem = { id: string; label: string; done: boolean };

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
  bookTitle: string;
  bookAuthor: string;
  learningMode: LearningMode;
  goals: string;
  plan: StudyPlanPhase[];
  checklist: ChecklistItem[];
  planAccepted: boolean;
  notes: string;
  focus: string;
  createdAt: number;
  updatedAt: number;
};

export const MAX_WORKSPACES = 12;
export const MAX_FOCUS = 240;
export const MAX_NOTES = 8000;
const KEY = "stellun:study-workspaces:v1";

/** One-shot handoff into /ask (or the Ask widget). Written by glossary, satellite fallbacks, etc. */
export type AskPrefill = {
  text: string;
  mode?: string;
  noradId?: string;
  autoSend?: boolean;
};

const ASK_PREFILL_KEY = "stellun:ask-prefill:v1";

export function setAskPrefill(prefill: AskPrefill): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(ASK_PREFILL_KEY, JSON.stringify(prefill));
  } catch {
    /* quota / private mode */
  }
}

/** Read and clear the prefill so it only applies once. */
export function consumeAskPrefill(): AskPrefill | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ASK_PREFILL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(ASK_PREFILL_KEY);
    const parsed = JSON.parse(raw) as AskPrefill;
    if (!parsed || typeof parsed.text !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}



export const LEARNING_MODES: { id: LearningMode; label: string; hint: string }[] = [
  { id: "beginner", label: "Beginner", hint: "Foundations, definitions, slower pace" },
  { id: "intermediate", label: "Intermediate", hint: "Core theory and worked examples" },
  { id: "advanced", label: "Advanced", hint: "Deeper models and edge cases" },
  { id: "exam-prep", label: "Exam prep", hint: "High-yield review and drills" },
];

const TOPIC_SEEDS: Record<string, string[]> = {
  "orbital-mechanics": [
    "Two-body motion and orbital elements",
    "Vis-viva and energy",
    "Hohmann transfer setup",
    "Plane change cost intuition",
  ],
  astronomy: [
    "Celestial sphere and coordinates",
    "Magnitude and brightness",
    "Stellar types at a glance",
    "Night-sky observation plan",
  ],
  aerospace: [
    "Forces on a vehicle in flight",
    "Structures vs propulsion trade",
    "Mission phases",
    "Systems engineering sketch",
  ],
  aviation: [
    "Primary flight instruments",
    "Atmosphere and performance",
    "Basic navigation aids",
    "Human factors checklist",
  ],
};

function topicLabel(id: string): string {
  if (id.startsWith("custom:")) {
    return id.slice("custom:".length).trim() || "Custom topic";
  }
  return BOOK_TOPICS.find((t) => t.id === id)?.label ?? id;
}

export function booksForTopic(topicId: string) {
  return BOOKS.filter((b) => b.topic === topicId);
}

function hashLabel(label: string): string {
  let h = 0;
  for (let k = 0; k < label.length; k++) h = (h * 31 + label.charCodeAt(k)) >>> 0;
  return (h >>> 0).toString(36);
}

/** Guarantee unique ids even for legacy localStorage rows. */
export function ensureUniqueChecklist(items: ChecklistItem[] | undefined | null): ChecklistItem[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.map((raw, i) => {
    const label = typeof raw?.label === "string" ? raw.label : `Item ${i + 1}`;
    let id =
      typeof raw?.id === "string" && raw.id.trim().length > 0
        ? raw.id.trim()
        : `c${i}_${hashLabel(label)}`;
    // If duplicate, force uniqueness with index + random salt
    if (seen.has(id)) {
      id = `c${i}_${hashLabel(label)}_${i}_${Math.random().toString(36).slice(2, 7)}`;
    }
    seen.add(id);
    return {
      id,
      label,
      done: Boolean(raw?.done),
    };
  });
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
  const pace =
    mode === "beginner" ? 1.1 : mode === "exam-prep" ? 0.75 : mode === "advanced" ? 1.15 : 1;

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

  const checklist = ensureUniqueChecklist(
    [...seeds, ...extra].map((label, i) => ({
      id: `c${i}_${hashLabel(label)}`,
      label,
      done: false,
    })),
  );

  return { plan, checklist };
}

function newId(): string {
  return `ws_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeWorkspace(raw: StudyWorkspace): StudyWorkspace {
  return {
    ...raw,
    checklist: ensureUniqueChecklist(raw.checklist),
    plan: Array.isArray(raw.plan) ? raw.plan : [],
    notes: typeof raw.notes === "string" ? raw.notes : "",
    focus: typeof raw.focus === "string" ? raw.focus : "",
    goals: typeof raw.goals === "string" ? raw.goals : "",
    planAccepted: Boolean(raw.planAccepted),
  };
}

function readAll(): StudyWorkspace[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudyWorkspace[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeWorkspace);
  } catch {
    return [];
  }
}

function writeAll(list: StudyWorkspace[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function buildStudyAskPrompt(workspace: StudyWorkspace | null, question: string): string {
  const q = question.trim();
  if (!workspace) return q;
  return [
    `Workspace: ${workspace.title}`,
    `Topic: ${topicLabel(workspace.topicId)}`,
    workspace.bookTitle ? `Book: ${workspace.bookTitle}${workspace.bookAuthor ? ` — ${workspace.bookAuthor}` : ""}` : "",
    workspace.focus ? `Focus: ${workspace.focus}` : "",
    q,
  ]
    .filter(Boolean)
    .join("\n");
}

export function useStudyWorkspaces() {
  const [workspaces, setWorkspaces] = useState<StudyWorkspace[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const list = readAll();
    // Persist migration so duplicate ids are fixed on disk once
    writeAll(list);
    setWorkspaces(list);
    setReady(true);
  }, []);

  const create = useCallback(
    (input: {
      title: string;
      topicId: string;
      bookTitle: string;
      bookAuthor: string;
      learningMode: LearningMode;
      goals: string;
    }) => {
      if (workspaces.length >= MAX_WORKSPACES) return null;
      const { plan, checklist } = generateStudyPlan({
        topicId: input.topicId,
        learningMode: input.learningMode,
        bookTitle: input.bookTitle,
        goals: input.goals,
      });
      const now = Date.now();
      const ws: StudyWorkspace = {
        id: newId(),
        title: input.title.trim() || "Untitled workspace",
        topicId: input.topicId,
        bookTitle: input.bookTitle,
        bookAuthor: input.bookAuthor,
        learningMode: input.learningMode,
        goals: input.goals,
        plan,
        checklist,
        planAccepted: false,
        notes: "",
        focus: "",
        createdAt: now,
        updatedAt: now,
      };
      setWorkspaces((prev) => {
        const next = [ws, ...prev].slice(0, MAX_WORKSPACES);
        writeAll(next);
        return next;
      });
      return ws;
    },
    [workspaces.length],
  );

  const acceptPlan = useCallback((id: string) => {
    setWorkspaces((prev) => {
      const next = prev.map((w) =>
        w.id === id ? { ...w, planAccepted: true, updatedAt: Date.now() } : w,
      );
      writeAll(next);
      return next;
    });
  }, []);

  /**
   * Toggle exactly one checklist row.
   * Prefer match by id; if legacy data still collides, fall back to index.
   */
  const toggleChecklistItem = useCallback((workspaceId: string, itemId: string, indexHint?: number) => {
    setWorkspaces((prev) => {
      const next = prev.map((w) => {
        if (w.id !== workspaceId) return w;
        const list = ensureUniqueChecklist(w.checklist);
        let flipped = false;
        const checklist = list.map((item, idx) => {
          const byId = item.id === itemId;
          const byIndex =
            !byId &&
            typeof indexHint === "number" &&
            idx === indexHint &&
            list.filter((x) => x.id === itemId).length !== 1;
          // Primary path: unique id match, only once
          if (byId && !flipped) {
            flipped = true;
            return { ...item, done: !item.done };
          }
          return item;
        });
        // If id was missing/wrong, toggle by index only
        if (!flipped && typeof indexHint === "number" && checklist[indexHint]) {
          checklist[indexHint] = {
            ...checklist[indexHint],
            done: !checklist[indexHint].done,
          };
        }
        return { ...w, checklist, updatedAt: Date.now() };
      });
      writeAll(next);
      return next;
    });
  }, []);

  const update = useCallback(
    (
      id: string,
      patch: Partial<Pick<StudyWorkspace, "title" | "focus" | "notes" | "checklist" | "goals">>,
    ) => {
      setWorkspaces((prev) => {
        const next = prev.map((w) => {
          if (w.id !== id) return w;
          return {
            ...w,
            ...patch,
            checklist:
              patch.checklist !== undefined
                ? ensureUniqueChecklist(patch.checklist)
                : w.checklist,
            updatedAt: Date.now(),
          };
        });
        writeAll(next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setWorkspaces((prev) => {
      const next = prev.filter((w) => w.id !== id);
      writeAll(next);
      return next;
    });
  }, []);

  return {
    ready,
    workspaces,
    create,
    acceptPlan,
    toggleChecklistItem,
    update,
    remove,
    max: MAX_WORKSPACES,
  };
}
