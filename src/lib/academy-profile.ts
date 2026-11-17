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

/** Sample roles for onboarding (expand in Stage 2). */
export const TRACK_JOBS: Record<
  AcademyTrackId,
  { id: string; label: string; technical: boolean }[]
> = {
  astronomy: [
    { id: "obs-astro", label: "Observational astronomer", technical: true },
    { id: "data-astro", label: "Astronomy data analyst", technical: true },
    { id: "planetarium", label: "Planetarium educator", technical: false },
    { id: "science-comm", label: "Science communicator", technical: false },
  ],
  aerospace: [
    { id: "mission-eng", label: "Mission design engineer", technical: true },
    { id: "propulsion", label: "Propulsion engineer", technical: true },
    { id: "systems", label: "Systems engineer", technical: true },
    { id: "ops-planner", label: "Flight operations planner", technical: false },
    { id: "policy", label: "Space policy analyst", technical: false },
  ],
  aviation: [
    { id: "pilot", label: "Commercial pilot track", technical: true },
    { id: "avionics", label: "Avionics technician", technical: true },
    { id: "atc", label: "Air traffic services", technical: true },
    { id: "ops", label: "Airline operations", technical: false },
  ],
  stem: [
    { id: "phys", label: "Applied physics", technical: true },
    { id: "math", label: "Applied mathematics", technical: true },
    { id: "teach", label: "STEM educator", technical: false },
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
