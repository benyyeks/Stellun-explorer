/**
 * Highlights in the workspace reader.
 * Each highlight is a passage the student selected, with a colour.
 * Stored per workspace in this browser (localStorage).
 */

import { useEffect, useState } from "react";

export type HighlightColor = "amber" | "blue" | "green";

export type ReaderHighlight = {
  id: string;
  text: string;
  color: HighlightColor;
  createdAt: number;
};

const MAX_HIGHLIGHTS = 300;

const keyFor = (workspaceId: string) => `stellun:reader-highlights:v1:${workspaceId}`;

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
        typeof (h as ReaderHighlight).id === "string",
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

  const addHighlight = (text: string, color: HighlightColor) => {
    const clean = text.replace(/\s+/g, " ").trim().slice(0, 1200);
    if (clean.length < 2) return;
    setHighlights((prev) => {
      if (prev.some((h) => h.text === clean)) return prev;
      const next: ReaderHighlight[] = [
        {
          id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
          text: clean,
          color,
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
