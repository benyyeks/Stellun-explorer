// STELLUN Deep Space: browser-only 3D solar system (three.js via
// react-three-fiber). Loaded exclusively through React.lazy behind a
// client-only gate in src/routes/deepspace.tsx; never import this module
// from an SSR path.
//
// Coordinates: heliocentric ecliptic vectors from the JPL Keplerian
// elements engine (src/lib/astronomy.ts) are mapped to the scene with
// ecliptic X -> scene X, ecliptic Z -> -scene Y (scene up), ecliptic Y ->
// scene Z. Orbital distances are to scale at 1 AU = SCALE units; body sizes
// are enlarged for visibility. Probe markers use JPL Horizons-anchored
// positions with the documented physics fallback from src/lib/satellite.ts.

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Line, Html, useTexture } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  DEG,
  PLANET_ELEMENTS,
  PLANET_ORDER,
  heliocentricEcliptic,
  julianDateUTC,
  type PlanetKey,
  type Vec3,
} from "@/lib/astronomy";
import {
  PROBE_ANCHORS,
  probeFallbackDistanceAU,
  probeIllustrativePositionAU,
  type ProbeKey,
} from "@/lib/satellite";

const SCALE = 12; // scene units per AU
const PROBE_KEYS = Object.keys(PROBE_ANCHORS) as ProbeKey[];
const SUN_RADIUS = 3.2; // enlarged far beyond true scale for visibility
const SUN_GLOW_SCALE = 1.25;

export type SceneSelection =
  | { kind: "planet"; key: PlanetKey }
  | { kind: "probe"; key: ProbeKey }
  | { kind: "sun" };

function toScene(v: Vec3): [number, number, number] {
  return [v.x * SCALE, v.z * SCALE, -v.y * SCALE];
}

function planetVisualRadius(radiusKm: number): number {
  return Math.min(3.4, Math.max(0.55, Math.pow(radiusKm / 6371, 0.6) * 1.15));
}

// Probes whose true positions fall inside the enlarged body visuals (Parker
// at perihelion sits 0.55 scene units from the Sun's center while the Sun
// renders 4 units wide; JWST sits 0.12 units from Earth). Markers are pushed
// radially outward to the body surface so they never render inside a body.
// Display-only: telemetry and distances keep the true values.
const PROBE_CLEARANCE: Partial<Record<ProbeKey, { center: "sun" | PlanetKey; minDist: number }>> = {
  parkersolarprobe: { center: "sun", minDist: SUN_RADIUS * SUN_GLOW_SCALE + 1.4 },
  jwst: { center: "earth", minDist: planetVisualRadius(PLANET_ELEMENTS.earth.radiusKm) + 1.7 },
  roman: { center: "earth", minDist: planetVisualRadius(PLANET_ELEMENTS.earth.radiusKm) + 2.4 },
  juno: { center: "jupiter", minDist: planetVisualRadius(PLANET_ELEMENTS.jupiter.radiusKm) + 1.7 },
};

const scratchCenter = new THREE.Vector3();

function clampOutsideBody(pos: THREE.Vector3, rule: { center: "sun" | PlanetKey; minDist: number }, jd: number) {
  if (rule.center === "sun") {
    scratchCenter.set(0, 0, 0);
  } else {
    const c = toScene(heliocentricEcliptic(rule.center, jd));
    scratchCenter.set(c[0], c[1], c[2]);
  }
  const d = pos.distanceTo(scratchCenter);
  if (d >= rule.minDist) return;
  if (d < 1e-6) {
    pos.set(scratchCenter.x, scratchCenter.y + rule.minDist, scratchCenter.z);
    return;
  }
  pos.sub(scratchCenter).multiplyScalar(rule.minDist / d).add(scratchCenter);
}

function parkerPositionAU(jd: number): Vec3 {
  const p = PROBE_ANCHORS.parkersolarprobe;
  if (p.kind !== "orbit-sun") return { x: 0, y: 0, z: 0 };
  const a = (p.perihelionAU + p.aphelionAU) / 2;
  const e = (p.aphelionAU - p.perihelionAU) / (p.aphelionAU + p.perihelionAU);
  const theta = (((jd * 360) / p.periodDays) % 360) * DEG;
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
  return { x: r * Math.cos(theta), y: r * Math.sin(theta), z: 0 };
}

