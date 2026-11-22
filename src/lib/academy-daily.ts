/**
 * Academy daily tasks & lightweight quiz bank (Stage 3).
 * Tasks come from open checklist items first; flashcards fill the rest.
 * Stored only in memory + derived from local workspace data — no extra API.
 */

import type { StudyWorkspace } from "@/lib/study-workspace";
import { dailyPick } from "@/lib/daily";

export type DailyTask = {
  id: string;
  label: string;
  source: "checklist" | "flashcard";
  workspaceId?: string;
  workspaceTitle?: string;
};

export type QuizQuestion = {
  id: string;
  track: "aerospace" | "astronomy" | "aviation" | "general";
  prompt: string;
  choices: string[];
  /** Index into choices */
  answer: number;
  explain: string;
};

/** Seed flashcards when the learner has no open checklist items. */
const FLASHCARD_SEEDS: DailyTask[] = [
  {
    id: "fc-visviva",
    label: "Recall the vis-viva equation and when energy is negative",
    source: "flashcard",
  },
  {
    id: "fc-altimeter",
    label: "Name the cockpit instrument that reports altitude above mean sea level",
    source: "flashcard",
  },
  {
    id: "fc-kepler3",
    label: "State Kepler’s third law for two bodies in a simple form",
    source: "flashcard",
  },
  {
    id: "fc-hohmann",
    label: "Sketch a Hohmann transfer: two burns, elliptical bridge orbit",
    source: "flashcard",
  },
  { id: "fc-avi-instruments", label: "Name the six basic flight instruments and what each one shows", source: "flashcard" },
  { id: "fc-avi-tas", label: "Explain true airspeed and how it differs from indicated airspeed", source: "flashcard" },
  { id: "fc-avi-forces", label: "State the four forces on an aircraft in steady, level flight", source: "flashcard" },
  { id: "fc-avi-stall", label: "Describe what makes a wing stall, in terms of angle of attack", source: "flashcard" },
  { id: "fc-ast-magnitude", label: "Explain the difference between apparent and absolute magnitude", source: "flashcard" },
  { id: "fc-ast-sidereal", label: "Say what a sidereal day measures compared with a solar day", source: "flashcard" },
  { id: "fc-ast-parsec", label: "Define a parsec in one sentence", source: "flashcard" },
  { id: "fc-ast-milankovitch", label: "Name the three Milankovitch cycles that drive long-term climate change", source: "flashcard" },
  { id: "fc-aer-isp", label: "Define specific impulse and give its unit", source: "flashcard" },
  { id: "fc-aer-rocket", label: "Explain the rocket equation in words", source: "flashcard" },
  { id: "fc-aer-lagrange", label: "Describe what a Lagrange point is", source: "flashcard" },
  { id: "fc-aer-wheel", label: "Name the purpose of a reaction wheel on a spacecraft", source: "flashcard" },
  { id: "fc-aer-dv", label: "Explain what a delta-v budget is for a mission", source: "flashcard" },
  { id: "fc-aer-bus", label: "Name the main subsystems of a spacecraft bus", source: "flashcard" },
  { id: "fc-stem-newton2", label: "State Newton's second law and its units", source: "flashcard" },
  { id: "fc-stem-vector", label: "Explain a scalar and a vector, with one example of each", source: "flashcard" },
  { id: "fc-stem-derivative", label: "Define a derivative as a rate of change", source: "flashcard" },
  { id: "fc-stem-accuracy", label: "Explain the difference between accuracy and precision", source: "flashcard" },
  { id: "fc-stem-eigen", label: "Explain what an eigenvalue tells you about a linear transformation", source: "flashcard" },
  { id: "fc-stem-reynolds", label: "Explain what the Reynolds number compares", source: "flashcard" },
  { id: "fc-stem-kepler1", label: "State Kepler's first law", source: "flashcard" },
];

export function buildDailyTasks(workspaces: StudyWorkspace[], limit = 5): DailyTask[] {
  const fromChecklist: DailyTask[] = [];
  for (const w of workspaces) {
    for (const c of w.checklist) {
      if (c.done) continue;
      fromChecklist.push({
        id: `chk-${w.id}-${c.id}`,
        label: c.label,
        source: "checklist",
        workspaceId: w.id,
        workspaceTitle: w.title,
      });
      if (fromChecklist.length >= limit) return fromChecklist;
    }
  }
  const need = limit - fromChecklist.length;
  // Today's flashcards are chosen once for the day, from tasks not used before.
  const todays = dailyPick("flashcards", FLASHCARD_SEEDS, (t) => t.id, limit).items;
  return [...fromChecklist, ...todays.slice(0, Math.max(0, need))];
}

