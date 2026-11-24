// Receives one CelesTrak group fetched by the GitHub Actions ingest job and stores it in Supabase.
// Authorization: Bearer <STELLUN_CRON_SECRET>. Body: { "group": "<group id>", "payload": [ ...records ] }.
import { createFileRoute } from "@tanstack/react-router";

// Smaller groups: stored in api_cache under "satellites", which the tracker reads.
const LIGHT_GROUPS = new Set([
  "stations", "iridium-NEXT", "weather", "science", "resource", "gps-ops",
  "galileo", "glo-ops", "beidou", "visual", "19820",
]);
// Larger groups: stored in satellite_catalog_blob, which the tracker reads.
const HEAVY_GROUPS = new Set(["starlink", "active", "geo", "cosmos-2251-debris", "iridium-33-debris"]);

function verifyCaller(request: Request): boolean {
  const secret =
    (process.env["STELLUN_CRON_SECRET"] ?? "").trim() ||
    (process.env["LOVABLE_CRON_SECRET"] ?? "").trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!provided || provided.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= provided.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

function reply(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

async function handle(request: Request): Promise<Response> {
  if (!verifyCaller(request)) return new Response("Unauthorized", { status: 401 });

  let body: { group?: unknown; payload?: unknown };
  try {
    body = (await request.json()) as { group?: unknown; payload?: unknown };
  } catch {
    return reply({ ok: false, error: "Body must be JSON" }, 400);
  }

  const group = typeof body.group === "string" ? body.group : "";
  const payload = body.payload;
  const isHeavy = HEAVY_GROUPS.has(group);
  if (!isHeavy && !LIGHT_GROUPS.has(group)) {
    return reply({ ok: false, error: `Group not allowed: ${group}` }, 400);
  }
  if (!Array.isArray(payload) || payload.length === 0) {
    return reply({ ok: false, error: "Payload must be a non-empty list" }, 422);
  }

  try {
    if (isHeavy) {
      const { writeCatalogPayload } = await import("@/lib/satellite-catalog.server");
      const r = await writeCatalogPayload(group, payload);
      return reply({ ok: true, group, count: r.count, source: r.source });
    }
    const { cached } = await import("@/lib/api-cache.server");
    const r = await cached("satellites", { group }, 14400, async () => payload, { force: true });
    return reply({ ok: true, group, count: payload.length, source: r.source });
  } catch (e) {
    return reply({ ok: false, error: e instanceof Error ? e.message.slice(0, 300) : String(e) }, 500);
  }
}

export const Route = createFileRoute("/api/public/ingest")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
