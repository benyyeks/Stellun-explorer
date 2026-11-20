/**
 * Reader highlights.
 *
 * - PDF highlights are stored with the page number and the rectangles they
 *   cover, as fractions of the page, so they stay in place at any zoom.
 * - Text-file highlights (TXT, Markdown) use page 0 and store the sentence.
 *
 * Stored per workspace in this browser (localStorage).
 */

import { useEffect, useState } from "react";

export type HighlightColor = "amber" | "blue" | "green";
export type HighlightRect = { left: number; top: number; width: number; height: number };

export type ReaderHighlight = {
  id: string;
  text: string;
  color: HighlightColor;
  page: number;
  rects: HighlightRect[];
  createdAt: number;
};

export type NewHighlight = Omit<ReaderHighlight, "id" | "createdAt">;

const MAX_HIGHLIGHTS = 400;
const keyFor = (workspaceId: string) => `stellun:reader-highlights:v2:${workspaceId}`;

function readAll(workspaceId: string): ReaderHighlight[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (h): h is ReaderHighlight =>
        typeof h === "object" &&
        h !== null &&
        typeof (h as ReaderHighlight).text === "string" &&
        typeof (h as ReaderHighlight).id === "string" &&
        typeof (h as ReaderHighlight).page === "number",
    );
  } catch {
    return [];
  }
}

function writeAll(workspaceId: string, list: ReaderHighlight[]) {
  try {
    window.localStorage.setItem(keyFor(workspaceId), JSON.stringify(list));
  } catch {
    /* storage full or blocked: keep the in-memory list for this visit */
  }
}

export function useReaderHighlights(workspaceId: string) {
  const [highlights, setHighlights] = useState<ReaderHighlight[]>([]);

  useEffect(() => {
    setHighlights(readAll(workspaceId));
  }, [workspaceId]);

  const addHighlight = (input: NewHighlight) => {
    const text = input.text.replace(/\s+/g, " ").trim().slice(0, 1200);
    if (text.length < 2) return;
    setHighlights((prev) => {
      const next: ReaderHighlight[] = [
        {
          id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
          ...input,
          text,
          createdAt: Date.now(),
        },
        ...prev,
      ].slice(0, MAX_HIGHLIGHTS);
      writeAll(workspaceId, next);
      return next;
    });
  };

  const removeHighlight = (id: string) => {
    setHighlights((prev) => {
      const next = prev.filter((h) => h.id !== id);
      writeAll(workspaceId, next);
      return next;
    });
  };

  return { highlights, addHighlight, removeHighlight };
}
