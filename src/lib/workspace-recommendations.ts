/**
 * Recommended workspaces: starter topics a learner can create in one tap.
 * Each one points at books from the catalogue, so the workspace opens with real reading.
 */

import type { CatalogTrack } from "@/lib/book-catalog";
import { findBook } from "@/lib/book-catalog";
import type { LearningMode } from "@/lib/study-workspace";

export type WorkspaceTemplate = {
  id: string;
  title: string;
  track: CatalogTrack | "general";
  topicId: string;
  learningMode: LearningMode;
  blurb: string;
  goals: string;
  bookIds: string[];
};

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  { id: "how-aircraft-fly", title: "How aircraft fly", track: "aviation", topicId: "aerodynamics", learningMode: "beginner", blurb: "Lift, drag and control, explained from the start.", goals: "Explain lift, drag and control clearly, with examples.", bookIds: ["anderson-intro-flight", "faa-phak"] },
  { id: "aircraft-stability-control", title: "Aircraft stability and control", track: "aviation", topicId: "aerodynamics", learningMode: "intermediate", blurb: "How an airframe responds to controls and disturbances.", goals: "Understand longitudinal and lateral stability.", bookIds: ["etkin-reid-dynamics-of-flight", "phillips-mechanics-of-flight"] },
  { id: "aircraft-performance", title: "Aircraft performance and design", track: "aviation", topicId: "aerodynamics", learningMode: "intermediate", blurb: "Takeoff, climb, range and sizing an aircraft.", goals: "Calculate range and climb performance for a real aircraft.", bookIds: ["anderson-aircraft-performance", "anderson-aerodynamics"] },
  { id: "compressible-flow", title: "Compressible flow and shock waves", track: "aerospace", topicId: "aerodynamics", learningMode: "advanced", blurb: "High-speed flow, shocks and nozzles.", goals: "Work with normal and oblique shocks and nozzle flow.", bookIds: ["anderson-modern-compressible-flow", "anderson-aerodynamics"] },
  { id: "orbital-foundations", title: "Orbital mechanics foundations", track: "aerospace", topicId: "orbital-mechanics", learningMode: "beginner", blurb: "How spacecraft move under gravity.", goals: "Describe orbits with the orbital elements and compute a simple transfer.", bookIds: ["bate-fundamentals", "curtis-orbital-mechanics"] },
  { id: "rocket-propulsion", title: "Rocket propulsion basics", track: "aerospace", topicId: "propulsion", learningMode: "intermediate", blurb: "Thrust, specific impulse and propellants.", goals: "Calculate thrust and specific impulse for a rocket engine.", bookIds: ["sutton-rocket-propulsion", "turner-rocket-propulsion", "hill-peterson-propulsion"] },
  { id: "spacecraft-systems", title: "Spacecraft systems and missions", track: "aerospace", topicId: "systems", learningMode: "intermediate", blurb: "From mission requirements to subsystem budgets.", goals: "Trace a mission requirement through to the subsystem budgets.", bookIds: ["wertz-larson-smad", "fortescue-systems", "sellers-understanding-space"] },
  { id: "attitude-control", title: "Attitude determination and control", track: "aerospace", topicId: "gnc", learningMode: "advanced", blurb: "Sensors, estimation and pointing control.", goals: "Design a simple attitude estimator and controller.", bookIds: ["markley-crassidis-attitude", "wie-space-vehicle"] },
  { id: "spacecraft-structures", title: "Spacecraft structures and environment", track: "aerospace", topicId: "structures", learningMode: "intermediate", blurb: "Loads, launch vibration and the space environment.", goals: "Describe the launch loads and environmental effects a structure must survive.", bookIds: ["sarafin-structures", "hastings-garrett-environment"] },
  { id: "night-sky", title: "Night sky and observing", track: "astronomy", topicId: "orbital-mechanics", learningMode: "beginner", blurb: "Find constellations and planets, then keep a log.", goals: "Identify ten objects in the night sky and keep an observing log.", bookIds: ["consolmagno-turn-left-orion", "sagan-cosmos"] },
  { id: "stars-and-cosmology", title: "Stars and cosmology", track: "astronomy", topicId: "orbital-mechanics", learningMode: "intermediate", blurb: "Stellar structure, galaxies and the expanding universe.", goals: "Explain how stars work and how the universe is measured.", bookIds: ["carroll-ostlie-astrophysics", "birney-observational-astronomy"] },
  { id: "calculus-physics", title: "Calculus and physics for engineers", track: "stem", topicId: "systems", learningMode: "beginner", blurb: "The maths and mechanics every engineer needs.", goals: "Solve standard calculus and dynamics problems confidently.", bookIds: ["stewart-calculus", "serway-jewett-physics", "hibbeler-dynamics"] },
  { id: "stories-of-space-and-flight", title: "Stories of space and flight", track: "general", topicId: "orbital-mechanics", learningMode: "beginner", blurb: "Non-technical reading on the people and decisions behind flight.", goals: "Read three of the stories and note the decisions behind them.", bookIds: ["shetterly-hidden-figures", "kranz-failure-not-option", "wolfe-right-stuff"] },
];

export function templateBooks(t: WorkspaceTemplate) {
  return t.bookIds.map(findBook).filter((b): b is NonNullable<ReturnType<typeof findBook>> => b !== undefined);
}
