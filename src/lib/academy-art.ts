/**
 * Pictures for flashcards.
 *
 * Each picture is a real image from NASA's public-domain collection, saved
 * directly in /public as nasa-<name>.jpg. A card shows the picture whose tags
 * appear most often in the card's text. To add a picture, drop the file in
 * /public and add one entry here.
 */

export type ArtPiece = { slug: string; label: string; src: string; credit: string; tags: string[] };

export const ACADEMY_ART: ArtPiece[] = [
  { slug: "sun", label: "Sun and solar observatory", src: "/nasa-sun.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["sun", "solar", "sunlight", "radiation", "heliocentric", "solar activity"] },
  { slug: "moon", label: "The Moon", src: "/nasa-moon.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["moon", "lunar", "phases", "tide", "tides", "night"] },
  { slug: "mars", label: "Mars", src: "/nasa-mars.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["mars", "martian", "red planet"] },
  { slug: "jupiter", label: "Jupiter", src: "/nasa-jupiter.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["jupiter", "gas giant"] },
  { slug: "saturn", label: "Saturn and its rings", src: "/nasa-saturn.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["saturn", "rings", "ring", "ring system"] },
  { slug: "venus", label: "Venus", src: "/nasa-venus.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["venus"] },
  { slug: "neptune", label: "Neptune", src: "/nasa-neptune.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["neptune", "uranus", "ice giant"] },
  { slug: "pluto", label: "Pluto", src: "/nasa-pluto.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["pluto", "dwarf planet"] },
  { slug: "earth", label: "Earth", src: "/nasa-earth.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["earth", "atmosphere", "climate", "weather", "geography", "planet earth"] },
  { slug: "star-map", label: "Star map", src: "/nasa-star-map.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["star", "stars", "stellar", "magnitude", "brightness", "luminosity", "constellation", "constellations", "star map"] },
  { slug: "europa", label: "Europa, a moon of Jupiter", src: "/nasa-europa.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["europa", "moons", "ice moon"] },
  { slug: "crater", label: "Lunar crater", src: "/nasa-crater.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["crater", "craters", "impact", "impacts"] },
  { slug: "hubble", label: "Hubble Space Telescope", src: "/nasa-hubble.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["hubble", "telescope", "telescopes", "observatory", "observation", "optics", "lens"] },
  { slug: "webb", label: "James Webb Space Telescope", src: "/nasa-webb.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["webb", "infrared", "infrared telescope"] },
  { slug: "iss", label: "International Space Station", src: "/nasa-iss.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["iss", "space station", "orbiting", "orbit", "crew"] },
  { slug: "saturn-v", label: "Saturn V rocket", src: "/nasa-saturn-v.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["rocket", "rockets", "launch", "liftoff", "propulsion", "nozzle", "engine", "engines", "thrust"] },
  { slug: "shuttle", label: "Space Shuttle", src: "/nasa-shuttle.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["shuttle", "orbiter", "reentry", "re entry"] },
  { slug: "lander", label: "Apollo Lunar Module", src: "/nasa-lander.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["lander", "landing", "lunar module", "apollo", "descent"] },
  { slug: "spacesuit", label: "Spacesuit", src: "/nasa-spacesuit.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["spacesuit", "spacesuits", "astronaut", "astronauts", "eva", "life support", "spaceflight", "human"] },
  { slug: "rover", label: "Perseverance rover", src: "/nasa-rover.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["rover", "surface", "exploration", "planetary", "planetary science"] },
  { slug: "solar-sail", label: "Solar sail concept", src: "/nasa-solar-sail.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["solar sail", "light pressure", "photon", "photons"] },
  { slug: "x57", label: "X-57 electric aircraft", src: "/nasa-x57.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["aircraft", "airplane", "aviation", "flight", "plane", "fly", "flying", "electric aircraft", "propeller", "propellers", "wing", "wings", "lift", "airfoil", "aerodynamics"] },
  { slug: "global-hawk", label: "Global Hawk unmanned aircraft", src: "/nasa-global-hawk.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["drone", "drones", "uav", "unmanned", "aircraft", "aviation", "flight"] },
  { slug: "ingenuity", label: "Ingenuity Mars helicopter", src: "/nasa-ingenuity.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["helicopter", "rotor", "rotors", "blade", "blades", "mars helicopter"] },
  { slug: "cockpit", label: "Shuttle flight deck panels", src: "/nasa-cockpit.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["cockpit", "flight deck", "instrument", "instruments", "instrumentation", "gauge", "altimeter", "avionics", "dashboard", "navigation", "control", "controls"] },
  { slug: "wrench", label: "Wrench, a tool", src: "/nasa-wrench.jpg", credit: "NASA, via the NASA-3D-Resources collection (public domain)", tags: ["wrench", "tool", "tools", "engineering", "machine", "mechanism", "gear", "gears", "assembly", "bolt"] }
];

/** Path of a picture, as served from /public. */
export function artSrc(slug: string): string {
  return ACADEMY_ART.find((p) => p.slug === slug)?.src ?? "/nasa-earth.jpg";
}

/** Slug of the picture whose tags best match the text. */
export function matchArt(text: string, fallback = "earth"): string {
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
