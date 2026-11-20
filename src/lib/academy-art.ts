/**
 * Picture set for flashcards and games.
 *
 * Each picture is a small original SVG in public/academy-art/<slug>.svg.
 * A card is matched to the picture whose tags appear most often in its text.
 * The same files can move to Supabase Storage later: only artUrl() changes.
 */

export type ArtPiece = { slug: string; label: string; tags: string[] };

export const ACADEMY_ART: ArtPiece[] = [
  { slug: "rocket", label: "Rocket", tags: ["rocket", "launch", "propulsion", "nozzle", "liftoff", "rocketry"] },
  { slug: "satellite", label: "Satellite", tags: ["satellite", "spacecraft", "comms", "communication", "orbiting"] },
  { slug: "saturn", label: "Ringed planet", tags: ["planet", "planets", "saturn", "solar system", "ring", "rings", "astronomy"] },
  { slug: "moon", label: "Moon", tags: ["moon", "lunar", "phases", "night", "tide", "tides"] },
  { slug: "star", label: "Star", tags: ["star", "stars", "stellar", "luminosity", "magnitude", "brightness"] },
  { slug: "telescope", label: "Telescope", tags: ["telescope", "observatory", "observe", "optics", "lens", "observation"] },
  { slug: "galaxy", label: "Galaxy", tags: ["galaxy", "galaxies", "milky way", "cosmos", "universe", "cosmology"] },
  { slug: "blackhole", label: "Black hole", tags: ["black hole", "gravity", "relativity", "spacetime", "singularity"] },
  { slug: "sun", label: "Sun", tags: ["sun", "solar", "sunlight", "radiation", "heliocentric"] },
  { slug: "orbit", label: "Orbit", tags: ["orbit", "orbits", "orbital", "kepler", "ellipse", "trajectory", "transfer", "astrodynamics"] },
  { slug: "airplane", label: "Aircraft", tags: ["aircraft", "airplane", "aviation", "flight", "plane", "fly", "flying"] },
  { slug: "wing", label: "Airfoil and lift", tags: ["wing", "wings", "lift", "airfoil", "aerodynamics", "bernoulli", "pressure"] },
  { slug: "propeller", label: "Propeller", tags: ["propeller", "propellers", "fan", "rotor", "blade", "blades"] },
  { slug: "jetengine", label: "Jet engine", tags: ["jet", "turbine", "compressor", "combustion", "turbofan"] },
  { slug: "gear", label: "Gears", tags: ["gear", "gears", "mechanism", "machine", "engineering", "transmission"] },
  { slug: "circuit", label: "Circuit", tags: ["circuit", "electronics", "avionics", "electrical", "sensor", "sensors", "wiring"] },
  { slug: "compass", label: "Compass", tags: ["navigation", "compass", "heading", "direction", "guidance", "gnc"] },
  { slug: "gauge", label: "Instrument gauge", tags: ["instrument", "instruments", "altimeter", "gauge", "measurement", "dashboard", "cockpit"] },
  { slug: "forces", label: "Forces", tags: ["force", "forces", "vector", "vectors", "drag", "weight", "equilibrium", "balance"] },
  { slug: "graph", label: "Graph", tags: ["graph", "graphs", "equation", "equations", "function", "plot", "data", "math", "calculus"] },
  { slug: "pendulum", label: "Pendulum", tags: ["pendulum", "oscillation", "oscillations", "period", "harmonic", "vibration", "spring"] },
  { slug: "cube", label: "Structure", tags: ["structure", "structures", "materials", "stress", "strength", "frame", "load", "loads"] },
  { slug: "parachute", label: "Parachute", tags: ["parachute", "descent", "entry", "reentry", "landing", "recovery"] },
  { slug: "rover", label: "Rover", tags: ["rover", "mars", "lander", "surface", "exploration", "planetary"] },
  { slug: "astronaut", label: "Astronaut", tags: ["astronaut", "crew", "human", "spacesuit", "life support", "spaceflight"] },
  { slug: "earth", label: "Earth", tags: ["earth", "atmosphere", "climate", "weather", "globe", "geography"] },
  { slug: "wind", label: "Airflow", tags: ["wind", "tunnel", "airflow", "turbulence", "boundary layer", "flow"] },
  { slug: "book", label: "Open book", tags: ["reading", "textbook", "chapter", "theory", "definition", "concept", "concepts", "overview"] },
  { slug: "pencil", label: "Pencil", tags: ["practice", "problems", "exercise", "exercises", "calculation", "calculations", "worked examples"] },
  { slug: "lightbulb", label: "Idea", tags: ["idea", "ideas", "insight", "understand", "key idea", "why"] },
  { slug: "checklist", label: "Checklist", tags: ["checklist", "task", "tasks", "step", "steps", "procedure", "process", "plan"] },
  { slug: "target", label: "Target", tags: ["goal", "goals", "objective", "objectives", "exam", "outcome", "aim", "target"] },
  { slug: "clock", label: "Clock", tags: ["time", "schedule", "timeline", "weekly", "daily", "duration", "session", "sessions"] },
  { slug: "trophy", label: "Trophy", tags: ["mastery", "achievement", "complete", "completed", "success", "progress"] },
  { slug: "puzzle", label: "Puzzle", tags: ["puzzle", "puzzles", "match", "matching", "problem solving", "combine"] },
  { slug: "brain", label: "Memory", tags: ["memory", "recall", "remember", "cognitive", "learn", "learning", "retain"] }
];

export const artUrl = (slug: string): string => `/academy-art/${slug}.svg`;

/** Returns the slug of the picture that best matches the text. */
export function matchArt(text: string, fallback = "book"): string {
  const norm = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  let best = fallback;
  let bestScore = 0;
  for (const piece of ACADEMY_ART) {
    let score = 0;
    for (const tag of piece.tags) {
      const t = tag.toLowerCase();
      if (norm.includes(` ${t} `) || norm.includes(` ${t}s `)) score += t.includes(" ") ? 2 : 1;
    }
    if (score > bestScore) {
      best = piece.slug;
      bestScore = score;
    }
  }
  return best;
}
