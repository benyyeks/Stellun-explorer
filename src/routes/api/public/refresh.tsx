// Scheduled feed refresh. Call with Authorization: Bearer <LOVABLE_CRON_SECRET>
// Optional: ?heavy=1 to refresh Starlink + active + GEO only (run less often).
import { createFileRoute } from "@tanstack/react-router";

function verifyCaller(request: Request): boolean {
  const secret = process.env["LOVABLE_CRON_SECRET"];
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret") ?? "";
  const provided = bearer || querySecret;
  if (!provided || provided.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) {
    diff |= provided.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return diff === 0;
}

async function handle(request: Request) {
  if (!verifyCaller(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const heavy = url.searchParams.get("heavy") === "1";
  const { runRefreshCycle } = await import("@/lib/feed-registry.server");

  if (heavy) {
    // One at a time — stays under Worker subrequest limits
    const names = ["satellites-starlink", "satellites-active", "satellites-geo"] as const;
    const results = [];
    for (const name of names) {
      const part = await runRefreshCycle({ only: name });
      results.push(...part);
    }
    return Response.json({
      ok: true,
      mode: "heavy",
      feeds: results.length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  }

  const results = await runRefreshCycle();
  return Response.json({
    ok: true,
    mode: "full",
    feeds: results.length,
    failed: results.filter((r) => !r.ok).length,
  });
}

export const Route = createFileRoute("/api/public/refresh")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
