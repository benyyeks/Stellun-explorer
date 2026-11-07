// Staggered feed refresh. Authorization: Bearer <LOVABLE_CRON_SECRET>
// ?slot=iss|space-weather|stations|launches|starlink|active|geo|weather|science|resource|gps|news
// ?only=<exact-feed-name> still supported for admin single refresh
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

const SLOTS: Record<string, string[]> = {
  iss: ["iss-position", "kp-index"],
  "space-weather": ["solar-wind", "xray-flux"],
  stations: ["satellites-stations"],
  launches: ["launches", "past-launches"],
  starlink: ["satellites-starlink"],
  active: ["satellites-active"],
  geo: ["satellites-geo"],
  weather: ["satellites-weather"],
  science: ["satellites-science"],
  resource: ["satellites-resource"],
  gps: ["satellites-gps-ops"],
  news: ["space-news", "picture-of-the-day", "asteroids", "space-weather-alerts"],
};

async function handle(request: Request) {
  if (!verifyCaller(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const { runRefreshCycle } = await import("@/lib/feed-registry.server");

  const only = url.searchParams.get("only");
  if (only) {
    const results = await runRefreshCycle({ only, force: true });
    return Response.json({
      ok: true,
      mode: "only",
      only,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  }

  const slot = (url.searchParams.get("slot") || "iss").toLowerCase();
  const names = SLOTS[slot] ?? SLOTS.iss;
  const results = [];
  for (const name of names) {
    const part = await runRefreshCycle({ only: name, force: true });
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
