import { queryOptions } from "@tanstack/react-query";
import { getHorizons } from "@/lib/stellun-data.functions";
import { AU_KM } from "@/lib/astronomy";
import type { ProbeKey } from "@/lib/satellite";

const LIGHT_SPEED_KM_S = 299792.458;

export type ProbeTelemetry = {
  distanceKm: number;
  rangeAU: number;
  speedKmS: number;
  oneWayLightMinutes: number;
  epoch: string;
};

// Parse the JPL Horizons vector table (VEC_TABLE=3, CSV format). The numeric
// columns are JDTDB, X, Y, Z, VX, VY, VZ (km, km/s) followed by derived
// quantities. The calendar string sits between JDTDB and X, so we collect
// numeric tokens instead of relying on fixed column indexes.
export function parseHorizonsVectors(text: string): ProbeTelemetry | null {
  const soe = text.indexOf("$$SOE");
  const eoe = text.indexOf("$$EOE");
  if (soe < 0 || eoe < 0 || eoe <= soe) return null;
  const lines = text
    .slice(soe + 5, eoe)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  // Use the middle sample for a representative current state.
  const line = lines[Math.floor(lines.length / 2)]!;
  const tokens = line.split(",").map((t) => t.trim());
  const numeric = tokens
    .filter((t) => /^[-+0-9.Ee]+$/.test(t))
    .map((t) => Number(t))
    .filter((n) => Number.isFinite(n));
  if (numeric.length < 7) return null;

  const [, x, y, z, vx, vy, vz] = numeric as number[];
  const distanceKm = Math.sqrt(x! * x! + y! * y! + z! * z!);
  const speedKmS = Math.sqrt(vx! * vx! + vy! * vy! + vz! * vz!);
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;

  return {
    distanceKm,
    rangeAU: distanceKm / AU_KM,
    speedKmS,
    oneWayLightMinutes: distanceKm / LIGHT_SPEED_KM_S / 60,
    epoch: (tokens[1] ?? "").replace(/^A\.D\.\s*/, "").replace(/\.0+$/, ""),
  };
}

export function horizonsProbeQuery(key: ProbeKey) {
  return queryOptions({
    queryKey: ["horizons-probe", key],
    queryFn: async () => {
      const res = await getHorizons({ data: { probe: key } });
      const telemetry =
        typeof res.data === "string" ? parseHorizonsVectors(res.data) : null;
      return { ...res, telemetry };
    },
    staleTime: 60_000,
    retry: 1,
  });
}
