/**
 * Academy learner profile
 * ----------------------
 * Stores one-time onboarding choices and light study preferences.
 * Today: localStorage keyed per browser.
 * Later: mirror to Supabase profiles.academy_profile JSON when the account API is ready.
 *
 * Does not store secrets. Quiz scores and item-level competency live in a separate
 * module once the assessment engine ships (Stage 3 of the Academy roadmap).
 */

export type AcademyTrackId = "astronomy" | "aerospace" | "aviation" | "stem";

export type JobChoice = {
  trackId: AcademyTrackId;
  jobId: string;
  label: string;
  /** 1 = first choice, 2 = second, 3 = third */
  rank: 1 | 2 | 3;
  technical: boolean;
};

export type AcademyProfile = {
  version: 1;
  /** True after the first-time onboarding modal is completed or dismissed. */
  onboardingComplete: boolean;
  /** Tracks the learner marked as primary interests (order preserved). */
  tracks: AcademyTrackId[];
  /** Optional primary track — used to order cards (primary last in onboarding UI). */
  primaryTrack: AcademyTrackId | null;
  jobs: JobChoice[];
  topics: string[];
  createdAt: number;
  updatedAt: number;
};

const KEY = "stellun:academy-profile-v1";

export const TRACKS: {
  id: AcademyTrackId;
  label: string;
  blurb: string;
}[] = [
  {
    id: "astronomy",
    label: "Astronomy",
    blurb: "Sky, stars, orbital motion, and observational practice",
  },
  {
    id: "aerospace",
    label: "Aerospace",
    blurb: "Spacecraft, propulsion, mission design, and systems",
  },
  {
    id: "aviation",
    label: "Aviation",
    blurb: "Flight, aircraft systems, and atmospheric operations",
  },
  {
    id: "stem",
    label: "STEM foundations",
    blurb: "Math, physics, and shared tools across the tracks",
  },
];

/** Roles curated from civil/SOC/FAA/EASA/astronomy tracks (learner-facing labels). */
export const TRACK_JOBS: Record<
  AcademyTrackId,
  { id: string; label: string; technical: boolean }[]
> = {
  astronomy: [
    { id: "astronomer", label: "Astronomer", technical: true },
    { id: "astrophysicist", label: "Astrophysicist", technical: true },
    { id: "planetary-sci", label: "Planetary scientist", technical: true },
    { id: "space-sci", label: "Space scientist", technical: true },
    { id: "obs-astro", label: "Observational astronomer", technical: true },
    { id: "telescope-op", label: "Telescope / observatory operator", technical: true },
    { id: "data-astro", label: "Astronomy data analyst", technical: true },
    { id: "instr-astro", label: "Astronomical instrument scientist", technical: true },
    { id: "radio-astro", label: "Radio astronomer", technical: true },
    { id: "planetarium", label: "Planetarium director / educator", technical: false },
    { id: "science-comm", label: "Science communicator", technical: false },
    { id: "museum-astro", label: "Science museum educator", technical: false },
    { id: "astro-writer", label: "Astronomy writer / journalist", technical: false },
    { id: "outreach", label: "Public outreach specialist", technical: false },
  ],
  aerospace: [
    { id: "aero-eng", label: "Aerospace engineer", technical: true },
    { id: "astronautical", label: "Astronautical engineer", technical: true },
    { id: "mission-eng", label: "Mission design engineer", technical: true },
    { id: "propulsion", label: "Propulsion engineer", technical: true },
    { id: "systems", label: "Systems engineer", technical: true },
    { id: "gnc-eng", label: "GNC / flight dynamics engineer", technical: true },
    { id: "structures-eng", label: "Structures engineer", technical: true },
    { id: "thermal", label: "Thermal engineer", technical: true },
    { id: "avionics-sp", label: "Spacecraft avionics engineer", technical: true },
    { id: "aero-tech", label: "Aerospace engineering technician", technical: true },
    { id: "flight-ctrl", label: "Spacecraft flight controller", technical: true },
    { id: "ops-planner", label: "Flight operations planner", technical: false },
    { id: "program-mgr", label: "Program / acquisition manager", technical: false },
    { id: "contracts", label: "Contracts / procurement officer", technical: false },
    { id: "space-policy", label: "Space policy analyst", technical: false },
    { id: "space-law", label: "Space / aviation legal counsel", technical: false },
    { id: "qa-space", label: "Quality / mission assurance", technical: true },
    { id: "mfg-aero", label: "Aerospace production specialist", technical: true },
  ],
  aviation: [
    { id: "atp", label: "Airline transport pilot", technical: true },
    { id: "cpl", label: "Commercial pilot", technical: true },
    { id: "ppl-path", label: "Private pilot path", technical: true },
    { id: "heli", label: "Helicopter pilot", technical: true },
    { id: "flight-test", label: "Flight test pilot", technical: true },
    { id: "cfi", label: "Flight instructor (CFI)", technical: true },
    { id: "atc", label: "Air traffic controller", technical: true },
    { id: "dispatcher", label: "Aircraft dispatcher", technical: true },
    { id: "amech", label: "Aircraft mechanic / A&P", technical: true },
    { id: "avionics", label: "Avionics technician", technical: true },
    { id: "uav", label: "Remote pilot (UAS)", technical: true },
    { id: "cabin", label: "Cabin crew / passenger services", technical: false },
    { id: "ops-airline", label: "Airline operations", technical: false },
    { id: "ground-ops", label: "Airport / ground operations", technical: false },
    { id: "safety", label: "Aviation safety specialist", technical: false },
    { id: "training-mgr", label: "Training manager", technical: false },
  ],
  stem: [
    { id: "phys", label: "Applied physicist", technical: true },
    { id: "math", label: "Applied mathematician", technical: true },
    { id: "data-sci", label: "Data scientist (space/aero)", technical: true },
    { id: "software", label: "Scientific software engineer", technical: true },
    { id: "mecheng", label: "Mechanical engineer", technical: true },
    { id: "ee", label: "Electrical / electronics engineer", technical: true },
    { id: "materials", label: "Materials scientist", technical: true },
    { id: "teach", label: "STEM educator", technical: false },
    { id: "curriculum", label: "Curriculum designer", technical: false },
    { id: "lab-tech", label: "Laboratory technician", technical: true },
  ],
};


