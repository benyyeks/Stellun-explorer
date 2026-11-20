/**
 * Reader highlights, stored per book in this browser.
 *
 * A highlight runs from a start word to a finish word. PDF highlights keep the
 * rectangles they cover on the page, as fractions of the page, so they stay put
 * at any zoom. Text-file highlights keep the word range [start, finish].
 * Every highlight has a name the student can change.
 */

import { useEffect, useState } from "react";

export type HighlightColor = "amber" | "blue" | "green";
export type HighlightRect = { left: number; top: number; width: number; height: number };

export type ReaderHighlight = {
  id: string;
  name: string;
  text: string;
  color: HighlightColor;
  /** PDF page number, or 0 for text files. */
  page: number;
  rects: HighlightRect[];
  /** Word range for text files: [start, finish], inclusive. */
  range?: [number, number] | undefined;
  createdAt: number;
};

export type NewHighlight = Omit<ReaderHighlight, "id" | "createdAt">;

const MAX_HIGHLIGHTS = 400;
const keyFor = (bookId: string) => `stellun:reader-highlights:v3:${bookId}`;
const legacyKey = (workspaceId: string) => `stellun:reader-highlights:v2:${workspaceId}`;

function readStore(key: string): ReaderHighlight[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (h): h is ReaderHighlight =>
        typeof h === "object" &&
        h !== null &&
        typeof (h as ReaderHighlight).id === "string" &&
        typeof (h as ReaderHighlight).text === "string" &&
        typeof (h as ReaderHighlight).page === "number",
    );
  } catch {
    return [];
  }
}

function writeStore(key: string, list: ReaderHighlight[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* storage full or blocked: the list stays in memory for this visit */
  }
}

/**
 * Highlights made before books were stored on the device were kept per workspace.
 * The first book opened after the update takes them over, once.
 */
export function migrateLegacyHighlights(workspaceId: string, bookId: string) {
  if (typeof window === "undefined") return;
  const legacy = readStore(legacyKey(workspaceId));
  if (legacy.length === 0) return;
  if (readStore(keyFor(bookId)).length === 0) {
    writeStore(
      keyFor(bookId),
      legacy.map((h) => ({ ...h, name: h.name || "Highlight" })),
    );
  }
  try {
    window.localStorage.removeItem(legacyKey(workspaceId));
  } catch {
    /* nothing to clean up */
  }
}

/** Every highlight across the given books, used by the flashcards page. */
export function readHighlightsForBooks(bookIds: string[]): ReaderHighlight[] {
  return bookIds.flatMap((id) => readStore(keyFor(id)));
}

/** Removes a book's highlights, used when the book is removed. */
export function clearHighlightsFor(bookId: string) {
  try {
    window.localStorage.removeItem(keyFor(bookId));
  } catch {
    /* nothing to clean up */
  }
}

export function useReaderHighlights(bookId: string | null) {
  const [highlights, setHighlights] = useState<ReaderHighlight[]>([]);

  useEffect(() => {
    setHighlights(bookId ? readStore(keyFor(bookId)) : []);
  }, [bookId]);

  const save = (next: ReaderHighlight[]) => {
    if (bookId) writeStore(keyFor(bookId), next);
    return next;
  };

  /** Adds a highlight and returns its id. */
  const addHighlight = (input: NewHighlight): string | null => {
    const text = input.text.replace(/\s+/g, " ").trim().slice(0, 1600);
    if (text.length < 1 || !bookId) return null;
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    setHighlights((prev) =>
      save(
        [
          { ...input, id, text, name: input.name.trim().slice(0, 60) || `Highlight ${prev.length + 1}`, createdAt: Date.now() },
          ...prev,
        ].slice(0, MAX_HIGHLIGHTS),
      ),
    );
    return id;
  };

  const renameHighlight = (id: string, name: string) => {
    const clean = name.trim().slice(0, 60);
    if (!clean) return;
    setHighlights((prev) => save(prev.map((h) => (h.id === id ? { ...h, name: clean } : h))));
  };

  const removeHighlight = (id: string) => {
    setHighlights((prev) => save(prev.filter((h) => h.id !== id)));
  };

  return { highlights, addHighlight, renameHighlight, removeHighlight };
}
