// Server-only helpers shared by the plan and quiz routes: checking the caller, rate limits, and the model call.
import type { ModelCall } from "./store";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
/** Tried in order within one request. Each request stays under about 40 seconds. */
const FREE_MODELS = [
  "openrouter/free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
] as const;
const BUDGET_MS = 40_000;
const PER_CALL_MS = 20_000;

/** The Supabase user id for the bearer token, or null. */
export async function verifyCaller(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token || token.length > 4000) return null;
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
  if (!url || !key) return null;
  try {
    const res = await fetch(url + "/auth/v1/user", {
      headers: { apikey: key, authorization: "Bearer " + token },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { id?: unknown };
    return typeof body.id === "string" ? body.id : null;
  } catch {
    return null;
  }
}

/** Returns a checker: true when the user has made more than `max` calls in the window. */
export function makeLimiter(max: number, windowMs = 60_000): (userId: string) => boolean {
  const hits = new Map<string, number[]>();
  return (userId) => {
    const now = Date.now();
    const list = (hits.get(userId) ?? []).filter((t) => now - t < windowMs);
    list.push(now);
    hits.set(userId, list);
    if (hits.size > 5000) {
      for (const [key, times] of hits) {
        if (!times.some((t) => now - t < windowMs)) hits.delete(key);
      }
    }
    return list.length > max;
  };
}

/** A model call through OpenRouter. Returns the text, or null when nothing usable came back. */
export function openRouterText(apiKey: string): ModelCall {
  return async (system, user) => {
    const started = Date.now();
    const models: string[] = [...FREE_MODELS];
    const paid = (process.env["OPENROUTER_PAID_MODEL"] ?? "").trim();
    if (paid) models.unshift(paid);
    for (const model of models) {
      const left = BUDGET_MS - (Date.now() - started);
      if (left < 3_000) break;
      try {
        const res = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + apiKey,
            "HTTP-Referer": "https://stellun.space",
            "X-OpenRouter-Title": "STELLUN",
          },
          body: JSON.stringify({
            model,
            temperature: 0.5,
            max_tokens: 1800,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          }),
          signal: AbortSignal.timeout(Math.min(PER_CALL_MS, left)),
        });
        if (!res.ok) continue;
        const body = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
        const content = body.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.trim()) return content;
      } catch {
        /* try the next model */
      }
    }
    return null;
  };
}
