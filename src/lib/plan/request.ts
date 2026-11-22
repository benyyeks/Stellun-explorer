import { TRACK_IDS, type PlanContext, type PlanRequest, type TrackId } from "./types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Plain text only: no angle brackets, no runaway whitespace, capped length. */
export const cleanText = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "";

function list<T>(v: unknown, max: number, map: (x: unknown) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const item of v.slice(0, max)) {
    const mapped = map(item);
    if (mapped !== null) out.push(mapped);
  }
  return out;
}

const trackOf = (v: unknown): TrackId | null => (TRACK_IDS as string[]).includes(v as string) ? (v as TrackId) : null;

/** Whole days from the date (YYYY-MM-DD) to the UTC day of `now`. Positive when the date is in the past. */
export function dayDiff(dateKey: string, now: Date): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - Date.parse(dateKey + "T00:00:00Z")) / 86_400_000);
}

/** Checks and cleans the body sent by the browser. Returns null when it is not acceptable. */
export function parseRequest(raw: unknown, now: Date): PlanRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const date = typeof r["date"] === "string" && DATE.test(r["date"]) ? r["date"] : null;
  if (!date || Math.abs(dayDiff(date, now)) > 1) return null;

  const tracks = list(r["tracks"], 4, trackOf);
  const c = (r["context"] && typeof r["context"] === "object" ? r["context"] : {}) as Record<string, unknown>;
  const p = (c["progress"] && typeof c["progress"] === "object" ? c["progress"] : {}) as Record<string, unknown>;
  const profile = (c["profile"] && typeof c["profile"] === "object" ? c["profile"] : {}) as Record<string, unknown>;

  const context: PlanContext = {
    workspaces: list(c["workspaces"], 12, (x) => {
      const o = x as Record<string, unknown>;
      const title = cleanText(o["title"], 120);
      if (!title) return null;
      return {
        title,
        topic: cleanText(o["topic"], 60),
        focus: cleanText(o["focus"], 300),
        goals: cleanText(o["goals"], 300),
        openItems: list(o["openItems"], 8, (s) => cleanText(s, 160) || null),
        doneCount: Math.max(0, Math.min(999, Number(o["doneCount"]) || 0)),
      };
    }),
    books: list(c["books"], 40, (x) => {
      const o = x as Record<string, unknown>;
      const title = cleanText(o["title"], 160);
      return title ? { title, workspace: cleanText(o["workspace"], 120) } : null;
    }),
    homework: list(c["homework"], 30, (x) => {
      const o = x as Record<string, unknown>;
      const title = cleanText(o["title"], 160);
      const track = trackOf(o["track"]);
      if (!title || !track) return null;
      return {
        title,
        track,
        status: cleanText(o["status"], 20),
        dueAt: typeof o["dueAt"] === "string" ? cleanText(o["dueAt"], 40) || null : null,
        score: typeof o["score"] === "number" && Number.isFinite(o["score"]) ? o["score"] : null,
        maxPoints: Math.max(1, Math.min(1000, Number(o["maxPoints"]) || 100)),
      };
    }),
    progress: {
      weakTerms: list(p["weakTerms"], 60, (s) => cleanText(s, 80) || null),
      seenTerms: list(p["seenTerms"], 400, (s) => cleanText(s, 80) || null),
    },
    profile: {
      tracks: list(profile["tracks"], 4, trackOf),
      jobs: list(profile["jobs"], 10, (s) => cleanText(s, 120) || null),
    },
  };

  return { date, tracks: tracks.length ? tracks : [...TRACK_IDS], context };
}
