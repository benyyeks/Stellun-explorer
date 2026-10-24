// STELLUN Astronomy Engine (TypeScript port)
// Pure celestial-mechanics functions: planetary positions, Sun/Moon
// position and phase, sidereal time, altitude-azimuth transforms.
// Verified against known reference values (Earth's distance from the Sun
// near aphelion, Mars/Jupiter/Saturn orbital periods, real moon phase for
// a known date). No dependencies, no side effects.
//
// Planetary elements: JPL "Keplerian Elements for Approximate Positions
// of the Major Planets", Table 1 (valid 1800-2050 AD).
// https://ssd.jpl.nasa.gov/planets/approx_pos.html

export const DEG = Math.PI / 180;
export const AU_KM = 149597870.7;
export const OBLIQUITY_J2000 = 23.43928 * DEG;

export type PlanetKey =
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

type ElementPair = [number, number];
type PlanetElement = {
  a: ElementPair;
  e: ElementPair;
  I: ElementPair;
  L: ElementPair;
  peri: ElementPair;
  node: ElementPair;
  radiusKm: number;
  color: string;
};

export const PLANET_ELEMENTS: Record<PlanetKey, PlanetElement> = {
  mercury: { a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], I: [7.00497902, -0.00594749], L: [252.2503235, 149472.67411175], peri: [77.45779628, 0.16047689], node: [48.33076593, -0.12534081], radiusKm: 2439.7, color: "#b7a89a" },
  venus: { a: [0.72333566, 0.0000039], e: [0.00677672, -0.00004107], I: [3.39467605, -0.0007889], L: [181.9790995, 58517.81538729], peri: [131.60246718, 0.00268329], node: [76.67984255, -0.27769418], radiusKm: 6051.8, color: "#d9c08c" },
  earth: { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], I: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], peri: [102.93768193, 0.32327364], node: [0.0, 0.0], radiusKm: 6371.0, color: "#3fa9ff" },
  mars: { a: [1.52371034, 0.00001847], e: [0.0933941, 0.00007882], I: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499], peri: [-23.94362959, 0.44441088], node: [49.55953891, -0.29257343], radiusKm: 3389.5, color: "#c1440e" },
  jupiter: { a: [5.202887, -0.00011607], e: [0.04838624, -0.00013253], I: [1.30439695, -0.00183714], L: [34.39644051, 3034.74612775], peri: [14.72847983, 0.21252668], node: [100.47390909, 0.20469106], radiusKm: 69911, color: "#d9b38c" },
  saturn: { a: [9.53667594, -0.0012506], e: [0.05386179, -0.00050991], I: [2.48599187, 0.00193609], L: [49.95424423, 1222.49362201], peri: [92.59887831, -0.41897216], node: [113.66242448, -0.28867794], radiusKm: 58232, color: "#e3d0a1" },
  uranus: { a: [19.18916464, -0.00196176], e: [0.04725744, -0.00004397], I: [0.77263783, -0.00242939], L: [313.23810451, 428.48202785], peri: [170.9542763, 0.40805281], node: [74.01692503, 0.04240589], radiusKm: 25362, color: "#9fd6e0" },
  neptune: { a: [30.06992276, 0.00026291], e: [0.00859048, 0.00005105], I: [1.77004347, 0.00035372], L: [-55.12002969, 218.45945325], peri: [44.96476227, -0.32241464], node: [131.78422574, -0.00508664], radiusKm: 24622, color: "#6a8fe0" },
};

/** Order used by Deep Space / solar-system views (includes Earth). */
export const PLANET_ORDER: PlanetKey[] = [
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
];
export type Vec3 = { x: number; y: number; z: number };
export type Heliocentric = Vec3 & { r: number; a: number; e: number; periodDays: number };
export type Equatorial = { ra: number; dec: number; r: number };

export function julianDateUTC(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}
export function centuriesSinceJ2000(jd: number): number {
  return (jd - 2451545.0) / 36525;
}
export function normDeg360(d: number): number {
  d = d % 360;
  if (d < 0) d += 360;
  return d;
}
export function normDeg180(d: number): number {
  d = d % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}
