// STELLUN Satellite Propagation Engine
// TLE + CelesTrak OMM parsing, Kepler + J2 secular propagation for Earth
// satellites, and deep-space probe anchor helpers used by Deep Space.
//
// NOTE: Full SGP4 (satellite.js) is a later upgrade. It requires adding the
// package to package.json AND updating bun.lock (frozen lockfile builds).
// Until then this Kepler+J2 model is the production propagator — accuracy is
// best with elements refreshed within a few hours of epoch.

import { DEG, julianDateUTC, gmstDeg, AU_KM, heliocentricEcliptic } from "./astronomy";

export const MU_EARTH = 398600.4418; // km^3/s^2
export const RE_EARTH = 6378.137; // km, WGS84 equatorial
export const J2_EARTH = 0.00108263;
export const FLATTENING = 1 / 298.257223563;

export type TLE = {
  name: string;
  noradId: string;
  epochJD: number;
  inc: number;
  raan: number;
  ecc: number;
  argp: number;
  ma: number;
  meanMotion: number;
  a0: number;
  periodMin: number;
  apogeeAlt: number;
  perigeeAlt: number;
  /** Optional classic TLE lines for a future SGP4 path */
  line1?: string;
  line2?: string;
};

export type SatState = {
  xEci: number;
  yEci: number;
  zEci: number;
  lat: number;
  lon: number;
  alt: number;
  speed: number;
};

export function parseTLEBlock(text: string): TLE[] {
  const rawLines = text
    .split("\n")
    .map((l) => l.replace(/\r/g, ""))
    .filter((l) => l.trim().length > 0);
  const sats: TLE[] = [];
  for (let i = 0; i < rawLines.length - 1; i++) {
    const l1 = rawLines[i] ?? "";
    const l2 = rawLines[i + 1] ?? "";
    if (l1.charAt(0) === "1" && l2.charAt(0) === "2" && l1.charAt(1) === " " && l2.charAt(1) === " ") {
      const prev = i > 0 ? rawLines[i - 1] : undefined;
      const name =
        prev && prev.charAt(0) !== "1" && prev.charAt(0) !== "2"
          ? prev.trim()
          : `SAT ${l1.substring(2, 7).trim()}`;
      try {
        const tle = parseTLELines(l1, l2, name);
        if (tle) sats.push(tle);
      } catch {
        /* skip malformed entry */
      }
      i++;
    }
  }
  return sats;
}

export function parseTLELines(line1: string, line2: string, name: string): TLE | null {
  if (!line1 || !line2 || line1.length < 63 || line2.length < 63) return null;
  const epochYY = parseInt(line1.substring(18, 20), 10);
  const epochDOY = parseFloat(line1.substring(20, 32));
  if (Number.isNaN(epochYY) || Number.isNaN(epochDOY)) return null;
  const year = epochYY < 57 ? 2000 + epochYY : 1900 + epochYY;
  const jdJan0 = julianDateUTC(new Date(Date.UTC(year, 0, 1))) - 1;
  const epochJD = jdJan0 + epochDOY;

  const noradId = line1.substring(2, 7).trim();
  const inc = parseFloat(line2.substring(8, 16));
  const raan = parseFloat(line2.substring(17, 25));
  const eccStr = line2.substring(26, 33).trim();
  const ecc = parseFloat("0." + eccStr);
  const argp = parseFloat(line2.substring(34, 42));
  const ma = parseFloat(line2.substring(43, 51));
  const meanMotion = parseFloat(line2.substring(52, 63));
  if ([inc, raan, ecc, argp, ma, meanMotion].some((v) => Number.isNaN(v))) return null;

  const n0 = (meanMotion * 2 * Math.PI) / 86400;
  const a0 = Math.pow(MU_EARTH / (n0 * n0), 1 / 3);
  const apogeeAlt = a0 * (1 + ecc) - RE_EARTH;
  const perigeeAlt = a0 * (1 - ecc) - RE_EARTH;

  return {
    name: name.replace(/^0\s+/, "").trim(),
    noradId,
    epochJD,
    inc,
    raan,
    ecc,
    argp,
    ma,
    meanMotion,
    a0,
    periodMin: (2 * Math.PI) / n0 / 60,
    apogeeAlt,
    perigeeAlt,
    line1,
    line2,
  };
}

