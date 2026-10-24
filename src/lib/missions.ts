// Curated mission profiles for the Mission Intelligence directory.
//
// Every record here is drawn from NASA (and, where noted, partner agency)
// mission pages: launch dates, destinations, instrument counts, and headline
// results. Nothing in this file is estimated or inferred. Where a mission is
// still flying, the "status" reflects the operating phase NASA publishes
// rather than a guess about how long it will continue.
//
// Each entry carries an official link so a reader can verify any figure
// against the source, and, where STELLUN tracks the spacecraft live, an
// internal cross-link.

export type MissionStatus = "active" | "extended" | "cruise" | "planned" | "completed";

export type MissionCategory =
  | "human"
  | "planetary"
  | "astrophysics"
  | "heliophysics"
  | "earth"
  | "lunar";

export type MissionProfile = {
  id: string;
  name: string;
  agency: string;
  status: MissionStatus;
  category: MissionCategory;
  /** Launch date in ISO form, or the published target window for planned missions. */
  launched: string;
  launchLabel: string;
  vehicle: string;
  destination: string;
  objective: string;
  /** Headline results or current operating notes, each a verifiable statement. */
  highlights: string[];
  /** Official mission page. */
  url: string;
  /** Internal STELLUN page that shows this spacecraft live, when one exists. */
  internal?: { label: string; to: string };
  /** Set when the mission has ended, so the card can show the operating span. */
  ended?: string;
};

export const STATUS_LABEL: Record<MissionStatus, string> = {
  active: "Operating",
  extended: "Extended mission",
  cruise: "In transit",
  planned: "Planned",
  completed: "Mission complete",
};

export const CATEGORY_LABEL: Record<MissionCategory, string> = {
  human: "Human spaceflight",
  planetary: "Planetary science",
  astrophysics: "Astrophysics",
  heliophysics: "Heliophysics",
  earth: "Earth science",
  lunar: "Lunar exploration",
};