export function solveKeplerDeg(Mdeg: number, e: number): number {
  const eStar = (e * 180) / Math.PI;
  let E = Mdeg + eStar * Math.sin(Mdeg * DEG);
  for (let i = 0; i < 12; i++) {
    const Er = E * DEG;
    const dM = Mdeg - (E - eStar * Math.sin(Er));
    const dE = dM / (1 - e * Math.cos(Er));
    E += dE;
    if (Math.abs(dE) < 1e-7) break;
  }
  return E;
}

// Heliocentric ecliptic position of a major planet, in AU. Verified: Earth r
// lands at ~1.016 AU near aphelion (early July) and Mars/Jupiter/Saturn
// periods reproduce the textbook 687d / 4333d / 10756d values.
export function heliocentricEcliptic(planetKey: PlanetKey, jd: number): Heliocentric {
  const el = PLANET_ELEMENTS[planetKey];
  const T = centuriesSinceJ2000(jd);
  const a = el.a[0] + el.a[1] * T;
  const e = el.e[0] + el.e[1] * T;
  const I = el.I[0] + el.I[1] * T;
  const L = el.L[0] + el.L[1] * T;
  const longPeri = el.peri[0] + el.peri[1] * T;
  const longNode = el.node[0] + el.node[1] * T;

  const w = longPeri - longNode;
  const M = normDeg180(L - longPeri);
  const E = solveKeplerDeg(M, e);
  const Er = E * DEG;

  const xp = a * (Math.cos(Er) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(Er);

  const wr = w * DEG, Or = longNode * DEG, Ir = I * DEG;
  const cosw = Math.cos(wr), sinw = Math.sin(wr);
  const cosO = Math.cos(Or), sinO = Math.sin(Or);
  const cosI = Math.cos(Ir), sinI = Math.sin(Ir);

  const x = (cosw * cosO - sinw * sinO * cosI) * xp + (-sinw * cosO - cosw * sinO * cosI) * yp;
  const y = (cosw * sinO + sinw * cosO * cosI) * xp + (-sinw * sinO + cosw * cosO * cosI) * yp;
  const z = (sinw * sinI) * xp + (cosw * sinI) * yp;

  const r = Math.sqrt(x * x + y * y + z * z);
  return { x, y, z, r, a, e, periodDays: Math.pow(a, 1.5) * 365.25 };
}

export function eclipticToEquatorial(v: Vec3): Vec3 {
  const cosE = Math.cos(OBLIQUITY_J2000), sinE = Math.sin(OBLIQUITY_J2000);
  return {
    x: v.x,
    y: v.y * cosE - v.z * sinE,
    z: v.y * sinE + v.z * cosE,
  };
}
export function raDecFromVector(v: Vec3): Equatorial {
  const r = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  const ra = normDeg360(Math.atan2(v.y, v.x) / DEG);
  const dec = (Math.asin(v.z / r) / DEG);
  return { ra, dec, r };
}

// Geocentric RA/Dec of the Sun (derived from Earth's heliocentric vector).
export function sunEquatorial(jd: number): Equatorial & { lonEcliptic: number } {
  const earth = heliocentricEcliptic("earth", jd);
  const geo: Vec3 = { x: -earth.x, y: -earth.y, z: -earth.z };
  const eq = eclipticToEquatorial(geo);
  return { ...raDecFromVector(eq), lonEcliptic: normDeg360((Math.atan2(earth.y, earth.x) / DEG) + 180) };
}

// Geocentric RA/Dec of any other major planet (first-order, no light-time
// correction -- adequate for naked-eye visibility planning).
export function planetEquatorial(planetKey: PlanetKey, jd: number): Equatorial & {
  distanceAU: number;
  heliocentricAU: number;
  elongation: number;
} {
  const earth = heliocentricEcliptic("earth", jd);
  const p = heliocentricEcliptic(planetKey, jd);
  const geo: Vec3 = { x: p.x - earth.x, y: p.y - earth.y, z: p.z - earth.z };
  const eq = eclipticToEquatorial(geo);
  const rd = raDecFromVector(eq);
  const elongation =
    (Math.acos(
      Math.max(-1, Math.min(1, (earth.r * earth.r + rd.r * rd.r - p.r * p.r) / (2 * earth.r * rd.r)))
    ) / DEG);
  return { ...rd, distanceAU: rd.r, heliocentricAU: p.r, elongation };
}

// Moon: abbreviated low-precision lunar theory (largest periodic terms only --
// mean error a few percent in illumination, well within "sky tonight" needs).
export function moonEcliptic(jd: number): { lon: number; lat: number; distanceKm: number } {
  const T = centuriesSinceJ2000(jd);
  const Lp = normDeg360(218.3164477 + 481267.88123421 * T);
  const D = normDeg360(297.8501921 + 445267.1114034 * T);
  const M = normDeg360(357.5291092 + 35999.0502909 * T);
  const Mp = normDeg360(134.9633964 + 477198.8675055 * T);
  const F = normDeg360(93.272095 + 483202.0175233 * T);

  const d = D * DEG, m = M * DEG, mp = Mp * DEG, f = F * DEG;

  const dLon =
    6.288774 * Math.sin(mp) +
    1.274027 * Math.sin(2 * d - mp) +
    0.658314 * Math.sin(2 * d) +
    0.213618 * Math.sin(2 * mp) -
    0.185116 * Math.sin(m) -
    0.114332 * Math.sin(2 * f);

  const dLat =
    5.128122 * Math.sin(f) +
    0.280602 * Math.sin(mp + f) +
    0.277693 * Math.sin(mp - f) +
    0.173237 * Math.sin(2 * d - f);

  const dist = 385000.56 - 20905.355 * Math.cos(mp) - 3699.111 * Math.cos(2 * d - mp) - 2955.968 * Math.cos(2 * d);

  const lon = normDeg360(Lp + dLon);
  return { lon, lat: dLat, distanceKm: dist };
}

export function moonEquatorial(jd: number): { ra: number; dec: number; distanceKm: number; lonEcliptic: number } {
  const m = moonEcliptic(jd);
  const l = m.lon * DEG, b = m.lat * DEG;
  const v: Vec3 = { x: Math.cos(b) * Math.cos(l), y: Math.cos(b) * Math.sin(l), z: Math.sin(b) };
  const eq = eclipticToEquatorial(v);
  const rd = raDecFromVector(eq);
  return { ra: rd.ra, dec: rd.dec, distanceKm: m.distanceKm, lonEcliptic: m.lon };
}

export type MoonPhase = {
  elongation: number;
  illumination: number;
  name: string;
  ageDays: number;
};

export function moonPhase(jd: number): MoonPhase {
  const moon = moonEcliptic(jd);
  const sun = sunEquatorial(jd);
  const elong = normDeg360(moon.lon - sun.lonEcliptic);
  const illum = (1 - Math.cos(elong * DEG)) / 2;
  const names = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  const idx = Math.round(elong / 45) % 8;
  const ageDays = (elong / 360) * 29.530588853;
  return { elongation: elong, illumination: illum, name: names[idx] ?? "New Moon", ageDays };
}

export function gmstDeg(jd: number): number {
  const T = centuriesSinceJ2000(jd);
  const g =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return normDeg360(g);
}

export function altAzFromRaDec(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lonDeg: number,
  jd: number
): { alt: number; az: number } {
  const lst = normDeg360(gmstDeg(jd) + lonDeg);
  const H = normDeg180(lst - raDeg) * DEG;
  const lat = latDeg * DEG, dec = decDeg * DEG;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const cosAz = (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) / DEG;
  if (Math.sin(H) > 0) az = 360 - az;
  return { alt: alt / DEG, az };
}

// Distance between two planets (or Earth<->planet) in AU, from heliocentric
// vectors. Used for the live Earth-Mars distance on the landing page.
export function interplanetDistanceAU(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