function probePositionAU(key: ProbeKey, jd: number, now: Date): Vec3 | null {
  if (key === "parkersolarprobe") return parkerPositionAU(jd);
  const earth = heliocentricEcliptic("earth", jd);
  if (key === "jwst" || key === "roman") {
    const r = Math.sqrt(earth.x ** 2 + earth.y ** 2 + earth.z ** 2) || 1;
    const k = 1 + 0.01 / r; // roughly 1.5 million km beyond Earth, at the Sun-Earth L2 point
    const base = { x: earth.x * k, y: earth.y * k, z: earth.z * k };
    // Webb and Roman both work from the Sun-Earth L2 region, but they travel
    // their own wide loops around that point rather than sitting on it. Each
    // loop gets its own width and phase so the two observatories are shown at
    // separate places instead of on top of one another.
    const halo = key === "jwst" ? { radiusAU: 0.0055, phaseDeg: 0, tiltAU: 0.0018, periodDays: 180 } : { radiusAU: 0.0034, phaseDeg: 140, tiltAU: 0.0011, periodDays: 170 };
    const ang = (((jd * 360) / halo.periodDays) % 360) * DEG + halo.phaseDeg * DEG;
    // Unit vector perpendicular to the Sun-Earth line, inside the ecliptic.
    const px = -earth.y / r;
    const py = earth.x / r;
    return {
      x: base.x + px * halo.radiusAU * Math.cos(ang),
      y: base.y + py * halo.radiusAU * Math.cos(ang),
      z: base.z + halo.tiltAU * Math.sin(ang),
    };
  }
  if (key === "juno") {
    const jup = heliocentricEcliptic("jupiter", jd);
    return { x: jup.x + 0.02, y: jup.y, z: jup.z + 0.015 };
  }
  return probeIllustrativePositionAU(key, now);
}

type SystemProps = {
  jdRef: React.MutableRefObject<number>;
  positionsRef: React.MutableRefObject<Record<string, THREE.Vector3>>;
  selected: SceneSelection | null;
  onSelect: (s: SceneSelection | null) => void;
};

function Sun({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <group>
      <mesh
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <sphereGeometry args={[SUN_RADIUS, 48, 48]} />
        <meshBasicMaterial color="#ffc766" />
      </mesh>
      <mesh scale={SUN_GLOW_SCALE}>
        <sphereGeometry args={[SUN_RADIUS, 32, 32]} />
        <meshBasicMaterial
          color="#ff9d3d"
          transparent
          opacity={0.18}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight intensity={2.4} decay={0} distance={0} color="#fff1d6" />
      <Html center zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
        <div className={`scene-label ${selected ? "scene-label-selected" : ""}`}>SUN</div>
      </Html>
    </group>
  );
}