/** Small fixed quiz bank — Stage 3 shell; expand later without schema changes. */
export const QUIZ_BANK: QuizQuestion[] = [
  {
    id: "q-periapsis",
    track: "aerospace",
    prompt: "In a closed two-body orbit, periapsis is the point of…",
    choices: [
      "Highest altitude and lowest speed",
      "Lowest altitude and highest speed",
      "Equal altitude and speed to apoapsis",
      "Zero orbital energy",
    ],
    answer: 1,
    explain:
      "Near periapsis the spacecraft is closest to the central body, so speed is highest for that orbit.",
  },
  {
    id: "q-iss-period",
    track: "astronomy",
    prompt: "Roughly how long does the ISS take to complete one orbit of Earth?",
    choices: ["About 45 minutes", "About 90 minutes", "About 6 hours", "About 24 hours"],
    answer: 1,
    explain: "Low Earth orbit stations complete a circuit roughly every 90 minutes.",
  },
  {
    id: "q-aileron",
    track: "aviation",
    prompt: "Ailerons primarily control which aircraft axis?",
    choices: ["Pitch", "Yaw", "Roll", "Throttle"],
    answer: 2,
    explain: "Ailerons create differential lift on the wings and roll the aircraft.",
  },
  {
    id: "q-delta-v",
    track: "aerospace",
    prompt: "Delta-v (Δv) is best described as…",
    choices: [
      "The mass of propellant on board",
      "A measure of change in velocity a vehicle can impart",
      "The time until atmospheric re-entry",
      "Antenna gain toward Earth",
    ],
    answer: 1,
    explain: "Δv budgets capture how much velocity change maneuvers require, independent of vehicle mass.",
  },
  {
    id: "q-magnitude",
    track: "astronomy",
    prompt: "In the astronomical magnitude scale, a smaller (or more negative) number means the object is…",
    choices: ["Farther away", "Dimmer", "Brighter", "Cooler"],
    answer: 2,
    explain: "The magnitude scale is inverted: brighter objects have smaller magnitudes.",
  },
  {
    id: "q-avi-ias",
    track: "aviation",
    prompt: "Which airspeed is read directly from the pitot-static system, before correction for altitude and temperature?",
    choices: ["True airspeed", "Indicated airspeed", "Ground speed", "Mach number"],
    answer: 1,
    explain: "Indicated airspeed comes straight from the pitot-static system. Correcting it for density gives true airspeed.",
  },
  {
    id: "q-avi-elevator",
    track: "aviation",
    prompt: "Which control surface mainly controls pitch?",
    choices: ["Aileron", "Rudder", "Elevator", "Flap"],
    answer: 2,
    explain: "The elevator on the horizontal tail rotates the aircraft about its lateral axis.",
  },
  {
    id: "q-avi-stall",
    track: "aviation",
    prompt: "What causes a wing to stall?",
    choices: ["Flying too slowly at any angle", "Exceeding the critical angle of attack", "Only high airspeed", "Retracting the flaps"],
    answer: 1,
    explain: "A stall happens when the wing passes its critical angle of attack, whatever the airspeed.",
  },
  {
    id: "q-ast-sun-temp",
    track: "astronomy",
    prompt: "What is the approximate temperature of the Sun's visible surface?",
    choices: ["About 3,000 K", "About 5,800 K", "About 12,000 K", "About 100,000 K"],
    answer: 1,
    explain: "The Sun's photosphere is about 5,800 kelvin.",
  },
  {
    id: "q-ast-ly",
    track: "astronomy",
    prompt: "Which unit is most used for distances to stars beyond the solar system?",
    choices: ["Astronomical unit", "Light-year", "Angstrom", "Nautical mile"],
    answer: 1,
    explain: "The light-year (and the parsec) suits interstellar distances. The astronomical unit suits the solar system.",
  },
  {
    id: "q-ast-phases",
    track: "astronomy",
    prompt: "What causes the phases of the Moon?",
    choices: ["Earth's shadow alone", "The changing angle between the Sun, Earth and Moon", "Clouds in the atmosphere", "The Moon's own light"],
    answer: 1,
    explain: "We see different parts of the sunlit half of the Moon as its position relative to the Sun and Earth changes.",
  },
  {
    id: "q-aer-isp",
    track: "aerospace",
    prompt: "What does specific impulse measure?",
    choices: ["Thrust per unit weight flow of propellant, in seconds", "Engine mass per unit thrust", "Chamber pressure", "Nozzle exit area"],
    answer: 0,
    explain: "Specific impulse is thrust divided by the weight flow of propellant. It is measured in seconds.",
  },
  {
    id: "q-aer-lagrange",
    track: "aerospace",
    prompt: "What is a Lagrange point?",
    choices: [
      "A point where the gravitational and centrifugal effects of two large bodies balance for a smaller body",
      "The best time to launch",
      "A type of rocket nozzle",
      "The closest approach to the Sun",
    ],
    answer: 0,
    explain: "At a Lagrange point, a small body can stay in a fixed position relative to two large bodies.",
  },
  {
    id: "q-aer-wheel",
    track: "aerospace",
    prompt: "What is a reaction wheel used for?",
    choices: ["Generating electrical power", "Changing attitude by exchanging angular momentum", "Cooling instruments", "Storing propellant"],
    answer: 1,
    explain: "Spinning a reaction wheel up or down turns the spacecraft in the opposite direction, which changes its attitude.",
  },
  {
    id: "q-gen-vector",
    track: "general",
    prompt: "Which of these is a vector quantity?",
    choices: ["Mass", "Temperature", "Velocity", "Time"],
    answer: 2,
    explain: "A vector has both magnitude and direction. Velocity has both; mass, temperature and time do not have direction.",
  },
  {
    id: "q-gen-newton2",
    track: "general",
    prompt: "Newton's second law relates force to which two quantities?",
    choices: ["Mass and acceleration", "Mass and velocity", "Energy and time", "Momentum and temperature"],
    answer: 0,
    explain: "F = m a: force equals mass times acceleration.",
  },
  {
    id: "q-gen-derivative",
    track: "general",
    prompt: "What does the derivative of position with respect to time give?",
    choices: ["Acceleration", "Velocity", "Momentum", "Energy"],
    answer: 1,
    explain: "Position changes over time at the rate of velocity, so its derivative is velocity.",
  },
];

/** Today's quiz questions. Not repeated until every question in the bank has been asked once. */
export function pickQuizSet(count = 3): QuizQuestion[] {
  return dailyPick("quiz", QUIZ_BANK, (q) => q.id, count).items;
}
