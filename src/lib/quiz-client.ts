/**
 * Browser side of the daily quiz: today's set, submitting an attempt, and explanations.
 * The browser never sees the answer key. Results come back from the server after submit.
 */

import { supabase } from "@/integrations/supabase/client";
import type { PlanContext, TrackId } from "@/lib/plan/types";

export type PublicQuestion = {
  id: string;
  track: TrackId;
  category: string;
  style: "scenario" | "definition";
  prompt: string;
  choices: string[];
};

export type PoolResult =
  | { kind: "ready"; date: string; questions: PublicQuestion[] }
  | { kind: "no_quiz"; nextDate: string | null }
  | { kind: "error"; message: string };

export type SubmitResult =
  | { kind: "ok"; attemptId: string; score: number; total: number; results: { id: string; correct: boolean; answer: string; chosen: string | null }[] }
  | { kind: "error"; message: string };

export type ExplainResult = { kind: "ok"; explanations: { id: string; text: string }[] } | { kind: "error"; message: string };

function messageFor(status: number): string {
  if (status === 429) return "You have taken a lot of steps in the last minute. Try again shortly.";
  if (status === 409) return "There is no quiz for today yet. Open today's quiz first.";
  if (status === 503) return "The quiz is not available right now. Please try again later.";
  return "Something went wrong. Please try again.";
}

async function post(body: Record<string, unknown>): Promise<{ ok: true; status: number; data: Record<string, unknown> } | { ok: false; message: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, message: "Sign in to take the quiz." };
  let res: Response;
  try {
    res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, message: "Could not reach STELLUN. Check your connection and try again." };
  }
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }
  if (!res.ok) return { ok: false, message: messageFor(res.status) };
  return { ok: true, status: res.status, data: json };
}

export async function requestPool(date: string, tracks: TrackId[], context: PlanContext): Promise<PoolResult> {
  const out = await post({ action: "pool", date, tracks, context });
  if (!out.ok) return { kind: "error", message: out.message };
  if (out.data["status"] === "no_quiz") {
    return { kind: "no_quiz", nextDate: typeof out.data["nextDate"] === "string" ? (out.data["nextDate"] as string) : null };
  }
  return { kind: "ready", date, questions: (out.data["questions"] as PublicQuestion[]) ?? [] };
}

export async function submitQuizSet(date: string, answers: { id: string; chosen: string | null }[]): Promise<SubmitResult> {
  const out = await post({ action: "submit", date, answers });
  if (!out.ok) return { kind: "error", message: out.message };
  return {
    kind: "ok",
    attemptId: String(out.data["attemptId"] ?? ""),
    score: Number(out.data["score"] ?? 0),
    total: Number(out.data["total"] ?? 0),
    results: (out.data["results"] as SubmitResult extends { kind: "ok"; results: infer R } ? R : never) ?? [],
  };
}

export async function requestExplain(attemptId: string): Promise<ExplainResult> {
  const out = await post({ action: "explain", attemptId });
  if (!out.ok) return { kind: "error", message: out.message };
  return { kind: "ok", explanations: (out.data["explanations"] as { id: string; text: string }[]) ?? [] };
}