function Planets({ jdRef, positionsRef, selected, onSelect }: SystemProps) {
  const groupsRef = useRef<Record<string, THREE.Group | null>>({});
  const textures = useTexture(["/textures/earth-blue-marble.jpg"]) as THREE.Texture[];
  const earthMap = textures[0]!;
  useEffect(() => {
    earthMap.colorSpace = THREE.SRGBColorSpace;
    earthMap.needsUpdate = true;
  }, [earthMap]);

  // Orbit paths are sampled once at mount; over a viewing session the drift
  // of the true path relative to the drawn one is far below a pixel.
  const orbits = useMemo(() => {
    const jd0 = jdRef.current;
    const out: Record<string, [number, number, number][]> = {};
    for (const key of PLANET_ORDER) {
      const a = heliocentricEcliptic(key, jd0).a;
      const pts: [number, number, number][] = [];
      const n = 220;
      for (let i = 0; i <= n; i++) {
        pts.push(toScene(heliocentricEcliptic(key, jd0 - a * 365.25 / 2 + (i / n) * a * 365.25)));
      }
      out[key] = pts;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    const jd = jdRef.current;
    for (const key of PLANET_ORDER) {
      const g = groupsRef.current[key];
      if (!g) continue;
      const pos = toScene(heliocentricEcliptic(key, jd));
      g.position.set(pos[0], pos[1], pos[2]);
      positionsRef.current[key] = positionsRef.current[key] ?? new THREE.Vector3();
      positionsRef.current[key]!.set(pos[0], pos[1], pos[2]);
    }
  });

  return (
    <>
      {PLANET_ORDER.map((key) => {
        const el = PLANET_ELEMENTS[key];
        const r = planetVisualRadius(el.radiusKm);
        const isSelected = selected?.kind === "planet" && selected.key === key;
        return (
          <group key={key}>
            <Line
              points={orbits[key]!}
              color={key === "earth" ? "#5d84c8" : "#55618a"}
              lineWidth={1}
              transparent
              opacity={isSelected ? 0.75 : 0.35}
            />
            <group
              ref={(g) => {
                groupsRef.current[key] = g;
              }}
            >
              <mesh
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelect({ kind: "planet", key });
                }}
              >
                <sphereGeometry args={[r, 32, 32]} />
                {key === "earth" ? (
                  <meshStandardMaterial map={earthMap} roughness={0.85} metalness={0.05} />
                ) : (
                  <meshStandardMaterial
                    color={el.color}
                    roughness={0.9}
                    metalness={0.05}
                    emissive={el.color}
                    emissiveIntensity={0.12}
                  />
                )}
              </mesh>
              {key === "saturn" && (
                <mesh rotation={[Math.PI / 2.4, 0, 0]}>
                  <ringGeometry args={[r * 1.5, r * 2.4, 64]} />
                  <meshBasicMaterial
                    color="#cdbd92"
                    transparent
                    opacity={0.5}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              )}
              <Html center zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
                <div className={`scene-label ${isSelected ? "scene-label-selected" : ""}`}>
                  {key.toUpperCase()}
                </div>
              </Html>
            </group>
          </group>
        );
      })}
    </>
  );
}