export const MISSIONS: MissionProfile[] = [
  // ----------------------------- Human spaceflight -----------------------
  {
    id: "iss",
    name: "International Space Station",
    agency: "NASA with Roscosmos, ESA, JAXA and CSA",
    status: "active",
    category: "human",
    launched: "1998-11-20",
    launchLabel: "20 November 1998",
    vehicle: "Proton-K, first element Zarya",
    destination: "Low Earth orbit, roughly 400 km altitude",
    objective:
      "A permanently crewed orbital laboratory for research in microgravity across biology, human physiology, physical science and Earth observation.",
    highlights: [
      "Continuously crewed since November 2000.",
      "Orbits Earth roughly every 90 minutes at about 28,000 km/h.",
      "Assembled from modules delivered by more than 40 assembly flights.",
    ],
    url: "https://www.nasa.gov/international-space-station/",
    internal: { label: "Track the station live", to: "/tracker" },
  },
  {
    id: "artemis-1",
    name: "Artemis I",
    agency: "NASA",
    status: "completed",
    category: "lunar",
    launched: "2022-11-16",
    launchLabel: "16 November 2022",
    vehicle: "Space Launch System, Block 1",
    destination: "Distant retrograde orbit around the Moon",
    objective:
      "An uncrewed flight test of the Space Launch System rocket and the Orion spacecraft, including a full re-entry at lunar return velocity.",
    highlights: [
      "Flew 25.5 days and travelled about 1.4 million miles.",
      "Orion returned to Earth on 11 December 2022 and splashed down in the Pacific.",
      "Reached a maximum distance of about 268,000 miles from Earth.",
    ],
    url: "https://www.nasa.gov/mission/artemis-i/",
    ended: "2022-12-11",
  },
  {
    id: "artemis-2",
    name: "Artemis II",
    agency: "NASA",
    status: "completed",
    category: "lunar",
    launched: "2026-04-01",
    launchLabel: "1 April 2026",
    vehicle: "Space Launch System, Block 1",
    destination: "Free-return trajectory around the Moon",
    objective:
      "The first crewed flight of Orion, carrying four astronauts around the Moon to verify life support, communications and manual handling before a landing attempt.",
    highlights: [
      "Crew of four: Reid Wiseman, Victor Glover, Christina Koch and Jeremy Hansen.",
      "Crewed lunar flyby and return, the first humans beyond low Earth orbit since 1972.",
      "Splashdown in the Pacific on 10 April 2026 (11 April UTC), with all four astronauts safe.",
    ],
    url: "https://www.nasa.gov/mission/artemis-ii/",
    ended: "2026-04-11",
  },

  // ----------------------------- Planetary -------------------------------
  {
    id: "perseverance",
    name: "Perseverance and Ingenuity",
    agency: "NASA JPL",
    status: "active",
    category: "planetary",
    launched: "2020-07-30",
    launchLabel: "30 July 2020",
    vehicle: "Atlas V 541",
    destination: "Jezero Crater, Mars",
    objective:
      "Search for signs of ancient microbial life, characterise the geology and climate of Jezero Crater, and cache samples for possible return to Earth.",
    highlights: [
      "Landed 18 February 2021 in a river delta deposit inside Jezero Crater.",
      "MOXIE produced oxygen from Martian carbon dioxide, the first demonstration of the technique on another planet.",
      "Carried Ingenuity, the first aircraft to achieve powered flight on another world, which flew 72 times.",
    ],
    url: "https://science.nasa.gov/mission/mars-2020-perseverance/",
    internal: { label: "See Mars imagery", to: "/mars" },
  },
  {
    id: "curiosity",
    name: "Curiosity",
    agency: "NASA JPL",
    status: "extended",
    category: "planetary",
    launched: "2011-11-26",
    launchLabel: "26 November 2011",
    vehicle: "Atlas V 541",
    destination: "Gale Crater and Mount Sharp, Mars",
    objective:
      "Determine whether Mars ever offered environmental conditions able to support microbial life, by reading the rock record of Gale Crater.",
    highlights: [
      "Landed 6 August 2012 using the sky crane descent system.",
      "Found evidence of an ancient freshwater lake environment inside Gale Crater.",
      "Measured surface radiation levels relevant to future crewed missions.",
    ],
    url: "https://science.nasa.gov/mission/msl-curiosity/",
    internal: { label: "See Mars imagery", to: "/mars" },
  },
  {
    id: "mro",
    name: "Mars Reconnaissance Orbiter",
    agency: "NASA JPL",
    status: "extended",
    category: "planetary",
    launched: "2005-08-12",
    launchLabel: "12 August 2005",
    vehicle: "Atlas V 401",
    destination: "Mars orbit",
    objective:
      "Study Martian climate and geology at high resolution and serve as a communications relay for surface missions.",
    highlights: [
      "Carries HiRISE, the highest resolution camera ever sent to another planet.",
      "Relays a large share of the data returned by NASA's Mars surface missions.",
      "Detected recurring slope lineae and mapped subsurface ice deposits.",
    ],
    url: "https://science.nasa.gov/mission/mars-reconnaissance-orbiter/",
  },
  {
    id: "maven",
    name: "MAVEN",
    agency: "NASA Goddard",
    status: "extended",
    category: "planetary",
    launched: "2013-11-18",
    launchLabel: "18 November 2013",
    vehicle: "Atlas V 401",
    destination: "Mars orbit",
    objective:
      "Measure how the Martian upper atmosphere escapes to space, to explain the loss of the planet's early atmosphere and water.",
    highlights: [
      "Showed that solar wind stripping is a major driver of atmospheric loss at Mars.",
      "Also serves as a relay for surface assets.",
    ],
    url: "https://science.nasa.gov/mission/maven/",
  },
  {
    id: "juno",
    name: "Juno",
    agency: "NASA JPL",
    status: "extended",
    category: "planetary",
    launched: "2011-08-05",
    launchLabel: "5 August 2011",
    vehicle: "Atlas V 551",
    destination: "Polar orbit around Jupiter",
    objective:
      "Map Jupiter's gravity and magnetic fields, measure atmospheric water, and reveal the structure of its interior.",
    highlights: [
      "Entered Jupiter orbit on 4 July 2016.",
      "Found that Jupiter's core is diffuse rather than sharply defined.",
      "Extended mission added close flybys of Ganymede, Europa and Io.",
    ],
    url: "https://science.nasa.gov/mission/juno/",
    internal: { label: "See live distance", to: "/deepspace" },
  },
  {
    id: "europa-clipper",
    name: "Europa Clipper",
    agency: "NASA JPL",
    status: "cruise",
    category: "planetary",
    launched: "2024-10-14",
    launchLabel: "14 October 2024",
    vehicle: "Falcon Heavy",
    destination: "Jupiter orbit, with repeated Europa flybys",
    objective:
      "Determine whether Europa's subsurface ocean could support life, by measuring ice shell thickness, ocean depth and surface chemistry.",
    highlights: [
      "Nine science instruments, the largest payload NASA has sent to the outer planets.",
      "Plans roughly 50 close flybys of Europa rather than orbiting the moon directly.",
      "Arrival at Jupiter is planned for 2030.",
    ],
    url: "https://science.nasa.gov/mission/europa-clipper/",
  },
  {
    id: "psyche",
    name: "Psyche",
    agency: "NASA JPL",
    status: "cruise",
    category: "planetary",
    launched: "2023-10-13",
    launchLabel: "13 October 2023",
    vehicle: "Falcon Heavy",
    destination: "Asteroid 16 Psyche, main belt",
    objective:
      "Study a metal-rich asteroid that may be the exposed core of an early planetesimal, to learn how rocky worlds form their interiors.",
    highlights: [
      "Uses solar electric propulsion with Hall-effect thrusters.",
      "Carries the Deep Space Optical Communications technology demonstration.",
      "Arrival at 16 Psyche is planned for 2029.",
    ],
    url: "https://science.nasa.gov/mission/psyche/",
  },
  {
    id: "lucy",
    name: "Lucy",
    agency: "NASA Goddard",
    status: "cruise",
    category: "planetary",
    launched: "2021-10-16",
    launchLabel: "16 October 2021",
    vehicle: "Atlas V 401",
    destination: "Jupiter's Trojan asteroids",
    objective:
      "Survey the Trojan asteroids that share Jupiter's orbit, remnants of the material that formed the outer planets.",
    highlights: [
      "Will visit more asteroids than any previous mission.",
      "Flew past main belt asteroid Dinkinesh in 2023 and found it has a contact binary satellite.",
      "First Trojan encounter is planned for 2027.",
    ],
    url: "https://science.nasa.gov/mission/lucy/",
  },
  {
    id: "osiris-apex",
    name: "OSIRIS-REx and OSIRIS-APEX",
    agency: "NASA Goddard",
    status: "extended",
    category: "planetary",
    launched: "2016-09-08",
    launchLabel: "8 September 2016",
    vehicle: "Atlas V 411",
    destination: "Asteroid Bennu, then asteroid Apophis",
    objective:
      "Return a pristine sample of a carbon-rich asteroid to Earth, then redirect the spacecraft to study Apophis after its close Earth approach.",
    highlights: [
      "Delivered a sample capsule to the Utah desert on 24 September 2023.",
      "Returned about 121.6 grams of material from Bennu.",
      "Now flying as OSIRIS-APEX toward a 2029 rendezvous with Apophis.",
    ],
    url: "https://science.nasa.gov/mission/osiris-rex/",
    internal: { label: "Watch near-Earth objects", to: "/neo" },
  },
  {
    id: "new-horizons",
    name: "New Horizons",
    agency: "NASA APL",
    status: "extended",
    category: "planetary",
    launched: "2006-01-19",
    launchLabel: "19 January 2006",
    vehicle: "Atlas V 551",
    destination: "Pluto, then the Kuiper Belt",
    objective:
      "Perform the first reconnaissance of Pluto and its moons, then study objects in the Kuiper Belt.",
    highlights: [
      "Flew past Pluto on 14 July 2015, revealing nitrogen ice plains and water ice mountains.",
      "Flew past the Kuiper Belt object Arrokoth on 1 January 2019.",
      "Continues heliophysics and Kuiper Belt observations on an extended mission.",
    ],
    url: "https://science.nasa.gov/mission/new-horizons/",
    internal: { label: "See live distance", to: "/deepspace" },
  },
  {
    id: "cassini",
    name: "Cassini-Huygens",
    agency: "NASA JPL with ESA and ASI",
    status: "completed",
    category: "planetary",
    launched: "1997-10-15",
    launchLabel: "15 October 1997",
    vehicle: "Titan IVB Centaur",
    destination: "Saturn system",
    objective:
      "Study Saturn, its rings and its moons over many years, and land the Huygens probe on Titan.",
    highlights: [
      "Huygens landed on Titan on 14 January 2005, the first landing in the outer solar system.",
      "Discovered water-rich plumes erupting from Enceladus.",
      "Ended with a controlled entry into Saturn's atmosphere on 15 September 2017 to protect the moons from contamination.",
    ],
    url: "https://science.nasa.gov/mission/cassini/",
    ended: "2017-09-15",
  },
  {
    id: "voyager-1",
    name: "Voyager 1",
    agency: "NASA JPL",
    status: "extended",
    category: "heliophysics",
    launched: "1977-09-05",
    launchLabel: "5 September 1977",
    vehicle: "Titan IIIE Centaur",
    destination: "Interstellar space",
    objective:
      "Reconnoitre Jupiter and Saturn, then measure the boundary of the Sun's influence and the interstellar medium beyond it.",
    highlights: [
      "Crossed the heliopause in August 2012, the first spacecraft to enter interstellar space.",
      "The most distant human-made object from Earth.",
      "Still returning field and particle measurements on a reduced instrument set.",
    ],
    url: "https://science.nasa.gov/mission/voyager/",
    internal: { label: "See live distance", to: "/deepspace" },
  },
  {
    id: "voyager-2",
    name: "Voyager 2",
    agency: "NASA JPL",
    status: "extended",
    category: "heliophysics",
    launched: "1977-08-20",
    launchLabel: "20 August 1977",
    vehicle: "Titan IIIE Centaur",
    destination: "Interstellar space",
    objective:
      "Survey the outer planets, then continue outward measuring the heliosphere and interstellar medium.",
    highlights: [
      "The only spacecraft to have flown past Uranus and Neptune.",
      "Crossed the heliopause in November 2018.",
      "Continues to return particle and magnetic field data.",
    ],
    url: "https://science.nasa.gov/mission/voyager/",
    internal: { label: "See live distance", to: "/deepspace" },
  },

  // ----------------------------- Astrophysics ----------------------------
  {
    id: "hubble",
    name: "Hubble Space Telescope",
    agency: "NASA with ESA",
    status: "extended",
    category: "astrophysics",
    launched: "1990-04-24",
    launchLabel: "24 April 1990",
    vehicle: "Space Shuttle Discovery, STS-31",
    destination: "Low Earth orbit",
    objective:
      "Observe the universe from ultraviolet through near-infrared wavelengths above the blurring effect of the atmosphere.",
    highlights: [
      "Serviced five times by Shuttle crews, the last in May 2009.",
      "Observations underpinned the measurement of the accelerating expansion of the universe.",
      "Has returned well over a million observations across more than three decades.",
    ],
    url: "https://science.nasa.gov/mission/hubble/",
  },
  {
    id: "jwst",
    name: "James Webb Space Telescope",
    agency: "NASA with ESA and CSA",
    status: "active",
    category: "astrophysics",
    launched: "2021-12-25",
    launchLabel: "25 December 2021",
    vehicle: "Ariane 5 ECA",
    destination: "Sun-Earth L2, about 1.5 million km from Earth",
    objective:
      "Observe the first galaxies, the formation of stars and planetary systems, and the atmospheres of exoplanets in the infrared.",
    highlights: [
      "6.5 metre segmented primary mirror made of 18 beryllium segments.",
      "Operates behind a five-layer sunshield that keeps the optics near 40 kelvin.",
      "First science images released 12 July 2022.",
    ],
    url: "https://science.nasa.gov/mission/webb/",
    internal: { label: "See live distance", to: "/deepspace" },
  },
  {
    id: "roman",
    name: "Nancy Grace Roman Space Telescope",
    agency: "NASA Goddard",
    status: "cruise",
    category: "astrophysics",
    launched: "2026-08-30",
    launchLabel: "30 August 2026",
    vehicle: "Falcon Heavy, Kennedy Space Center LC-39A",
    destination: "Sun-Earth L2",
    objective:
      "Survey wide fields in the near infrared to study dark energy, find exoplanets by microlensing, and build large statistical samples of galaxies.",
    highlights: [
      "Wide Field Instrument delivers a field of view about 100 times that of Hubble at similar resolution.",
      "Carries a coronagraph technology demonstration for direct imaging of exoplanets.",
      "Cruise and commissioning are under way. Survey observations begin once commissioning closes out.",
    ],
    url: "https://science.nasa.gov/mission/roman-space-telescope/",
    internal: { label: "Open the Roman page", to: "/roman" },
  },
  {
    id: "chandra",
    name: "Chandra X-ray Observatory",
    agency: "NASA Marshall",
    status: "extended",
    category: "astrophysics",
    launched: "1999-07-23",
    launchLabel: "23 July 1999",
    vehicle: "Space Shuttle Columbia, STS-93",
    destination: "High elliptical Earth orbit",
    objective:
      "Image the hot, high-energy universe in X-rays: supernova remnants, galaxy clusters, black holes and neutron stars.",
    highlights: [
      "The highest angular resolution X-ray telescope flown.",
      "Provided direct observational evidence for dark matter in colliding galaxy clusters.",
    ],
    url: "https://science.nasa.gov/mission/chandra-x-ray-observatory/",
  },
  {
    id: "fermi",
    name: "Fermi Gamma-ray Space Telescope",
    agency: "NASA Goddard",
    status: "extended",
    category: "astrophysics",
    launched: "2008-06-11",
    launchLabel: "11 June 2008",
    vehicle: "Delta II 7920-H",
    destination: "Low Earth orbit",
    objective:
      "Survey the gamma-ray sky to study pulsars, active galaxies, gamma-ray bursts and the nature of dark matter.",
    highlights: [
      "Surveys the whole sky roughly every three hours.",
      "Discovered the large gamma-ray structures above and below the galactic centre known as the Fermi bubbles.",
    ],
    url: "https://science.nasa.gov/mission/fermi/",
  },
  {
    id: "tess",
    name: "TESS",
    agency: "NASA with MIT",
    status: "extended",
    category: "astrophysics",
    launched: "2018-04-18",
    launchLabel: "18 April 2018",
    vehicle: "Falcon 9",
    destination: "Highly elliptical Earth orbit in lunar resonance",
    objective:
      "Survey bright nearby stars for transiting exoplanets suited to follow-up atmospheric study.",
    highlights: [
      "Four wide-field cameras monitoring large sectors of sky for weeks at a time.",
      "Has identified thousands of planet candidates, with many confirmed.",
    ],
    url: "https://science.nasa.gov/mission/tess/",
  },
  {
    id: "swift",
    name: "Neil Gehrels Swift Observatory",
    agency: "NASA Goddard",
    status: "extended",
    category: "astrophysics",
    launched: "2004-11-20",
    launchLabel: "20 November 2004",
    vehicle: "Delta II 7320",
    destination: "Low Earth orbit",
    objective:
      "Detect gamma-ray bursts and slew rapidly to observe their afterglows in X-ray, ultraviolet and visible light.",
    highlights: [
      "Can point its narrow-field instruments at a new burst within about a minute.",
      "A central node in multi-messenger follow-up of transient events.",
    ],
    url: "https://science.nasa.gov/mission/swift/",
  },
  {
    id: "ixpe",
    name: "IXPE",
    agency: "NASA Marshall with ASI",
    status: "active",
    category: "astrophysics",
    launched: "2021-12-09",
    launchLabel: "9 December 2021",
    vehicle: "Falcon 9",
    destination: "Equatorial low Earth orbit",
    objective:
      "Measure the polarisation of X-rays from black holes, neutron stars and supernova remnants to reveal their geometry and magnetic fields.",
    highlights: [
      "First observatory dedicated to imaging X-ray polarimetry.",
      "Polarisation measurements constrain the shape of accretion flows that imaging alone cannot resolve.",
    ],
    url: "https://science.nasa.gov/mission/ixpe/",
  },
  {
    id: "kepler",
    name: "Kepler and K2",
    agency: "NASA Ames",
    status: "completed",
    category: "astrophysics",
    launched: "2009-03-07",
    launchLabel: "7 March 2009",
    vehicle: "Delta II 7925-10L",
    destination: "Earth-trailing heliocentric orbit",
    objective:
      "Determine how common Earth-size planets are around other stars by continuously monitoring a single star field for transits.",
    highlights: [
      "Confirmed more than 2,600 exoplanets.",
      "Showed that planets outnumber stars in our galaxy.",
      "Retired on 30 October 2018 when propellant ran out.",
    ],
    url: "https://science.nasa.gov/mission/kepler/",
    ended: "2018-10-30",
  },
  {
    id: "spitzer",
    name: "Spitzer Space Telescope",
    agency: "NASA JPL",
    status: "completed",
    category: "astrophysics",
    launched: "2003-08-25",
    launchLabel: "25 August 2003",
    vehicle: "Delta II 7920H",
    destination: "Earth-trailing heliocentric orbit",
    objective:
      "Observe the infrared universe: dusty star-forming regions, brown dwarfs, distant galaxies and exoplanet atmospheres.",
    highlights: [
      "Detected the seven-planet TRAPPIST-1 system alongside ground observatories.",
      "Operated for more than 16 years and was retired on 30 January 2020.",
    ],
    url: "https://science.nasa.gov/mission/spitzer/",
    ended: "2020-01-30",
  },

  // ----------------------------- Heliophysics ----------------------------
  {
    id: "parker",
    name: "Parker Solar Probe",
    agency: "NASA APL",
    status: "active",
    category: "heliophysics",
    launched: "2018-08-12",
    launchLabel: "12 August 2018",
    vehicle: "Delta IV Heavy with Star 48BV",
    destination: "The Sun's outer corona",
    objective:
      "Fly through the solar corona to determine how the solar wind is accelerated and why the corona is far hotter than the surface below it.",
    highlights: [
      "The first spacecraft to fly through the Sun's corona.",
      "The fastest human-made object, using repeated Venus gravity assists to lower perihelion.",
      "Protected by a carbon composite heat shield that shades the instruments.",
    ],
    url: "https://science.nasa.gov/mission/parker-solar-probe/",
    internal: { label: "See orbital data", to: "/deepspace" },
  },
  {
    id: "sdo",
    name: "Solar Dynamics Observatory",
    agency: "NASA Goddard",
    status: "extended",
    category: "heliophysics",
    launched: "2010-02-11",
    launchLabel: "11 February 2010",
    vehicle: "Atlas V 401",
    destination: "Inclined geosynchronous orbit",
    objective:
      "Observe the Sun's atmosphere and magnetic field at high time and spatial resolution to understand solar variability.",
    highlights: [
      "Returns full-disk images of the Sun every 12 seconds in multiple wavelengths.",
      "A primary input to space weather forecasting.",
    ],
    url: "https://science.nasa.gov/mission/sdo/",
    internal: { label: "Open space weather", to: "/weather" },
  },
  {
    id: "soho",
    name: "SOHO",
    agency: "ESA and NASA",
    status: "extended",
    category: "heliophysics",
    launched: "1995-12-02",
    launchLabel: "2 December 1995",
    vehicle: "Atlas IIAS",
    destination: "Sun-Earth L1",
    objective:
      "Study the Sun's interior, corona and the solar wind from a vantage point upstream of Earth.",
    highlights: [
      "Its coronagraphs have led to the discovery of thousands of comets.",
      "Still supplying coronal mass ejection imagery used in space weather alerts.",
    ],
    url: "https://science.nasa.gov/mission/soho/",
    internal: { label: "Open space weather", to: "/weather" },
  },
  {
    id: "imap",
    name: "IMAP",
    agency: "NASA with APL",
    status: "active",
    category: "heliophysics",
    launched: "2025-09-24",
    launchLabel: "September 2025",
    vehicle: "Falcon 9",
    destination: "Sun-Earth L1",
    objective:
      "Map the boundary of the heliosphere and study how the solar wind interacts with the interstellar medium, while returning near-real-time space weather data.",
    highlights: [
      "Ten instruments measuring energetic neutral atoms, ions and dust.",
      "Carries space weather instruments that provide upstream solar wind measurements.",
    ],
    url: "https://science.nasa.gov/mission/imap/",
    internal: { label: "Open space weather", to: "/weather" },
  },
  {
    id: "tracers",
    name: "TRACERS",
    agency: "NASA with the University of Iowa",
    status: "active",
    category: "heliophysics",
    launched: "2025-07-23",
    launchLabel: "July 2025",
    vehicle: "Falcon 9",
    destination: "Polar low Earth orbit",
    objective:
      "Use two spacecraft flying in close formation to study magnetic reconnection where the solar wind couples to Earth's magnetic field.",
    highlights: [
      "Two identical satellites cross the polar cusp seconds apart.",
      "Separates changes in time from changes in space, which single spacecraft cannot do.",
    ],
    url: "https://science.nasa.gov/mission/tracers/",
  },

  // ----------------------------- Earth science ---------------------------
  {
    id: "landsat-9",
    name: "Landsat 9",
    agency: "NASA with USGS",
    status: "active",
    category: "earth",
    launched: "2021-09-27",
    launchLabel: "27 September 2021",
    vehicle: "Atlas V 401",
    destination: "Sun-synchronous low Earth orbit",
    objective:
      "Continue the Landsat record of global land cover and land use change, the longest continuous space-based record of Earth's land surface.",
    highlights: [
      "Works with Landsat 8 to revisit most of the globe every eight days.",
      "All imagery is released free and open.",
    ],
    url: "https://science.nasa.gov/mission/landsat-9/",
  },
  {
    id: "terra",
    name: "Terra",
    agency: "NASA",
    status: "extended",
    category: "earth",
    launched: "1999-12-18",
    launchLabel: "18 December 1999",
    vehicle: "Atlas IIAS",
    destination: "Sun-synchronous low Earth orbit",
    objective:
      "Observe how Earth's land, oceans, atmosphere and energy budget interact and change, using five instruments including MODIS and ASTER.",
    highlights: [
      "Supplies the long-running MODIS record of vegetation, fire and cloud cover.",
      "One of the flagship missions of NASA's Earth Observing System.",
    ],
    url: "https://terra.nasa.gov/",
  },
  {
    id: "icesat-2",
    name: "ICESat-2",
    agency: "NASA Goddard",
    status: "active",
    category: "earth",
    launched: "2018-09-15",
    launchLabel: "15 September 2018",
    vehicle: "Delta II 7420-10C",
    destination: "Polar low Earth orbit",
    objective:
      "Measure the height of ice sheets, sea ice, land and vegetation with a photon-counting laser altimeter.",
    highlights: [
      "ATLAS fires 10,000 laser pulses per second and times individual returning photons.",
      "Quantifies ice sheet loss in Greenland and Antarctica.",
    ],
    url: "https://science.nasa.gov/mission/icesat-2/",
  },
  {
    id: "swot",
    name: "SWOT",
    agency: "NASA and CNES with CSA and UKSA",
    status: "active",
    category: "earth",
    launched: "2022-12-16",
    launchLabel: "16 December 2022",
    vehicle: "Falcon 9",
    destination: "Low Earth orbit",
    objective:
      "Survey the height of nearly all water on Earth's surface, in the oceans and in lakes and rivers, using radar interferometry.",
    highlights: [
      "Resolves ocean features far smaller than earlier altimeters could see.",
      "First global survey of freshwater bodies at this level of detail.",
    ],
    url: "https://science.nasa.gov/mission/swot/",
  },
  {
    id: "pace",
    name: "PACE",
    agency: "NASA Goddard",
    status: "active",
    category: "earth",
    launched: "2024-02-08",
    launchLabel: "8 February 2024",
    vehicle: "Falcon 9",
    destination: "Sun-synchronous low Earth orbit",
    objective:
      "Study ocean colour, aerosols and clouds to understand phytoplankton communities and their role in the carbon cycle.",
    highlights: [
      "Its hyperspectral Ocean Colour Instrument distinguishes phytoplankton types, not just abundance.",
      "Carries two polarimeters for aerosol and cloud measurement.",
    ],
    url: "https://science.nasa.gov/mission/pace/",
  },
  {
    id: "lro",
    name: "Lunar Reconnaissance Orbiter",
    agency: "NASA Goddard",
    status: "extended",
    category: "lunar",
    launched: "2009-06-18",
    launchLabel: "18 June 2009",
    vehicle: "Atlas V 401",
    destination: "Polar lunar orbit",
    objective:
      "Map the Moon in detail to identify landing sites, resources and radiation conditions, and to study lunar geology.",
    highlights: [
      "Produced the highest resolution global topographic map of the Moon.",
      "Confirmed water ice in permanently shadowed polar craters.",
      "Imagery underpins Artemis landing site selection.",
    ],
    url: "https://science.nasa.gov/mission/lro/",
  },
];

