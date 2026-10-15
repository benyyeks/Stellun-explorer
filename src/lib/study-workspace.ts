// Personal study workspaces for The Academy Study desk.
// Stored in the browser so they survive reloads without an account.
// Each workspace is tied to one textbook topic and one primary book from the shelf.
import { useCallback, useEffect, useState } from "react";
import { BOOK_TOPICS, BOOKS, bookById, type Book } from "@/lib/books";

export type ChecklistItem = { id: string; label: string; done: boolean };

export type StudyWorkspace = {
  id: string;
  title: string;
  topicId: string;
  bookId: string;
  focus: string;
  notes: string;
  checklist: ChecklistItem[];
  createdAt: number;
  updatedAt: number;
};

const KEY = "stellun:study-workspaces";
const MAX_WORKSPACES = 12;
export const MAX_NOTES = 8000;
export const MAX_FOCUS = 200;
export const ASK_PREFILL_KEY = "stellun-ask-prefill";

export type AskPrefill = {
  mode?: "chat" | "quiz" | "explain" | "resources";
  text: string;
};

/** Default checklist seeds by textbook topic. Users can edit freely. */
export const TOPIC_CHECKLISTS: Record<string, string[]> = {
  "orbital-mechanics": [
    "Two-body problem and constants of motion",
    "Orbit types and classical elements",
    "Ground tracks and coordinate frames",
    "Hohmann and bi-elliptic transfers",
    "Orbital perturbations (J2, drag)",
    "Relative motion and rendezvous basics",
  ],
  propulsion: [
    "Rocket equation and mass ratio",
    "Nozzle flow and specific impulse",
    "Liquid engine cycles",
    "Solid motors and hybrids",
    "Electric propulsion overview",
  ],
  systems: [
    "Mission design process and requirements",
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
    "Launch loads and structural paths",
    "Materials and mechanisms",
    "Space environment effects",
  ],
};

function topicLabel(id: string): string {
  return BOOK_TOPICS.find((t) => t.id === id)?.label ?? id;
}

function defaultChecklist(topicId: string): ChecklistItem[] {
  const labels = TOPIC_CHECKLISTS[topicId] ?? ["Core concepts", "Worked examples", "Review problems"];
  return labels.map((label, i) => ({
    id: `c${i}-${label.slice(0, 12).replace(/\s+/g, "-").toLowerCase()}`,
    label,
    done: false,
  }));
}

function isWorkspace(v: unknown): v is StudyWorkspace {
  if (typeof v !== "object" || v === null) return false;
  const w = v as StudyWorkspace;
  return (
    typeof w.id === "string" &&
    typeof w.title === "string" &&
    typeof w.topicId === "string" &&
    typeof w.bookId === "string" &&
    typeof w.notes === "string" &&
    Array.isArray(w.checklist)
  );
}

function readAll(): StudyWorkspace[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWorkspace).slice(0, MAX_WORKSPACES);
  } catch {
    return [];
  }
}

function writeAll(next: StudyWorkspace[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next.slice(0, MAX_WORKSPACES)));
  } catch {
    /* storage unavailable */
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function booksForTopic(topicId: string): Book[] {
  return BOOKS.filter((b) => b.topic === topicId);
}

export function buildStudyAskPrompt(ws: StudyWorkspace): string {
  const book = bookById(ws.bookId);
  const topic = topicLabel(ws.topicId);
  const bookLine = book
    ? `${book.title} by ${book.authors}`
    : "a standard aerospace textbook on this topic";
  const focus = ws.focus.trim() || "the current study focus";
  const noteSnippet = ws.notes.trim().slice(0, 400);
  const done = ws.checklist.filter((c) => c.done).map((c) => c.label);
  const open = ws.checklist.filter((c) => !c.done).map((c) => c.label);

  return [
    `I am studying ${topic}.`,
    `Primary reference: ${bookLine}.`,
    `Current focus: ${focus}.`,
    done.length ? `I have covered: ${done.join("; ")}.` : null,
    open.length ? `Still working on: ${open.slice(0, 4).join("; ")}.` : null,
    noteSnippet ? `From my notes: ${noteSnippet}` : null,
    "Explain the focus clearly for an engineering student. Use one concrete example. Label any estimate as an estimate. Do not invent figures that are not standard textbook results.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function setAskPrefill(prefill: AskPrefill) {
  try {
    sessionStorage.setItem(ASK_PREFILL_KEY, JSON.stringify(prefill));
  } catch {
    /* ignore */
  }
}

export function consumeAskPrefill(): AskPrefill | null {
  try {
    const raw = sessionStorage.getItem(ASK_PREFILL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(ASK_PREFILL_KEY);
    const parsed = JSON.parse(raw) as AskPrefill;
    if (typeof parsed?.text !== "string" || !parsed.text.trim()) return null;
    return { ...(parsed.mode ? { mode: parsed.mode } : {}), text: parsed.text.trim() };
  } catch {
    return null;
  }
}

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

  const create = useCallback(
    (input: { title?: string; topicId: string; bookId: string }) => {
      const book = bookById(input.bookId);
      const topic = BOOK_TOPICS.find((t) => t.id === input.topicId);
      if (!book || !topic || book.topic !== input.topicId) return null;
      if (readAll().length >= MAX_WORKSPACES) return null;

      const now = Date.now();
      const ws: StudyWorkspace = {
        id: newId(),
        title: (input.title?.trim() || `${topic.label}: ${book.title}`).slice(0, 120),
        topicId: input.topicId,
        bookId: input.bookId,
        focus: "",
        notes: "",
        checklist: defaultChecklist(input.topicId),
        createdAt: now,
        updatedAt: now,
      };
      const next = [ws, ...readAll()].slice(0, MAX_WORKSPACES);
      persist(next);
      return ws;
    },
    [persist]
  );

  const update = useCallback(
    (id: string, patch: Partial<Pick<StudyWorkspace, "title" | "focus" | "notes" | "checklist">>) => {
      const now = Date.now();
      const next = readAll().map((w) => {
        if (w.id !== id) return w;
        return {
          ...w,
          title: patch.title !== undefined ? patch.title.slice(0, 120) : w.title,
          focus: patch.focus !== undefined ? patch.focus.slice(0, MAX_FOCUS) : w.focus,
          notes: patch.notes !== undefined ? patch.notes.slice(0, MAX_NOTES) : w.notes,
          checklist: patch.checklist ?? w.checklist,
          updatedAt: now,
        };
      });
      persist(next);
    },
    [persist]
  );

  const remove = useCallback(
    (id: string) => {
      persist(readAll().filter((w) => w.id !== id));
    },
    [persist]
  );

  return {
    workspaces,
    ready,
    create,
    update,
    remove,
    max: MAX_WORKSPACES,
  };
}
