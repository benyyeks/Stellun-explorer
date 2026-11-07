// Staggered feed refresh. Authorization: Bearer <LOVABLE_CRON_SECRET>
// Scheduled: ?slot=…  (respects cache TTL — no hammering)
// Manual:    ?only=<feed-name>&force=1
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

/** Orbital tracker + deep space first; one slot = few upstream calls. */
const SLOTS: Record<string, string[]> = {
  iss: ["iss-position", "kp-index"],
  stations: ["satellites-stations"],
  starlink: ["satellites-starlink"],
  iridium: ["satellites-iridium"],
  resource: ["satellites-resource"],
  weather: ["satellites-weather"],
  science: ["satellites-science"],
  gps: ["satellites-gps-ops"],
  geo: ["satellites-geo"],
  "space-weather": ["solar-wind", "xray-flux"],
  mars: ["mars-perseverance"],
  launches: ["launches"], // past-launches on separate manual/rare runs to save LL2
  news: ["space-news", "picture-of-the-day", "space-weather-alerts"],
};

async function handle(request: Request) {
  if (!verifyCaller(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const { runRefreshCycle } = await import("@/lib/feed-registry.server");

  const only = url.searchParams.get("only");
  const force = url.searchParams.get("force") === "1";

  if (only) {
    const results = await runRefreshCycle({ only, force });
    return Response.json({
      ok: true,
      mode: "only",
      only,
      force,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  }

  const slot = (url.searchParams.get("slot") || "iss").toLowerCase();
  const names = SLOTS[slot] ?? SLOTS.iss;
  // Scheduled path: force=false → only hit upstream when TTL expired
  const results = [];
  for (const name of names) {
    const part = await runRefreshCycle({ only: name, force: false });
    results.push(...part);
  }

  return Response.json({
    ok: true,
    mode: "slot",
    slot,
    feeds: results.length,
    failed: results.filter((r) => !r.ok).length,
    results,
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
