// Daily quiz API. One POST route with three actions:
//   "pool"    today's quiz set (no answers)
//   "submit"  grade one attempt on the server and store it
//   "explain" explanations for one stored attempt (from the model, or from the knowledge base)
import { createFileRoute } from "@tanstack/react-router";
import { parseRequest } from "@/lib/plan/request";
import { explainAttempt, servePool, submitSet, toPublic, type Answer } from "@/lib/plan/quiz";
import { makeLimiter, openRouterText, verifyCaller } from "@/lib/plan/call.server";
import { makeStore, offlineStore } from "@/lib/plan/store.server";
import type { DailyStore } from "@/lib/plan/store";

const overLimit = makeLimiter(30);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{20,64}$/i;

export const Route = createFileRoute("/api/quiz")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await verifyCaller(request);
          if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
          if (overLimit(userId)) return Response.json({ error: "rate_limited" }, { status: 429 });

          let raw: unknown;
          try {
            raw = await request.json();
          } catch {
            return Response.json({ error: "bad_request" }, { status: 400 });
          }
          const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
          const apiKey = (process.env["OPENROUTER_API_KEY"] ?? "").trim();
          const callModel = apiKey ? openRouterText(apiKey) : null;
          const store: DailyStore = await makeStore().catch(() => offlineStore());
          const action = body["action"];

          if (action === "pool") {
            const parsed = parseRequest(body, new Date());
            if (!parsed) return Response.json({ error: "bad_request" }, { status: 400 });
            const out = await servePool({ userId, request: parsed, store, callModel });
            if (out.status === "content_unavailable") return Response.json({ error: "content_unavailable" }, { status: 503 });
            if (out.status === "no_quiz") return Response.json({ status: "no_quiz", nextDate: out.nextDate });
            return Response.json({ status: "ok", date: out.date, questions: out.questions.map(toPublic) });
          }

          if (action === "submit") {
            const date = typeof body["date"] === "string" ? (body["date"] as string) : "";
            if (!DATE.test(date)) return Response.json({ error: "bad_request" }, { status: 400 });
            const list = Array.isArray(body["answers"]) ? (body["answers"] as unknown[]).slice(0, 10) : [];
            const answers: Answer[] = [];
            for (const a of list) {
              const o = (a ?? {}) as Record<string, unknown>;
              if (typeof o["id"] !== "string" || o["id"].length > 20) continue;
              const chosen = typeof o["chosen"] === "string" ? (o["chosen"] as string).slice(0, 200) : null;
              answers.push({ id: o["id"], chosen });
            }
            const out = await submitSet({ userId, date, answers, store });
            if (out.status === "no_pool") return Response.json({ error: "no_quiz_today" }, { status: 409 });
            if (out.status === "storage_unavailable") return Response.json({ error: "storage_unavailable" }, { status: 503 });
            const a = out.attempt;
            return Response.json({
              attemptId: a.id,
              score: a.score,
              total: a.total,
              results: a.results.map((r) => ({ id: r.id, correct: r.correct, answer: r.term, chosen: r.chosen })),
            });
          }

          if (action === "explain") {
            const attemptId = typeof body["attemptId"] === "string" ? (body["attemptId"] as string) : "";
            if (!UUID.test(attemptId)) return Response.json({ error: "bad_request" }, { status: 400 });
            const out = await explainAttempt({ userId, attemptId, store, callModel });
            if (out.status === "not_found") return Response.json({ error: "not_found" }, { status: 404 });
            return Response.json({ explanations: out.explanations });
          }

          return Response.json({ error: "bad_request" }, { status: 400 });
        } catch {
          return Response.json({ error: "server_error" }, { status: 500 });
        }
      },
    },
  },
});
