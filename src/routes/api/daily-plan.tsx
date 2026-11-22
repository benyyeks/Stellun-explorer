// Daily plan API: one plan per learner per day, stored in Supabase and reused.
import { createFileRoute } from "@tanstack/react-router";
import { parseRequest } from "@/lib/plan/request";
import { servePlan } from "@/lib/plan/service";
import { makeLimiter, openRouterText, verifyCaller } from "@/lib/plan/call.server";
import { makeStore, offlineStore } from "@/lib/plan/store.server";

const overLimit = makeLimiter(6);

export const Route = createFileRoute("/api/daily-plan")({
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
          const parsed = parseRequest(raw, new Date());
          if (!parsed) return Response.json({ error: "bad_request" }, { status: 400 });

          const apiKey = (process.env["OPENROUTER_API_KEY"] ?? "").trim();
          const store = await makeStore().catch(() => offlineStore());
          const result = await servePlan({ userId, request: parsed, store, callModel: apiKey ? openRouterText(apiKey) : null });
          if (!result.ok) return Response.json({ error: result.code }, { status: 503 });
          return Response.json({ plan: result.plan, cached: result.cached });
        } catch {
          return Response.json({ error: "server_error" }, { status: 500 });
        }
      },
    },
  },
});