export const TRACK_TOPICS: Record<AcademyTrackId, string[]> = {
  astronomy: [
    "Orbital mechanics basics",
    "Celestial coordinate systems",
    "Telescopes and detectors",
    "Solar system bodies",
    "Stars and stellar evolution",
  ],
  aerospace: [
    "Two-body problem",
    "Rocket equation",
    "Spacecraft subsystems",
    "Attitude determination",
    "Launch environments",
  ],
  aviation: [
    "Atmosphere and weather",
    "Lift and drag",
    "Flight instruments",
    "Navigation",
    "Airspace structure",
  ],
  stem: [
    "Vectors and frames",
    "Forces and energy",
    "Differential equations intro",
    "Data literacy",
    "Units and uncertainty",
  ],
};

/** Map Academy tracks → existing study-workspace topic seeds / book topics where possible. */
export const TRACK_TO_TOPIC: Record<AcademyTrackId, string> = {
  astronomy: "orbital-mechanics",
  aerospace: "systems",
  aviation: "aerodynamics",
  stem: "orbital-mechanics",
};

function emptyProfile(): AcademyProfile {
  const now = Date.now();
  return {
    version: 1,
    onboardingComplete: false,
    tracks: [],
    primaryTrack: null,
    jobs: [],
    topics: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function readAcademyProfile(): AcademyProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw) as AcademyProfile;
    if (!parsed || parsed.version !== 1) return emptyProfile();
    return parsed;
  } catch {
    return emptyProfile();
  }
}

export function writeAcademyProfile(patch: Partial<AcademyProfile>): AcademyProfile {
  const current = readAcademyProfile();
  const next: AcademyProfile = {
    ...current,
    ...patch,
    version: 1,
    updatedAt: Date.now(),
    createdAt: current.createdAt || Date.now(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}

export function completeOnboarding(input: {
  tracks: AcademyTrackId[];
  primaryTrack: AcademyTrackId | null;
  jobs: JobChoice[];
  topics: string[];
}): AcademyProfile {
  return writeAcademyProfile({
    onboardingComplete: true,
    tracks: input.tracks,
    primaryTrack: input.primaryTrack,
    jobs: input.jobs.slice(0, 12),
    topics: input.topics.slice(0, 40),
  });
}