function Probes({ jdRef, positionsRef, selected, onSelect }: SystemProps) {
  const groupsRef = useRef<Record<string, THREE.Group | null>>({});
  useFrame(() => {
    const jd = jdRef.current;
    const now = new Date();
    for (const key of PROBE_KEYS) {
      const g = groupsRef.current[key];
      const pos = probePositionAU(key, jd, now);
      if (!g || !pos) continue;
      const [x, y, z] = toScene(pos);
      const v = positionsRef.current[`probe:${key}`] ?? new THREE.Vector3();
      v.set(x, y, z);
      const rule = PROBE_CLEARANCE[key];
      if (rule) clampOutsideBody(v, rule, jd);
      g.position.copy(v);
      positionsRef.current[`probe:${key}`] = v;
    }
  });
  return (
    <>
      {PROBE_KEYS.map((key) => {
        const anchor = PROBE_ANCHORS[key];
        const isSelected = selected?.kind === "probe" && selected.key === key;
        return (
          <group
            key={key}
            ref={(g) => {
              groupsRef.current[key] = g;
            }}
          >
            <mesh
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect({ kind: "probe", key });
              }}
            >
              <octahedronGeometry args={[isSelected ? 1.5 : 1.0]} />
              <meshBasicMaterial color={isSelected ? "#ffd489" : "#e8ecf5"} wireframe />
            </mesh>
            <Html center zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
              <div className={`scene-label ${isSelected ? "scene-label-selected" : ""}`}>
                {anchor.name.toUpperCase()}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

function CameraRig({
  controlsRef,
  positionsRef,
  focusRequest,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  positionsRef: React.MutableRefObject<Record<string, THREE.Vector3>>;
  focusRequest: { key: string | null; nonce: number };
}) {
  const pendingRef = useRef<{ key: string | null; nonce: number } | null>(null);
  useEffect(() => {
    pendingRef.current = focusRequest;
  }, [focusRequest]);

  useFrame(({ camera }) => {
    const pending = pendingRef.current;
    const controls = controlsRef.current;
    if (!pending || !controls) return;
    if (pending.key === null) {
      camera.position.set(0, 85, 210);
      controls.target.set(0, 0, 0);
      controls.update();
      pendingRef.current = null;
      return;
    }
    const pos =
      pending.key === "sun" ? new THREE.Vector3(0, 0, 0) : positionsRef.current[pending.key];
    if (!pos) return; // wait until the first frame places the object
    const dist = pending.key === "sun" ? 20 : pending.key.startsWith("probe:voyager") || pending.key === "probe:newhorizons" ? 200 : 30;
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(0.3, 0.35, 1);
    dir.normalize();
    controls.target.copy(pos);
    camera.position.copy(pos.clone().add(dir.multiplyScalar(dist)));
    controls.update();
    pendingRef.current = null;
  });
  return null;
}

export type SolarSystemProps = {
  playing: boolean;
  daysPerSecond: number;
  selected: SceneSelection | null;
  focusRequest: { key: string | null; nonce: number };
  /** Incremented by the page to snap the simulated clock back to the real date. */
  resetClockNonce?: number;
  onSelect: (s: SceneSelection | null) => void;
  onTick: (jd: number) => void;
};

export default function SolarSystemScene({
  playing,
  daysPerSecond,
  selected,
  focusRequest,
  resetClockNonce = 0,
  onSelect,
  onTick,
}: SolarSystemProps) {
  const jdRef = useRef(julianDateUTC(new Date()));
  const positionsRef = useRef<Record<string, THREE.Vector3>>({});
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const playingRef = useRef(playing);
  const speedRef = useRef(daysPerSecond);
  const lastReportRef = useRef(0);
  playingRef.current = playing;
  speedRef.current = daysPerSecond;

  // Snap the simulated clock back to the real current moment on request. The
  // clock runs faster than real time, so a session left open drifts years
  // ahead; this returns the model to today without a page reload.
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const lastNonceRef = useRef(resetClockNonce);
  useEffect(() => {
    if (lastNonceRef.current === resetClockNonce) return;
    lastNonceRef.current = resetClockNonce;
    jdRef.current = julianDateUTC(new Date());
    lastReportRef.current = 0;
    onTickRef.current(jdRef.current);
  }, [resetClockNonce]);

  return (
    <Canvas
      camera={{ position: [0, 85, 210], fov: 40, near: 0.5, far: 15000 }}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={["#03050c"]} />
      <ambientLight intensity={0.22} />
      <Stars radius={6000} depth={800} count={7000} factor={40} saturation={0} fade speed={0.3} />
      <ClockAdvance jdRef={jdRef} playingRef={playingRef} speedRef={speedRef} lastReportRef={lastReportRef} onTick={onTick} />
      <Sun
        selected={selected?.kind === "sun"}
        onSelect={() => onSelect({ kind: "sun" })}
      />
      <Suspense fallback={null}>
        <Planets jdRef={jdRef} positionsRef={positionsRef} selected={selected} onSelect={onSelect} />
      </Suspense>
      <Probes jdRef={jdRef} positionsRef={positionsRef} selected={selected} onSelect={onSelect} />
      <CameraRig controlsRef={controlsRef} positionsRef={positionsRef} focusRequest={focusRequest} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={4200}
      />
    </Canvas>
  );
}

function ClockAdvance({
  jdRef,
  playingRef,
  speedRef,
  lastReportRef,
  onTick,
}: {
  jdRef: React.MutableRefObject<number>;
  playingRef: React.MutableRefObject<boolean>;
  speedRef: React.MutableRefObject<number>;
  lastReportRef: React.MutableRefObject<number>;
  onTick: (jd: number) => void;
}) {
  useFrame((_, delta) => {
    if (playingRef.current) {
      jdRef.current += (delta * speedRef.current) / 1; // daysPerSecond is days per real second
    }
    const now = performance.now();
    if (now - lastReportRef.current > 500) {
      lastReportRef.current = now;
      onTick(jdRef.current);
    }
  });
  return null;
}
