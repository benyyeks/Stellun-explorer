/**
 * Flashcards and Focus tasks, built from each workspace.
 *
 * Cards come from the workspace itself:
 *   - each study-plan section becomes a concept card
 *   - each checklist item becomes a card to explain in your own words
 *   - each highlight becomes a passage card
 * Every card is matched to the picture whose tags fit its text best.
 */

import type { StudyWorkspace } from "@/lib/study-workspace";
import { matchArt } from "@/lib/academy-art";

export type FlashCard = {
  id: string;
  topic: string;
  front: string;
  back: string;
  kind: "concept" | "checklist" | "passage";
  /** Slug of the picture shown on the card (see academy-art.ts). */
  art: string;
};

export type FocusTask = {
  id: string;
  type: "Checklist" | "Flashcards" | "Quiz";
  label: string;
  detail: string;
  workspaceId?: string;
};

const FALLBACK_ART: Record<FlashCard["kind"], string> = {
  concept: "book",
  checklist: "checklist",
  passage: "lightbulb",
};

export function buildDeck(
  ws: StudyWorkspace,
  highlights: { id: string; text: string; name?: string }[],
): FlashCard[] {
  const cards: FlashCard[] = [];
  for (const p of ws.plan) {
    cards.push({
      id: `plan-${p.id}`,
      topic: "Study plan",
      front: p.title,
      back: p.detail || "Read this section, then explain it in your own words.",
      kind: "concept",
      art: matchArt(`${p.title} ${p.detail}`, FALLBACK_ART.concept),
    });
  }
  for (const c of ws.checklist) {
    cards.push({
      id: `chk-${c.id}`,
      topic: "Checklist",
      front: c.label,
      back: "Explain this in your own words, then tick it off in the checklist.",
      kind: "checklist",
      art: matchArt(c.label, FALLBACK_ART.checklist),
    });
  }
  for (const h of highlights.slice(0, 40)) {
    cards.push({
      id: `hl-${h.id}`,
      topic: "Highlight",
      front: h.name?.trim() || "What does this passage say?",
      back: h.text,
      kind: "passage",
      art: matchArt(h.text, FALLBACK_ART.passage),
    });
  }
  return cards;
}

/** Focus list for the dashboard: checklist items, deck reviews, and a quiz. */
export function buildFocusTasks(workspaces: StudyWorkspace[], limit = 5): FocusTask[] {
  const tasks: FocusTask[] = [];
  const byRecent = [...workspaces].sort((a, b) => b.updatedAt - a.updatedAt);

  for (const w of byRecent) {
    for (const c of w.checklist) {
      if (c.done || tasks.length >= limit) continue;
      tasks.push({
        id: `chk-${w.id}-${c.id}`,
        type: "Checklist",
        label: c.label,
        detail: w.title || "Workspace",
        workspaceId: w.id,
      });
    }
  }

  for (const w of byRecent.slice(0, 2)) {
    const count = w.plan.length + w.checklist.length;
    if (count === 0 || tasks.length >= limit) continue;
    tasks.push({
      id: `deck-${w.id}`,
      type: "Flashcards",
      label: `Review ${w.title || "your"} cards`,
      detail: `${count} card${count === 1 ? "" : "s"} from your plan`,
      workspaceId: w.id,
    });
  }

  if (tasks.length < limit) {
    tasks.push({
      id: "quiz-daily",
      type: "Quiz",
      label: "Three quick checks",
      detail: "Aerospace, astronomy, and aviation",
    });
  }
  return tasks.slice(0, limit);
}

const knownKey = (workspaceId: string) => `stellun:flashcards-known:v1:${workspaceId}`;

export function readKnownCards(workspaceId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(knownKey(workspaceId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function writeKnownCards(workspaceId: string, ids: string[]) {
  try {
    window.localStorage.setItem(knownKey(workspaceId), JSON.stringify(ids));
  } catch {
    /* storage full or blocked */
  }
}
