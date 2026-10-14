// Verified Mars surface sites (planetocentric lat, east longitude).
// Coordinates from NASA/JPL and published mission reports.
// Status as of late 2026 where publicly reported.

export type MarsSiteStatus = "active" | "ended" | "failed" | "inactive";
export type MarsSiteKind = "rover" | "lander" | "helicopter" | "impact";

export type MarsSite = {
  id: string;
  name: string;
  mission: string;
  agency: string;
  kind: MarsSiteKind;
  status: MarsSiteStatus;
  lat: number;
  lonE: number;
  landed: string;
  region: string;
  note: string;
  discoveries?: string[];
  traverseKm?: number;
  url?: string;
  nasaMapUrl?: string;
};

export function lonToEast(lonE: number): number {
  let x = lonE % 360;
  if (x < 0) x += 360;
  return x;
}

export const KIND_LABEL: Record<MarsSiteKind, string> = {
  rover: "Rover",
  lander: "Lander",
  helicopter: "Helicopter",
  impact: "Failed landing",
};

export const STATUS_COLOR: Record<MarsSiteStatus, string> = {
  active: "#3ecf8e",
  ended: "#9eb0c8",
  failed: "#e07070",
  inactive: "#c9a227",
};

export const MARS_SITES: MarsSite[] = [
  {
    id: "viking-1",
    name: "Viking 1",
    mission: "Viking 1",
    agency: "NASA",
    kind: "lander",
    status: "ended",
    lat: 22.48,
    lonE: 310.03,
    landed: "1976-07-20",
    region: "Chryse Planitia",
    note: "First successful long-duration soft lander on Mars. Surface operations until 1982.",
    discoveries: ["First returned surface images from a soft lander", "Weather and soil measurements"],
    url: "https://science.nasa.gov/mission/viking/",
  },
  {
    id: "viking-2",
    name: "Viking 2",
    mission: "Viking 2",
    agency: "NASA",
    kind: "lander",
    status: "ended",
    lat: 47.97,
    lonE: 134.29,
    landed: "1976-09-03",
    region: "Utopia Planitia",
    note: "Northern plains lander. Last contact April 1980.",
    url: "https://science.nasa.gov/mission/viking/",
  },
  {
    id: "pathfinder",
    name: "Pathfinder / Sojourner",
    mission: "Mars Pathfinder",
    agency: "NASA",
    kind: "rover",
    status: "ended",
    lat: 19.33,
    lonE: 326.45,
    landed: "1997-07-04",
    region: "Ares Vallis",
    note: "First wheeled rover on Mars (Sojourner). Mission ended September 1997.",
    discoveries: ["Demonstrated airbag landing and microrover ops"],
    traverseKm: 0.1,
    url: "https://science.nasa.gov/mission/mars-pathfinder/",
  },
  {
    id: "beagle-2",
    name: "Beagle 2",
    mission: "Mars Express lander",
    agency: "ESA / UK",
    kind: "lander",
    status: "failed",
    lat: 11.53,
    lonE: 90.43,
    landed: "2003-12-25",
    region: "Isidis Planitia",
    note: "Landed intact; solar arrays failed to deploy. No science return.",
    url: "https://www.esa.int/Science_Exploration/Space_Science/Mars_Express",
  },
  {
    id: "spirit",
    name: "Spirit (MER-A)",
    mission: "Mars Exploration Rover",
    agency: "NASA",
    kind: "rover",
    status: "ended",
    lat: -14.57,
    lonE: 175.47,
    landed: "2004-01-04",
    region: "Gusev Crater",
    note: "Stuck at Troy; last contact March 2010.",
    discoveries: ["Volcanic plains and hydrothermal evidence in Gusev"],
    traverseKm: 7.7,
    url: "https://science.nasa.gov/mission/mer-spirit/",
  },
  {
    id: "opportunity",
    name: "Opportunity (MER-B)",
    mission: "Mars Exploration Rover",
    agency: "NASA",
    kind: "rover",
    status: "ended",
    lat: -1.95,
    lonE: 354.47,
    landed: "2004-01-25",
    region: "Meridiani Planum",
    note: "Record endurance; last contact June 2018 after a global dust storm.",
    discoveries: ["Hematite spherules", "Evidence of past liquid water"],
    traverseKm: 45.2,
    url: "https://science.nasa.gov/mission/mer-opportunity/",
  },
  {
    id: "phoenix",
    name: "Phoenix",
    mission: "Phoenix Mars Lander",
    agency: "NASA",
    kind: "lander",
    status: "ended",
    lat: 68.22,
    lonE: 234.25,
    landed: "2008-05-25",
    region: "Vastitas Borealis",
    note: "Polar lander; confirmed water ice. Operations ended late 2008.",
    discoveries: ["Water ice under the surface at the landing site"],
    url: "https://science.nasa.gov/mission/phoenix/",
  },
  {
    id: "curiosity",
    name: "Curiosity (MSL)",
    mission: "Mars Science Laboratory",
    agency: "NASA",
    kind: "rover",
    status: "active",
    lat: -4.59,
    lonE: 137.44,
    landed: "2012-08-06",
    region: "Gale Crater / Mount Sharp",
    note: "Active. Climbing Mount Sharp; sulfate-bearing unit; past 5,000 sols.",
    discoveries: ["Ancient habitable lake environment", "Organic molecules in rock"],
    traverseKm: 32,
    url: "https://science.nasa.gov/mission/msl-curiosity/",
    nasaMapUrl: "https://mars.nasa.gov/msl/mission/where-is-the-rover/",
  },
  {
    id: "schiaparelli",
    name: "Schiaparelli EDM",
    mission: "ExoMars 2016",
    agency: "ESA / Roscosmos",
    kind: "impact",
    status: "failed",
    lat: -2.05,
    lonE: 353.79,
    landed: "2016-10-19",
    region: "Meridiani Planum",
    note: "Descent demo crashed; engineering telemetry recovered.",
    url: "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars",
  },
  {
    id: "insight",
    name: "InSight",
    mission: "InSight",
    agency: "NASA",
    kind: "lander",
    status: "ended",
    lat: 4.5,
    lonE: 135.62,
    landed: "2018-11-26",
    region: "Elysium Planitia",
    note: "Seismology mission; end of mission December 2022.",
    discoveries: ["Marsquakes catalog", "Interior structure constraints"],
    url: "https://science.nasa.gov/mission/insight/",
  },
  {
    id: "perseverance",
    name: "Perseverance",
    mission: "Mars 2020",
    agency: "NASA",
    kind: "rover",
    status: "active",
    lat: 18.45,
    lonE: 77.45,
    landed: "2021-02-18",
    region: "Jezero Crater",
    note: "Active. Sample caching for Mars Sample Return; exploring the Jezero delta.",
    discoveries: ["Ancient river delta deposits", "Organic-bearing rocks", "Oxygen production demo (MOXIE)"],
    traverseKm: 30,
    url: "https://science.nasa.gov/mission/mars-2020-perseverance/",
    nasaMapUrl: "https://mars.nasa.gov/mars2020/mission/where-is-the-rover/",
  },
  {
    id: "ingenuity",
    name: "Ingenuity",
    mission: "Mars 2020 helicopter",
    agency: "NASA",
    kind: "helicopter",
    status: "ended",
    lat: 18.45,
    lonE: 77.45,
    landed: "2021-02-18",
    region: "Jezero Crater",
    note: "First powered flight on another world. Mission ended January 2024 after blade damage.",
    discoveries: ["72 flights demonstrating aerial scouting on Mars"],
    url: "https://science.nasa.gov/mission/mars-2020-perseverance/",
  },
  {
    id: "zhurong",
    name: "Zhurong",
    mission: "Tianwen-1",
    agency: "CNSA",
    kind: "rover",
    status: "inactive",
    lat: 25.1,
    lonE: 109.91,
    landed: "2021-05-14",
    region: "Utopia Planitia",
    note: "China’s first Mars rover. Inactive since mid-2022 after winter.",
    traverseKm: 1.9,
    url: "https://www.cnsa.gov.cn/",
  },
];