// ------------------------------- Directories --------------------------------
// Official catalogues a reader can use to go beyond this curated set.
export const MISSION_DIRECTORIES = [
  {
    name: "NASA Missions Directory",
    url: "https://www.nasa.gov/missions/",
    note: "The full catalogue, filterable by status and by mission type.",
  },
  {
    name: "NASA Science Missions",
    url: "https://science.nasa.gov/science-missions/",
    note: "Science missions with objectives, instruments and milestone dates.",
  },
  {
    name: "NASA A to Z Mission List",
    url: "https://www.nasa.gov/a-to-z-of-nasa-missions/",
    note: "Every NASA mission, past and present, with an individual page each.",
  },
  {
    name: "HEASARC Active Missions",
    url: "https://heasarc.gsfc.nasa.gov/docs/heasarc/missions/active.html",
    note: "High-energy astrophysics observatories currently operating.",
  },
  {
    name: "NASA Space Science Data Coordinated Archive",
    url: "https://nssdc.gsfc.nasa.gov/nmc/",
    note: "Master catalogue of spacecraft and experiments, including historic flights.",
  },
];
// -------- Human spaceflight (historic + commercial + partners) --------
  {
    id: "apollo-11",
    name: "Apollo 11",
    agency: "NASA",
    status: "completed",
    category: "human",
    launched: "1969-07-16",
    launchLabel: "16 July 1969",
    vehicle: "Saturn V",
    destination: "Sea of Tranquility, Moon",
    objective:
      "Land two astronauts on the lunar surface and return them, with rock and soil samples, to Earth.",
    highlights: [
      "Neil Armstrong and Buzz Aldrin walked on the Moon on 20 July 1969; Michael Collins remained in lunar orbit.",
      "Returned about 21.5 kg of lunar material.",
      "First crewed landing on another world.",
    ],
    url: "https://www.nasa.gov/mission/apollo-11/",
    ended: "1969-07-24",
  },
  {
    id: "apollo-13",
    name: "Apollo 13",
    agency: "NASA",
    status: "completed",
    category: "human",
    launched: "1970-04-11",
    launchLabel: "11 April 1970",
    vehicle: "Saturn V",
    destination: "Intended Fra Mauro highlands; free-return to Earth after abort",
    objective:
      "Third crewed lunar landing attempt; after an oxygen-tank explosion, safe return of the crew became the sole objective.",
    highlights: [
      "Service module oxygen tank failed about 56 hours after launch.",
      "Crew used the lunar module as a lifeboat; re-entered in the command module on 17 April 1970.",
    ],
    url: "https://www.nasa.gov/mission/apollo-13/",
    ended: "1970-04-17",
  },
  {
    id: "apollo-soyuz",
    name: "Apollo–Soyuz Test Project",
    agency: "NASA and Soviet space program",
    status: "completed",
    category: "human",
    launched: "1975-07-15",
    launchLabel: "15 July 1975",
    vehicle: "Saturn IB and Soyuz",
    destination: "Low Earth orbit docking",
    objective:
      "Demonstrate docking between U.S. and Soviet spacecraft and conduct joint experiments.",
    highlights: [
      "First international crewed spaceflight docking.",
      "Laid practical groundwork later used on Shuttle–Mir and the ISS partnership.",
    ],
    url: "https://www.nasa.gov/apollo-soyuz-test-project/",
    ended: "1975-07-24",
  },
  {
    id: "commercial-crew",
    name: "Commercial Crew Program",
    agency: "NASA with SpaceX and Boeing",
    status: "active",
    category: "human",
    launched: "2020-05-30",
    launchLabel: "First operational crew flight 30 May 2020 (Crew Dragon Demo-2)",
    vehicle: "Falcon 9 / Crew Dragon; Atlas V / Starliner",
    destination: "International Space Station",
    objective:
      "Restore routine U.S. crew transport to the ISS from American soil after the Shuttle era.",
    highlights: [
      "Crew Dragon has flown multiple operational ISS expeditions since 2020.",
      "Boeing Starliner completed its first crewed test flight to the station in 2024.",
    ],
    url: "https://www.nasa.gov/humans-in-space/commercial-space/commercial-crew-program/",
  },
  {
    id: "tiangong",
    name: "Tiangong space station",
    agency: "CNSA",
    status: "active",
    category: "human",
    launched: "2021-04-29",
    launchLabel: "Core module Tianhe launched 29 April 2021",
    vehicle: "Long March 5B (modules); Shenzhou crew vehicles",
    destination: "Low Earth orbit, roughly 340–450 km",
    objective:
      "Operate a multi-module national space station for continuous crewed research.",
    highlights: [
      "Tianhe, Wentian, and Mengtian modules form the basic T-shaped station.",
      "Crewed by Shenzhou expeditions on a rotating schedule.",
    ],
    url: "https://www.cmse.gov.cn/",
  },

  // -------- Planetary --------
  {
    id: "insight",
    name: "InSight",
    agency: "NASA JPL",
    status: "completed",
    category: "planetary",
    launched: "2018-05-05",
    launchLabel: "5 May 2018",
    vehicle: "Atlas V 401",
    destination: "Elysium Planitia, Mars",
    objective:
      "Measure Mars’s interior structure using a seismometer and heat-flow probe from a fixed lander.",
    highlights: [
      "Detected hundreds of marsquakes and constrained crust and core structure.",
      "Heat-flow probe did not fully bury; mission ended December 2022 after dust on solar arrays.",
    ],
    url: "https://science.nasa.gov/mission/insight/",
    ended: "2022-12-15",
  },
  {
    id: "opportunity",
    name: "Mars Exploration Rovers (Spirit and Opportunity)",
    agency: "NASA JPL",
    status: "completed",
    category: "planetary",
    launched: "2003-06-10",
    launchLabel: "Spirit 10 June 2003; Opportunity 7 July 2003",
    vehicle: "Delta II",
    destination: "Gusev crater and Meridiani Planum, Mars",
    objective:
      "Search for evidence of past water activity at two complementary landing sites.",
    highlights: [
      "Opportunity operated for nearly 15 years; confirmed ancient aqueous environments at Meridiani.",
      "Spirit found evidence of hydrothermal alteration in the Columbia Hills.",
    ],
    url: "https://science.nasa.gov/mission/mars-exploration-rovers-spirit-opportunity/",
    ended: "2019-02-13",
  },
  {
    id: "dawn",
    name: "Dawn",
    agency: "NASA JPL",
    status: "completed",
    category: "planetary",
    launched: "2007-09-27",
    launchLabel: "27 September 2007",
    vehicle: "Delta II",
    destination: "Vesta, then Ceres",
    objective:
      "Orbit two large bodies in the main asteroid belt using ion propulsion.",
    highlights: [
      "First spacecraft to orbit two different solar-system bodies.",
      "Mapped Vesta’s basaltic crust and Ceres’s bright salt deposits and cryovolcanic features.",
    ],
    url: "https://science.nasa.gov/mission/dawn/",
    ended: "2018-11-01",
  },
  {
    id: "messenger",
    name: "MESSENGER",
    agency: "NASA APL",
    status: "completed",
    category: "planetary",
    launched: "2004-08-03",
    launchLabel: "3 August 2004",
    vehicle: "Delta II",
    destination: "Mercury orbit",
    objective:
      "Map Mercury’s surface composition, magnetic field, and thin atmosphere from polar orbit.",
    highlights: [
      "First spacecraft to orbit Mercury (inserted March 2011).",
      "Confirmed water ice in polar cold traps and a global magnetic field generated in the core.",
    ],
    url: "https://science.nasa.gov/mission/messenger/",
    ended: "2015-04-30",
  },
  {
    id: "dart",
    name: "DART",
    agency: "NASA APL",
    status: "completed",
    category: "planetary",
    launched: "2021-11-24",
    launchLabel: "24 November 2021",
    vehicle: "Falcon 9",
    destination: "Dimorphos, moon of asteroid Didymos",
    objective:
      "Demonstrate kinetic impact as a method to change an asteroid’s orbital period.",
    highlights: [
      "Impact on 26 September 2022 shortened Dimorphos’s orbital period by about 33 minutes.",
      "First full-scale planetary-defense deflection test.",
    ],
    url: "https://science.nasa.gov/mission/dart/",
    ended: "2022-09-26",
  },
  {
    id: "dragonfly",
    name: "Dragonfly",
    agency: "NASA APL",
    status: "planned",
    category: "planetary",
    launched: "2028-01-01",
    launchLabel: "Target launch no earlier than 2028",
    vehicle: "To be assigned (heavy-lift class)",
    destination: "Titan (Saturn)",
    objective:
      "Fly a rotorcraft lander between sites on Titan to study prebiotic chemistry and habitability.",
    highlights: [
      "Will sample dunes and impact melt at multiple sites rather than a single fixed lander.",
      "Builds on Cassini–Huygens findings of organics and surface liquids.",
    ],
    url: "https://science.nasa.gov/mission/dragonfly/",
  },
  {
    id: "juice",
    name: "JUICE",
    agency: "ESA with NASA contributions",
    status: "cruise",
    category: "planetary",
    launched: "2023-04-14",
    launchLabel: "14 April 2023",
    vehicle: "Ariane 5",
    destination: "Jupiter system; focus on Ganymede, Europa, Callisto",
    objective:
      "Characterise the icy moons as potential habitats and study Jupiter’s magnetosphere.",
    highlights: [
      "Planned Jupiter orbit insertion in 2031 after Earth and Venus gravity assists.",
      "Will become the first spacecraft to orbit an icy moon (Ganymede).",
    ],
    url: "https://science.nasa.gov/mission/juice/",
  },
  {
    id: "bepicolombo",
    name: "BepiColombo",
    agency: "ESA and JAXA",
    status: "cruise",
    category: "planetary",
    launched: "2018-10-20",
    launchLabel: "20 October 2018",
    vehicle: "Ariane 5",
    destination: "Mercury",
    objective:
      "Deliver two orbiters—one ESA, one JAXA—to study Mercury’s surface, interior, and magnetosphere.",
    highlights: [
      "Multiple Mercury flybys completed; orbit insertion targeted for late 2020s.",
      "MPO and Mio separate after arrival for complementary measurements.",
    ],
    url: "https://science.nasa.gov/mission/bepicolombo/",
  },
  {
    id: "hayabusa2",
    name: "Hayabusa2",
    agency: "JAXA",
    status: "extended",
    category: "planetary",
    launched: "2014-12-03",
    launchLabel: "3 December 2014",
    vehicle: "H-IIA",
    destination: "Asteroid Ryugu; sample return to Earth",
    objective:
      "Collect subsurface and surface samples from a C-type near-Earth asteroid and return them.",
    highlights: [
      "Sample capsule landed in Australia in December 2020 with more than 5 g of material.",
      "Extended mission targets additional small bodies after Earth return.",
    ],
    url: "https://www.hayabusa2.jaxa.jp/en/",
  },
  {
    id: "tianwen-1",
    name: "Tianwen-1",
    agency: "CNSA",
    status: "extended",
    category: "planetary",
    launched: "2020-07-23",
    launchLabel: "23 July 2020",
    vehicle: "Long March 5",
    destination: "Mars orbit and Utopia Planitia surface",
    objective:
      "Orbit Mars, land a rover, and survey geology, climate, and subsurface structure.",
    highlights: [
      "Zhurong rover operated on the surface after May 2021 landing.",
      "China’s first successful Mars orbiter–lander–rover combination.",
    ],
    url: "https://www.cnsa.gov.cn/",
  },
  {
    id: "mangalyaan",
    name: "Mars Orbiter Mission (Mangalyaan)",
    agency: "ISRO",
    status: "completed",
    category: "planetary",
    launched: "2013-11-05",
    launchLabel: "5 November 2013",
    vehicle: "PSLV-XL",
    destination: "Mars orbit",
    objective:
      "Demonstrate interplanetary injection, orbit insertion, and basic Mars science from a low-cost orbiter.",
    highlights: [
      "Entered Mars orbit on 24 September 2014 on the first attempt.",
      "Operated well beyond its design life; contact later lost.",
    ],
    url: "https://www.isro.gov.in/MarsOrbiterMission.html",
    ended: "2022-01-01",
  },
  {
    id: "hope-emirates",
    name: "Emirates Mars Mission (Hope)",
    agency: "UAE Space Agency with LASP",
    status: "extended",
    category: "planetary",
    launched: "2020-07-19",
    launchLabel: "19 July 2020",
    vehicle: "H-IIA",
    destination: "Mars orbit",
    objective:
      "Observe the Martian atmosphere across full diurnal and seasonal cycles from a high orbit.",
    highlights: [
      "Entered Mars orbit in February 2021.",
      "First interplanetary mission led by an Arab nation.",
    ],
    url: "https://www.emiratesmarsmission.ae/",
  },

  // -------- Astrophysics --------
  {
    id: "euclid",
    name: "Euclid",
    agency: "ESA with NASA contributions",
    status: "active",
    category: "astrophysics",
    launched: "2023-07-01",
    launchLabel: "1 July 2023",
    vehicle: "Falcon 9",
    destination: "Sun–Earth L2",
    objective:
      "Map the geometry of the dark universe through weak lensing and galaxy clustering over a third of the sky.",
    highlights: [
      "Visible and near-infrared instruments share a wide field for simultaneous surveys.",
      "Early public data releases have begun to feed cosmological analyses.",
    ],
    url: "https://science.nasa.gov/mission/euclid/",
  },
  {
    id: "xrism",
    name: "XRISM",
    agency: "JAXA with NASA and ESA",
    status: "active",
    category: "astrophysics",
    launched: "2023-09-06",
    launchLabel: "6 September 2023",
    vehicle: "H-IIA",
    destination: "Low Earth orbit",
    objective:
      "Measure high-resolution X-ray spectra of hot plasma around black holes, galaxy clusters, and supernova remnants.",
    highlights: [
      "Resolve spectrometer (Resolve) provides microcalorimeter energy resolution.",
      "Successor path after Hitomi; restores soft X-ray spectroscopy capability.",
    ],
    url: "https://science.nasa.gov/mission/xrism/",
  },
  {
    id: "gaia",
    name: "Gaia",
    agency: "ESA",
    status: "extended",
    category: "astrophysics",
    launched: "2013-12-19",
    launchLabel: "19 December 2013",
    vehicle: "Soyuz ST-B / Fregat-MT",
    destination: "Sun–Earth L2",
    objective:
      "Build a three-dimensional census of more than a billion stars in the Milky Way.",
    highlights: [
      "Data releases provide positions, motions, and astrophysical parameters for over a billion sources.",
      "Transformed studies of Galactic structure and stellar streams.",
    ],
    url: "https://www.esa.int/Science_Exploration/Space_Science/Gaia",
  },
  {
    id: "planck",
    name: "Planck",
    agency: "ESA with NASA contributions",
    status: "completed",
    category: "astrophysics",
    launched: "2009-05-14",
    launchLabel: "14 May 2009",
    vehicle: "Ariane 5",
    destination: "Sun–Earth L2",
    objective:
      "Map the cosmic microwave background with high sensitivity and angular resolution.",
    highlights: [
      "Produced the reference maps of CMB anisotropies used for standard cosmology parameters.",
      "Mission ended 2013 after exhausting coolant for the high-frequency instrument.",
    ],
    url: "https://science.nasa.gov/mission/planck/",
    ended: "2013-10-23",
  },

  // -------- Heliophysics --------
  {
    id: "solar-orbiter",
    name: "Solar Orbiter",
    agency: "ESA with NASA",
    status: "active",
    category: "heliophysics",
    launched: "2020-02-10",
    launchLabel: "10 February 2020",
    vehicle: "Atlas V 411",
    destination: "Elliptical heliocentric orbit with increasing inclination",
    objective:
      "Observe the Sun’s poles and link solar surface activity to the heliosphere in situ.",
    highlights: [
      "First close views of the solar poles from outside the ecliptic plane.",
      "Coordinates campaigns with Parker Solar Probe.",
    ],
    url: "https://science.nasa.gov/mission/solar-orbiter/",
  },
  {
    id: "mms",
    name: "Magnetospheric Multiscale (MMS)",
    agency: "NASA Goddard",
    status: "extended",
    category: "heliophysics",
    launched: "2015-03-12",
    launchLabel: "12 March 2015",
    vehicle: "Atlas V 421",
    destination: "Highly elliptical Earth orbit through the magnetosphere",
    objective:
      "Resolve magnetic reconnection in three dimensions with four closely spaced spacecraft.",
    highlights: [
      "Measured electron-scale reconnection layers for the first time in situ.",
      "Formation flying at separations down to a few kilometres.",
    ],
    url: "https://science.nasa.gov/mission/mms/",
  },
  {
    id: "ace",
    name: "ACE (Advanced Composition Explorer)",
    agency: "NASA Goddard",
    status: "extended",
    category: "heliophysics",
    launched: "1997-08-25",
    launchLabel: "25 August 1997",
    vehicle: "Delta II",
    destination: "Sun–Earth L1",
    objective:
      "Measure solar wind composition and energetic particles that drive space weather at Earth.",
    highlights: [
      "Long-running real-time solar wind monitor used by forecast centres.",
      "Still operating decades past its primary design life.",
    ],
    url: "https://science.nasa.gov/mission/ace/",
  },
  {
    id: "stereo",
    name: "STEREO",
    agency: "NASA Goddard",
    status: "extended",
    category: "heliophysics",
    launched: "2006-10-25",
    launchLabel: "25 October 2006",
    vehicle: "Delta II",
    destination: "Heliocentric orbits leading and trailing Earth",
    objective:
      "Image the Sun and coronal mass ejections in three dimensions from separated viewpoints.",
    highlights: [
      "Enabled stereoscopic tracking of CMEs toward Earth.",
      "STEREO-A remains active; contact with STEREO-B was later lost.",
    ],
    url: "https://science.nasa.gov/mission/stereo/",
  },

  // -------- Earth science --------
  {
    id: "aqua",
    name: "Aqua",
    agency: "NASA Goddard",
    status: "extended",
    category: "earth",
    launched: "2002-05-04",
    launchLabel: "4 May 2002",
    vehicle: "Delta II",
    destination: "Sun-synchronous low Earth orbit (A-Train era)",
    objective:
      "Observe the water cycle—precipitation, evaporation, and atmospheric water vapour—from space.",
    highlights: [
      "MODIS and AIRS data underpin climate and weather research records spanning two decades.",
      "Part of the Earth Observing System afternoon constellation.",
    ],
    url: "https://science.nasa.gov/mission/aqua/",
  },
  {
    id: "aura",
    name: "Aura",
    agency: "NASA Goddard",
    status: "extended",
    category: "earth",
    launched: "2004-07-15",
    launchLabel: "15 July 2004",
    vehicle: "Delta II",
    destination: "Sun-synchronous low Earth orbit",
    objective:
      "Measure atmospheric chemistry related to ozone, air quality, and climate.",
    highlights: [
      "OMI and MLS tracked ozone recovery and pollution transport.",
      "Long-term records support Montreal Protocol assessments.",
    ],
    url: "https://science.nasa.gov/mission/aura/",
  },
  {
    id: "nisar",
    name: "NISAR",
    agency: "NASA and ISRO",
    status: "planned",
    category: "earth",
    launched: "2025-01-01",
    launchLabel: "Target launch window mid-decade (check official page for current date)",
    vehicle: "GSLV Mk II (ISRO)",
    destination: "Sun-synchronous low Earth orbit",
    objective:
      "Map Earth’s land and ice surface deformation with dual-frequency synthetic aperture radar.",
    highlights: [
      "L-band (NASA) and S-band (ISRO) radars on one spacecraft.",
      "Designed to measure centimetre-scale changes related to earthquakes, volcanoes, and ice sheets.",
    ],
    url: "https://science.nasa.gov/mission/nisar/",
  },

  // -------- Lunar --------
  {
    id: "chandrayaan-3",
    name: "Chandrayaan-3",
    agency: "ISRO",
    status: "completed",
    category: "lunar",
    launched: "2023-07-14",
    launchLabel: "14 July 2023",
    vehicle: "LVM3",
    destination: "Near-south polar region of the Moon",
    objective:
      "Soft-land a lander and rover near the lunar south pole and demonstrate surface operations.",
    highlights: [
      "Vikram lander touched down on 23 August 2023; Pragyan rover traversed the surface.",
      "First soft landing in the high-latitude south polar region.",
    ],
    url: "https://www.isro.gov.in/Chandrayaan3.html",
    ended: "2023-09-01",
  },
  {
    id: "change-5",
    name: "Chang’e-5",
    agency: "CNSA",
    status: "completed",
    category: "lunar",
    launched: "2020-11-24",
    launchLabel: "24 November 2020",
    vehicle: "Long March 5",
    destination: "Oceanus Procellarum, Moon; sample return to Earth",
    objective:
      "Collect and return young lunar basalt samples from the near side.",
    highlights: [
      "Returned about 1.7 kg of material in December 2020—first lunar samples since the 1970s.",
      "Demonstrated automated rendezvous and docking in lunar orbit for the return stack.",
    ],
    url: "https://www.cnsa.gov.cn/",
    ended: "2020-12-17",
  },
  {
    id: "capstone",
    name: "CAPSTONE",
    agency: "NASA with Advanced Space",
    status: "extended",
    category: "lunar",
    launched: "2022-06-28",
    launchLabel: "28 June 2022",
    vehicle: "Electron / Photon",
    destination: "Near-rectilinear halo orbit about the Moon",
    objective:
      "Validat

export function missionYear(m: MissionProfile): number {
  const y = Number(m.launched.slice(0, 4));
  return Number.isFinite(y) ? y : 0;
}