export function solveKeplerRad(Mrad: number, e: number): number {
  let E = Mrad;
  for (let i = 0; i < 12; i++) {
    const dE = (E - e * Math.sin(E) - Mrad) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

export function gmstRad(jd: number): number {
  return gmstDeg(jd) * DEG;
}

/**
 * Kepler + J2 secular RAAN/argp rates → ECI → geodetic.
 * ISS live positions should still override this when wheretheiss data exists.
 */
export function propagateSat(tle: TLE, date: Date): SatState {
  const jd = julianDateUTC(date);
  const dtSec = (jd - tle.epochJD) * 86400;

  const n0 = (tle.meanMotion * 2 * Math.PI) / 86400; // rad/s
  const i0 = tle.inc * DEG;
  const e0 = tle.ecc;
  const p0 = tle.a0 * (1 - e0 * e0);
  if (!(p0 > 0) || !(n0 > 0)) {
    return { xEci: 0, yEci: 0, zEci: 0, lat: 0, lon: 0, alt: 0, speed: 0 };
  }

  // J2 secular rates (rad/s)
  const factor = -1.5 * n0 * J2_EARTH * (RE_EARTH / p0) * (RE_EARTH / p0);
  const raanDot = factor * Math.cos(i0);
  const argpDot = -factor * (2.5 * Math.sin(i0) * Math.sin(i0) - 2);

  const raan = tle.raan * DEG + raanDot * dtSec;
  const argp = tle.argp * DEG + argpDot * dtSec;
  const M = tle.ma * DEG + n0 * dtSec;

  // Normalize mean anomaly
  let Mnorm = M % (2 * Math.PI);
  if (Mnorm < 0) Mnorm += 2 * Math.PI;

  const E = solveKeplerRad(Mnorm, e0);
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const r = tle.a0 * (1 - e0 * cosE);
  const trueAnom = Math.atan2(Math.sqrt(1 - e0 * e0) * sinE, cosE - e0);

  const xp = r * Math.cos(trueAnom);
  const yp = r * Math.sin(trueAnom);

  // Perifocal velocity
  const rDot = (tle.a0 * n0 * e0 * sinE) / (1 - e0 * cosE);
  const rfDot = (tle.a0 * n0 * Math.sqrt(1 - e0 * e0)) / (1 - e0 * cosE);
  const vxp = rDot * Math.cos(trueAnom) - rfDot * Math.sin(trueAnom);
  const vyp = rDot * Math.sin(trueAnom) + rfDot * Math.cos(trueAnom);

  const cosO = Math.cos(raan);
  const sinO = Math.sin(raan);
  const cosw = Math.cos(argp);
  const sinw = Math.sin(argp);
  const cosi = Math.cos(i0);
  const sini = Math.sin(i0);

  const R11 = cosO * cosw - sinO * sinw * cosi;
  const R12 = -cosO * sinw - sinO * cosw * cosi;
  const R21 = sinO * cosw + cosO * sinw * cosi;
  const R22 = -sinO * sinw + cosO * cosw * cosi;
  const R31 = sinw * sini;
  const R32 = cosw * sini;

  const xEci = R11 * xp + R12 * yp;
  const yEci = R21 * xp + R22 * yp;
  const zEci = R31 * xp + R32 * yp;
  const vxEci = R11 * vxp + R12 * vyp;
  const vyEci = R21 * vxp + R22 * vyp;
  const vzEci = R31 * vxp + R32 * vyp;
  const speed = Math.sqrt(vxEci * vxEci + vyEci * vyEci + vzEci * vzEci);

  // ECI → ECEF via GMST
  const g = gmstRad(jd);
  const cosg = Math.cos(g);
  const sing = Math.sin(g);
  const xEcef = cosg * xEci + sing * yEci;
  const yEcef = -sing * xEci + cosg * yEci;
  const zEcef = zEci;

  const lon = Math.atan2(yEcef, xEcef) / DEG;
  const rXY = Math.sqrt(xEcef * xEcef + yEcef * yEcef);
  let lat = Math.atan2(zEcef, rXY);
  // WGS84 geodetic iteration
  for (let i = 0; i < 5; i++) {
    const sinLat = Math.sin(lat);
    const C = 1 / Math.sqrt(1 - (2 * FLATTENING - FLATTENING * FLATTENING) * sinLat * sinLat);
    lat = Math.atan2(
      zEcef + RE_EARTH * C * (2 * FLATTENING - FLATTENING * FLATTENING) * sinLat,
      rXY,
    );
  }
  const sinLat = Math.sin(lat);
  const C = 1 / Math.sqrt(1 - (2 * FLATTENING - FLATTENING * FLATTENING) * sinLat * sinLat);
  const alt = rXY / Math.cos(lat) - RE_EARTH * C;

  let lonDeg = lon;
  if (lonDeg > 180) lonDeg -= 360;
  if (lonDeg < -180) lonDeg += 360;

  return {
    xEci,
    yEci,
    zEci,
    lat: lat / DEG,
    lon: lonDeg,
    alt,
    speed,
  };
}

/* ------------------------------- UNIT HELPERS ------------------------------ */
// Kept for any legacy imports from this module (prefer @/lib/format).
export function fmtNum(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "--";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function fmtKm(km: number, digits = 0): string {
  return `${fmtNum(km, digits)} km`;
}

export function fmtAU(au: number, digits = 3): string {
  return `${fmtNum(au, digits)} AU`;
}

export function lightTimeFromKm(km: number): string {
  const seconds = (km * 1000) / 299792458;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  const hours = seconds / 3600;
  if (hours < 48) return `${hours.toFixed(2)} hr`;
  return `${(hours / 24).toFixed(2)} days`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function utcClock(date: Date): string {
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`;
}

export function utcDateStr(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function timeAgo(date: Date): string {
  const s = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

export function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/* ============================ DEEP SPACE PROBES ============================ */

export type ProbeKey =
  | "voyager1"
  | "voyager2"
  | "newhorizons"
  | "parkersolarprobe"
  | "jwst"
  | "roman"
  | "juno";

type ProbeAnchorBase = {
  name: string;
  horizonsId: string;
  launched: string;
  note: string;
};
type RecessionProbe = ProbeAnchorBase & {
  kind: "recession";
  anchorDate: string;
  anchorAU: number;
  speedKmS: number;
  eclLonDeg: number;
  eclLatDeg: number;
};
type L2Probe = ProbeAnchorBase & { kind: "l2"; distanceKm: number };
type OrbitSunProbe = ProbeAnchorBase & {
  kind: "orbit-sun";
  perihelionAU: number;
  aphelionAU: number;
  periodDays: number;
};
type JupiterProbe = ProbeAnchorBase & { kind: "jupiter-orbit" };

export type ProbeAnchor = RecessionProbe | L2Probe | OrbitSunProbe | JupiterProbe;

export const PROBE_ANCHORS: Record<ProbeKey, ProbeAnchor> = {
  voyager1: {
    name: "Voyager 1",
    horizonsId: "-31",
    launched: "1977-09-05",
    kind: "recession",
    anchorDate: "2026-01-01T00:00:00Z",
    anchorAU: 170.0,
    speedKmS: 17.0,
    eclLonDeg: 257,
    eclLatDeg: 34.7,
    note: "Farthest human-made object. In interstellar space since 2012.",
  },
  voyager2: {
    name: "Voyager 2",
    horizonsId: "-32",
    launched: "1977-08-20",
    kind: "recession",
    anchorDate: "2026-01-01T00:00:00Z",
    anchorAU: 142.5,
    speedKmS: 15.4,
    eclLonDeg: 313,
    eclLatDeg: -48,
    note: "In interstellar space since 2018. Heading toward constellation Pavo.",
  },
  newhorizons: {
    name: "New Horizons",
    horizonsId: "-98",
    launched: "2006-01-19",
    kind: "recession",
    anchorDate: "2024-10-01T00:00:00Z",
    anchorAU: 60.0,
    speedKmS: 15.3,
    eclLonDeg: 297,
    eclLatDeg: -3,
    note: "Cruising through the Kuiper Belt toward interstellar space.",
  },
  parkersolarprobe: {
    name: "Parker Solar Probe",
    horizonsId: "-96",
    launched: "2018-08-12",
    kind: "orbit-sun",
    perihelionAU: 0.046,
    aphelionAU: 0.73,
    periodDays: 88,
    note: "Fastest human-made object. Repeatedly dives closer to the Sun than any spacecraft in history.",
  },
  jwst: {
    name: "James Webb Space Telescope",
    horizonsId: "-170",
    launched: "2021-12-25",
    kind: "l2",
    distanceKm: 1_500_000,
    note: "Halo orbit around the Sun-Earth L2 point, roughly 4x farther than the Moon.",
  },
  roman: {
    name: "Nancy Grace Roman Space Telescope",
    horizonsId: "-200",
    launched: "2026-10-01",
    kind: "l2",
    distanceKm: 1_500_000,
    note: "Sun-Earth L2 observatory (illustrative placement until regular Horizons fixes).",
  },
  juno: {
    name: "Juno",
    horizonsId: "-61",
    launched: "2011-08-05",
    kind: "jupiter-orbit",
    note: "Polar orbiter at Jupiter studying the planet's interior and magnetosphere.",
  },
};

/** Fallback distance (AU) when Horizons is unavailable. */
export function probeFallbackDistanceAU(key: ProbeKey, now: Date): number | null {
  const p = PROBE_ANCHORS[key];
  if (!p) return null;
  if (p.kind === "recession") {
    const anchor = new Date(p.anchorDate);
    const dtSec = (now.getTime() - anchor.getTime()) / 1000;
    const deltaAU = (p.speedKmS * dtSec) / AU_KM;
    return p.anchorAU + deltaAU;
  }
  if (p.kind === "l2") {
    return p.distanceKm / AU_KM;
  }
  if (p.kind === "jupiter-orbit") {
    const jd = julianDateUTC(now);
    const earth = heliocentricEcliptic("earth", jd);
    const jup = heliocentricEcliptic("jupiter", jd);
    const dx = jup.x - earth.x;
    const dy = jup.y - earth.y;
    const dz = jup.z - earth.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  if (p.kind === "orbit-sun") {
    return (p.perihelionAU + p.aphelionAU) / 2;
  }
  return null;
}

/** Illustrative ecliptic position for recession probes (Deep Space scene). */
export function probeIllustrativePositionAU(key: ProbeKey, now: Date) {
  const p = PROBE_ANCHORS[key];
  if (!p || p.kind !== "recession") return null;
  const distAU = probeFallbackDistanceAU(key, now);
  if (distAU === null) return null;
  const lon = p.eclLonDeg * DEG;
  const lat = p.eclLatDeg * DEG;
  return {
    x: distAU * Math.cos(lat) * Math.cos(lon),
    y: distAU * Math.cos(lat) * Math.sin(lon),
    z: distAU * Math.sin(lat),
  };
}

/* ----------------------------------- OMM ---------------------------------- */

type OMMRecord = Record<string, unknown>;

export function parseOMMRecord(rec: OMMRecord | null | undefined): TLE | null {
  if (!rec || typeof rec !== "object") return null;
  const inc = Number(rec["INCLINATION"]);
  const raan = Number(rec["RA_OF_ASC_NODE"]);
  const ecc = Number(rec["ECCENTRICITY"]);
  const argp = Number(rec["ARG_OF_PERICENTER"]);
  const ma = Number(rec["MEAN_ANOMALY"]);
  const meanMotion = Number(rec["MEAN_MOTION"]);
  if ([inc, raan, ecc, argp, ma, meanMotion].some((v) => Number.isNaN(v))) return null;

  const epochDate = new Date(String(rec["EPOCH"]));
  if (Number.isNaN(epochDate.getTime())) return null;
  const epochJD = julianDateUTC(epochDate);

  const n0 = (meanMotion * 2 * Math.PI) / 86400;
  const a0 = Math.pow(MU_EARTH / (n0 * n0), 1 / 3);
  const apogeeAlt = a0 * (1 + ecc) - RE_EARTH;
  const perigeeAlt = a0 * (1 - ecc) - RE_EARTH;

  const noradId = String(rec["NORAD_CAT_ID"]);
  return {
    name: String(rec["OBJECT_NAME"] || `SAT ${noradId}`).trim(),
    noradId,
    epochJD,
    inc,
    raan,
    ecc,
    argp,
    ma,
    meanMotion,
    a0,
    periodMin: (2 * Math.PI) / n0 / 60,
    apogeeAlt,
    perigeeAlt,
  };
}

export function parseOMMArray(json: unknown): TLE[] {
  if (!Array.isArray(json)) return [];
  const out: TLE[] = [];
  for (const rec of json) {
    try {
      const parsed = parseOMMRecord(rec as OMMRecord);
      if (parsed) out.push(parsed);
    } catch {
      /* skip malformed record */
    }
  }
  return out;
}

export function orbitRegime(tle: TLE): string {
  const meanAlt = (tle.apogeeAlt + tle.perigeeAlt) / 2;
  const isDebris = /\bDEB(RIS)?\b/i.test(tle.name);
  if (isDebris) return "Orbital debris";
  if (tle.ecc > 0.25 && tle.apogeeAlt > 20000) return "Highly elliptical (HEO)";
  if (meanAlt < 2000 && tle.inc >= 96 && tle.inc <= 100) return "Sun-synchronous (SSO)";
  if (meanAlt < 2000) return "Low Earth orbit (LEO)";
  if (meanAlt < 34000) return "Medium Earth orbit (MEO)";
  if (meanAlt < 37000) return "Geosynchronous (GEO)";
  return "High Earth orbit";
}

export const DEBRIS_EVENTS: {
  pattern: RegExp;
  event: string;
  date: string;
  altKm: string;
  detail: string;
}[] = [
  {
    pattern: /COSMOS\s*2251/i,
    event: "Iridium 33 / Cosmos 2251 collision",
    date: "10 February 2009",
    altKm: "~789 km",
    detail:
      "Accidental collision of Iridium 33 and Cosmos 2251 over Siberia, generating long-lived debris.",
  },
  {
    pattern: /IRIDIUM\s*33/i,
    event: "Iridium 33 / Cosmos 2251 collision",
    date: "10 February 2009",
    altKm: "~789 km",
    detail:
      "Accidental collision of Iridium 33 and Cosmos 2251 over Siberia, generating long-lived debris.",
  },
  {
    pattern: /(COSMOS\s*1408|19820)/i,
    event: "Cosmos 1408 anti-satellite test",
    date: "15 November 2021",
    altKm: "~470 km",
    detail:
      "Debris from the Cosmos 1408 ASAT test intersected altitudes used by the ISS.",
  },
];

export function matchDebrisEvent(name: string) {
  return DEBRIS_EVENTS.find((e) => e.pattern.test(name)) ?? null;
}
