/**
 * Browser side of the daily plan: gathers what the server may use about the learner,
 * asks for today's plan, and keeps it on the device for the rest of the day.
 */

import { supabase } from "@/integrations/supabase/client";
import { listBooks } from "@/lib/book-library";
import { progressForPlan } from "@/lib/academy-progress";
import { readAcademyProfile } from "@/lib/academy-profile";
import { gradeOf, type Homework } from "@/lib/homework";
import type { StudyWorkspace } from "@/lib/study-workspace";
import type { DailyPlan, PlanContext, TrackId } from "@/lib/plan/types";

const cacheKey = (date: string) => `stellun:daily-plan:v1:${date}`;

export function readCachedPlan(date: string): DailyPlan | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(date));
    return raw ? (JSON.parse(raw) as DailyPlan) : null;
  } catch {
    return null;
  }
}

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Short summaries only: titles, open items, book names, progress. No full notes and no book text. */
export async function collectContext(
  workspaces: StudyWorkspace[],
  homework: Homework[],
): Promise<{ tracks: TrackId[]; context: PlanContext }> {
  const shelf = workspaces.slice(0, 12);
  const books: PlanContext["books"] = [];
  for (const w of shelf) {
    try {
      const list = await listBooks(w.id);
      for (const b of list.slice(0, 4)) books.push({ title: b.name, workspace: w.title });
    } catch {
      /* IndexedDB unavailable: continue without books */
    }
  }
  const profile = readAcademyProfile();
  const context: PlanContext = {
    workspaces: shelf.map((w) => ({
      title: w.title,
      topic: w.topicId,
      focus: w.focus.slice(0, 300),
      goals: w.goals.slice(0, 300),
      openItems: w.checklist.filter((c) => !c.done).map((c) => c.label).slice(0, 8),
      doneCount: w.checklist.filter((c) => c.done).length,
    })),
    books: books.slice(0, 40),
    homework: homework.slice(0, 30).map((h) => ({
      title: h.title,
      track: h.track,
      status: gradeOf(h).status,
      dueAt: h.dueAt,
      score: h.score,
      maxPoints: h.maxPoints,
    })),
    progress: progressForPlan(),
    profile: { tracks: profile.tracks, jobs: profile.jobs.map((j) => j.label).slice(0, 10) },
  };
  return { tracks: profile.tracks, context };
}

export type PlanResult = { ok: true; plan: DailyPlan } | { ok: false; message: string };

export async function requestPlan(date: string, tracks: TrackId[], context: PlanContext): Promise<PlanResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, message: "Sign in to open today's plan." };

  let res: Response;
  try {
    res = await fetch("/api/daily-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date, tracks, context }),
    });
  } catch {
    return { ok: false, message: "Could not reach STELLUN. Check your connection and try again." };
  }
  if (res.status === 429) return { ok: false, message: "You opened plans a lot in the last minute. Try again shortly." };
  if (!res.ok) return { ok: false, message: "Today's plan is not available right now. Please try again later." };

  const body = (await res.json()) as { plan: DailyPlan };
  try {
    window.localStorage.setItem(cacheKey(date), JSON.stringify(body.plan));
  } catch {
    /* storage full: the plan is still shown for this visit */
  }
  return { ok: true, plan: body.plan };
}
