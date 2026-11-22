// Aerospace terminology reference used by the Academy's Terminologies tab.
// Definitions are written from standard aerospace engineering references
// (NASA Basics of Spaceflight, NASA Systems Engineering Handbook, Vallado's
// Fundamentals of Astrodynamics and Applications, Sutton's Rocket Propulsion
// Elements). Numeric values are the conventional textbook figures and are
// labelled as approximate where they vary by source.

import { EXTRA_GLOSSARY } from "./glossary-extra";

export type GlossaryCategory =
  | "orbits"
  | "keplerian"
  | "maneuvers"
  | "propulsion"
  | "bus"
  | "comms"
  | "launch"
  | "environment"
  | "operations"
  | "aviation"
  | "stars-galaxies"
  | "solar-system"
  | "observing"
  | "celestial"
  | "mathematics"
  | "physics"
  | "engineering";

export type GlossaryTrack = "aviation" | "astronomy" | "aerospace" | "stem";

export type GlossaryEntry = {
  term: string;
  category: GlossaryCategory;
  short: string;
  detail: string;
  symbol?: string;
  units?: string;
  aka?: string[];
};

const BASE_CATEGORIES: { id: GlossaryCategory; label: string; blurb: string }[] = [
  {
    id: "orbits",
    label: "Orbits and regimes",
    blurb: "Where spacecraft fly, how those bands are defined, and what each one is used for.",
  },
  {
    id: "keplerian",
    label: "Keplerian elements and geometry",
    blurb: "The six numbers that fix an orbit in space, plus the geometry built on them.",
  },
  {
    id: "maneuvers",
    label: "Maneuvers and delta-v",
    blurb: "Changing an orbit: burns, transfers, rendezvous, and the budget that pays for them.",
  },
  {
    id: "propulsion",
    label: "Propulsion",
    blurb: "How thrust is produced, measured, and traded against mass.",
  },
  {
    id: "bus",
    label: "Spacecraft systems",
    blurb: "Structure, power, thermal control, and attitude determination and control.",
  },
  {
    id: "comms",
    label: "Communications and telemetry",
    blurb: "Links, bands, budgets, and the ground segment that closes them.",
  },
  {
    id: "launch",
    label: "Launch, ascent, and re-entry",
    blurb: "Getting off the pad, staging, and coming back through the atmosphere.",
  },
  {
    id: "environment",
    label: "Space environment",
    blurb: "Radiation, plasma, debris, and the conditions hardware has to survive.",
  },
  {
    id: "operations",
    label: "Mission operations",
    blurb: "Planning, tracking, catalogues, and the vocabulary of flight control.",
  },
  {
    id: "aviation",
    label: "Aviation and aerodynamics",
    blurb: "Atmospheric flight terms shared by aircraft, launch vehicles, and returning spacecraft.",
  },
];

/** Categories added for the astronomy and STEM sections. */
const NEW_CATEGORIES: { id: GlossaryCategory; label: string; blurb: string }[] = [
  { id: "stars-galaxies", label: "Stars and galaxies", blurb: "How stars shine, change, and die, and the structures they build." },
  { id: "solar-system", label: "Solar system and planets", blurb: "The planets, small bodies, and the search for planets around other stars." },
  { id: "observing", label: "Telescopes and observing", blurb: "How telescopes collect and sharpen light, and the methods used to read it." },
  { id: "celestial", label: "Sky coordinates and time", blurb: "How positions and times on the celestial sphere are described." },
  { id: "mathematics", label: "Mathematics", blurb: "The mathematical language used in every quantitative track." },
  { id: "physics", label: "Physics", blurb: "The laws of motion, energy, radiation, and fluids behind flight and orbits." },
  { id: "engineering", label: "Engineering method", blurb: "How structures, systems, and missions are designed, tested, and kept safe." },
];

export const GLOSSARY_CATEGORIES = [...BASE_CATEGORIES, ...NEW_CATEGORIES];

export const GLOSSARY_TRACKS: { id: GlossaryTrack; label: string; blurb: string }[] = [
  { id: "aviation", label: "Aviation", blurb: "How aircraft fly: lift, stability, control, performance, and the instruments that report it." },
  { id: "astronomy", label: "Astronomy", blurb: "Stars, galaxies, planets, the instruments we observe with, and how positions in the sky are described." },
  { id: "aerospace", label: "Aerospace", blurb: "Spacecraft, orbits, launch, propulsion, and the operations that keep missions running." },
  { id: "stem", label: "STEM foundations", blurb: "The mathematics, physics, and engineering method that every track depends on." },
];

/** Which section each category belongs to. */
export const CATEGORY_TRACK: Record<GlossaryCategory, GlossaryTrack> = {
  aviation: "aviation",
  orbits: "aerospace",
  keplerian: "aerospace",
  maneuvers: "aerospace",
  propulsion: "aerospace",
  bus: "aerospace",
  comms: "aerospace",
  launch: "aerospace",
  environment: "aerospace",
  operations: "aerospace",
  "stars-galaxies": "astronomy",
  "solar-system": "astronomy",
  observing: "astronomy",
  celestial: "astronomy",
  mathematics: "stem",
  physics: "stem",
  engineering: "stem",
};

const BASE_GLOSSARY: GlossaryEntry[] = [
  // ---------------------------------------------------------------- orbits
  {
    term: "Low Earth Orbit",
    aka: ["LEO"],
    category: "orbits",
    short: "Roughly 160 to 2,000 km altitude, orbital period near 90 minutes.",
    detail:
      "The band that holds the International Space Station, most Earth observation satellites, and the large communications constellations. Orbital speed is about 7.8 km/s near 400 km, so a revolution takes roughly 90 minutes. Residual atmosphere still produces measurable drag, so satellites here need periodic reboosts or they re-enter.",
  },
  {
    term: "Medium Earth Orbit",
    aka: ["MEO"],
    category: "orbits",
    short: "Between LEO and geostationary altitude, about 2,000 to 35,786 km.",
    detail:
      "Home to the navigation constellations. GPS flies near 20,200 km with a period close to 11 hours 58 minutes, Galileo near 23,200 km, GLONASS near 19,100 km. Higher altitude means fewer satellites are needed for global coverage, at the cost of a longer signal path and passage through the inner radiation belt.",
  },
  {
    term: "Geostationary Orbit",
    aka: ["GEO"],
    category: "orbits",
    short: "Circular equatorial orbit at 35,786 km where the period matches Earth's rotation.",
    detail:
      "A satellite in a circular orbit at 35,786 km over the equator has a period of one sidereal day, so it appears fixed above one longitude. Used for broadcast, fixed communications, and weather imagers that need a constant hemispheric view. Station keeping corrects for lunar and solar perturbations and the equatorial bulge.",
  },
  {
    term: "Geosynchronous Orbit",
    aka: ["GSO"],
    category: "orbits",
    short: "One-sidereal-day period, but not necessarily equatorial or circular.",
    detail:
      "Any orbit whose period equals Earth's rotation period. If it is inclined or eccentric, the ground track traces a figure eight or an analemma instead of holding a fixed point. Geostationary orbit is the special zero-inclination, zero-eccentricity case.",
  },
  {
    term: "Sun-Synchronous Orbit",
    aka: ["SSO"],
    category: "orbits",
    short: "Near-polar orbit whose plane precesses once per year, fixing the local solar time.",
    detail:
      "Inclination is chosen (typically 96 to 100 degrees at 600 to 800 km) so that Earth's oblateness drags the orbital plane eastwards about 0.9856 degrees per day, matching Earth's motion around the Sun. Every pass over a given latitude then happens at the same local solar time, giving consistent illumination for imaging.",
  },
  {
    term: "Polar Orbit",
    category: "orbits",
    short: "High-inclination orbit passing near both poles.",
    detail:
      "Inclination near 90 degrees, so the ground track eventually covers the entire surface as Earth turns beneath it. Standard for reconnaissance, meteorology, and global environmental monitoring.",
  },
  {
    term: "Molniya Orbit",
    category: "orbits",
    short: "Highly eccentric 12-hour orbit with apogee over high northern latitudes.",
    detail:
      "Inclination near 63.4 degrees, which freezes the argument of perigee so apogee stays over the same hemisphere. The spacecraft loiters near apogee for hours, giving long high-latitude coverage that geostationary satellites cannot provide.",
  },
  {
    term: "Tundra Orbit",
    category: "orbits",
    short: "Eccentric 24-hour orbit with a long dwell over one region.",
    detail:
      "A geosynchronous-period orbit with significant eccentricity and inclination. The ground track is a closed loop, so one satellite dwells over a chosen service area for most of the day.",
  },
  {
    term: "Graveyard Orbit",
    aka: ["Disposal orbit"],
    category: "orbits",
    short: "Storage orbit above GEO for retired geostationary satellites.",
    detail:
      "Inter-Agency Space Debris Coordination Committee guidelines call for raising a retired geostationary satellite a few hundred kilometres above the operational belt and passivating it, so it cannot drift back through the crowded ring.",
  },
  {
    term: "Highly Elliptical Orbit",
    aka: ["HEO"],
    category: "orbits",
    short: "Large eccentricity orbit with a low perigee and a far apogee.",
    detail:
      "Used by magnetospheric and X-ray astronomy missions that need to spend most of their time outside the radiation belts, and by communications systems needing high-latitude dwell.",
  },
  {
    term: "Halo Orbit",
    category: "orbits",
    short: "Quasi-periodic orbit around a collinear Lagrange point.",
    detail:
      "A three-dimensional path around L1 or L2 that never passes directly behind the secondary body, which keeps the spacecraft in sunlight and in view of the ground. The James Webb Space Telescope flies a halo orbit around Sun-Earth L2.",
  },
  {
    term: "Lagrange Point",
    aka: ["Libration point", "L1 to L5"],
    category: "orbits",
    short: "Five equilibrium points in a two-body gravitational system.",
    detail:
      "Positions where the gravity of two large bodies and the centrifugal effect of their rotation balance for a small third body. L1, L2, and L3 are collinear and unstable, requiring small station keeping burns. L4 and L5 form equilateral triangles with the two bodies and are stable.",
  },
  {
    term: "Near-Rectilinear Halo Orbit",
    aka: ["NRHO"],
    category: "orbits",
    short: "Elongated lunar halo orbit with favourable access and communications.",
    detail:
      "A high-eccentricity halo orbit about the Earth-Moon L2 region, planned for the Gateway station. It offers near-continuous Earth communications, modest station keeping cost, and low delta-v transfers to lunar orbit.",
  },
  {
    term: "Heliocentric Orbit",
    category: "orbits",
    short: "An orbit around the Sun rather than a planet.",
    detail:
      "Interplanetary spacecraft spend most of their cruise in heliocentric orbit. Trajectory design is expressed in heliocentric elements, with planetary encounters treated as brief patched-conic segments.",
  },
  {
    term: "Retrograde Orbit",
    category: "orbits",
    short: "Orbit with inclination above 90 degrees, moving against the primary's rotation.",
    detail:
      "Launching retrograde is expensive from Earth because the launch site's rotational velocity works against the vehicle. Retrograde orbits appear mostly around other bodies or in specialised remote sensing cases.",
  },
  {
    term: "Frozen Orbit",
    category: "orbits",
    short: "Orbit tuned so eccentricity and argument of perigee stay nearly constant.",
    detail:
      "By choosing a small eccentricity and an argument of perigee near 90 degrees, the secular effects of Earth's gravity field cancel, holding altitude over a target latitude steady and reducing station keeping.",
  },
  {
    term: "Repeat Ground Track Orbit",
    category: "orbits",
    short: "Orbit whose ground track exactly repeats after a fixed number of revolutions.",
    detail:
      "Altitude is chosen so that an integer number of revolutions matches an integer number of nodal days. Essential for interferometric and change-detection missions that must revisit the same geometry.",
  },
  {
    term: "Orbital Decay",
    category: "orbits",
    short: "Progressive loss of altitude from drag and other dissipative effects.",
    detail:
      "In LEO, atmospheric drag removes energy, shrinking the orbit and speeding decay as density rises. Decay rate depends on area-to-mass ratio and on solar activity, which expands the thermosphere near solar maximum.",
  },
  {
    term: "Orbital Period",
    symbol: "T",
    units: "minutes or hours",
    category: "orbits",
    short: "Time for one complete revolution.",
    detail:
      "For a two-body orbit, T equals 2 pi times the square root of a cubed over mu, where a is the semi-major axis and mu is the gravitational parameter of the primary. Period depends only on semi-major axis, not on eccentricity.",
  },
  {
    term: "Ground Track",
    category: "orbits",
    short: "The path the sub-satellite point traces on the surface.",
    detail:
      "The projection of the orbit onto the rotating body. Successive tracks shift west by the amount the body rotates during one revolution, about 22.5 degrees of longitude for a 90-minute LEO orbit.",
  },

  // ------------------------------------------------------------- keplerian
  {
    term: "Semi-Major Axis",
    symbol: "a",
    units: "km",
    category: "keplerian",
    short: "Half the long axis of the orbital ellipse; sets the period and energy.",
    detail:
      "The single element that determines orbital period and specific orbital energy. For a circular orbit it equals the orbital radius. Raising a is the definition of raising an orbit.",
  },
  {
    term: "Eccentricity",
    symbol: "e",
    category: "keplerian",
    short: "Shape of the orbit, from 0 for a circle to below 1 for an ellipse.",
    detail:
      "Zero is circular, values between 0 and 1 are elliptical, exactly 1 is parabolic (escape), and above 1 is hyperbolic. Perigee radius equals a times (1 minus e); apogee radius equals a times (1 plus e).",
  },
  {
    term: "Inclination",
    symbol: "i",
    units: "degrees",
    category: "keplerian",
    short: "Tilt of the orbital plane relative to the reference equator.",
    detail:
      "Zero degrees is equatorial and prograde, 90 degrees is polar, and above 90 degrees is retrograde. The minimum inclination reachable directly from a launch site equals that site's latitude.",
  },
  {
    term: "Right Ascension of the Ascending Node",
    symbol: "RAAN",
    units: "degrees",
    category: "keplerian",
    short: "Where the orbit plane crosses the equator going north, measured along the equator.",
    detail:
      "Measured eastwards from the vernal equinox direction to the ascending node. Earth's oblateness makes RAAN drift, which is exploited in sun-synchronous design and must be accounted for when phasing a constellation.",
  },
  {
    term: "Argument of Perigee",
    symbol: "omega",
    units: "degrees",
    category: "keplerian",
    short: "Angle from the ascending node to perigee, measured in the orbital plane.",
    detail:
      "Sets where in the orbit the spacecraft is closest to the primary. It also precesses under the oblateness perturbation, except near the critical inclination of about 63.4 degrees where the drift vanishes.",
  },
  {
    term: "True Anomaly",
    symbol: "nu",
    units: "degrees",
    category: "keplerian",
    short: "Angular position of the spacecraft along its orbit, measured from perigee.",
    detail:
      "The instantaneous position angle at the focus. Together with the other five elements and an epoch, it fully specifies the state.",
  },
  {
    term: "Mean Anomaly",
    symbol: "M",
    units: "degrees",
    category: "keplerian",
    short: "Position angle a fictitious body would have moving at constant angular rate.",
    detail:
      "Advances linearly with time, which is why it is the element published in two-line element sets. Converting to true anomaly requires solving Kepler's equation for the eccentric anomaly.",
  },
  {
    term: "Eccentric Anomaly",
    symbol: "E",
    category: "keplerian",
    short: "Intermediate angle linking mean anomaly to true anomaly.",
    detail:
      "Defined on the circumscribing circle of the ellipse. Kepler's equation, M equals E minus e times sin E, is solved iteratively for E, then converted to true anomaly.",
  },
  {
    term: "Kepler's Equation",
    category: "keplerian",
    short: "The transcendental relation between mean and eccentric anomaly.",
    detail:
      "M equals E minus e sin E. It has no closed-form solution for E, so propagators use Newton-Raphson or series methods. This is the core of every analytic two-body propagator.",
  },
  {
    term: "Epoch",
    category: "keplerian",
    short: "The instant at which a set of orbital elements is valid.",
    detail:
      "Elements degrade with time because of perturbations, so element sets are timestamped. Propagating far from epoch increases position error, which is why operational tracking uses freshly published sets.",
  },
  {
    term: "Two-Line Element Set",
    aka: ["TLE"],
    category: "keplerian",
    short: "Compact fixed-format description of a satellite orbit at an epoch.",
    detail:
      "Encodes inclination, right ascension of the ascending node, eccentricity, argument of perigee, mean anomaly, mean motion, and a drag term. It is defined for use with the SGP4 model, and mixing it with a plain two-body propagator introduces error.",
  },
  {
    term: "Orbit Mean-Elements Message",
    aka: ["OMM"],
    category: "keplerian",
    short: "Modern standardised replacement format for element sets.",
    detail:
      "A Consultative Committee for Space Data Systems format carrying the same mean elements as a two-line set in a self-describing structure, with no column limits on names or catalogue numbers.",
  },
  {
    term: "Mean Motion",
    symbol: "n",
    units: "revolutions per day",
    category: "keplerian",
    short: "Average angular rate around the orbit.",
    detail:
      "Directly related to semi-major axis. Element sets publish mean motion instead of altitude, so altitude figures on tracking displays are derived quantities.",
  },
  {
    term: "SGP4",
    category: "keplerian",
    short: "Standard analytic propagator paired with two-line element sets.",
    detail:
      "Simplified General Perturbations model 4 includes secular and periodic effects of Earth's oblateness, atmospheric drag, and lunar and solar gravity in an approximate form. Typical accuracy is kilometres near epoch, degrading over days.",
  },
  {
    term: "J2 Perturbation",
    category: "keplerian",
    short: "Dominant effect of Earth's equatorial bulge on an orbit.",
    detail:
      "The second zonal harmonic of the gravity field causes secular drift in right ascension of the ascending node and argument of perigee. It is the largest non-spherical gravity term and the basis of sun-synchronous and frozen orbit design.",
  },
  {
    term: "Perigee and Apogee",
    category: "keplerian",
    short: "Closest and farthest points of an Earth orbit.",
    detail:
      "The general terms are periapsis and apoapsis; around the Sun they are perihelion and aphelion, and around the Moon perilune and apolune. Speed is highest at periapsis and lowest at apoapsis.",
  },
  {
    term: "State Vector",
    category: "keplerian",
    short: "Position and velocity at an epoch, in a stated reference frame.",
    detail:
      "Six numbers equivalent to the Keplerian elements. Numerical propagators integrate state vectors directly, which handles perturbations that analytic element methods approximate.",
  },
  {
    term: "Specific Orbital Energy",
    category: "keplerian",
    short: "Orbital energy per unit mass; negative for bound orbits.",
    detail:
      "Equal to minus mu divided by twice the semi-major axis. The vis-viva equation relates it to speed and radius, and it is the quantity a burn changes when raising or lowering an orbit.",
  },
  {
    term: "Vis-Viva Equation",
    category: "keplerian",
    short: "Relates orbital speed to radius and semi-major axis.",
    detail:
      "v squared equals mu times (2 over r minus 1 over a). It gives the speed at any point of an orbit and underlies every impulsive transfer calculation.",
  },
  {
    term: "Sphere of Influence",
    category: "keplerian",
    short: "Region where one body's gravity dominates trajectory design.",
    detail:
      "Used in the patched-conic method: inside the sphere the trajectory is treated as a two-body problem about that body, and outside it about the Sun. An approximation, but accurate enough for preliminary interplanetary design.",
  },
  {
    term: "Ground Elevation Angle",
    category: "keplerian",
    short: "Angle of a spacecraft above the local horizon as seen from a site.",
    detail:
      "Pass planning uses a minimum usable elevation, often 5 to 10 degrees, because atmospheric path length and terrain blockage degrade the link at low elevation.",
  },

  // ------------------------------------------------------------- maneuvers
  {
    term: "Delta-v",
    symbol: "dv",
    units: "km/s or m/s",
    category: "maneuvers",
    short: "Change in velocity a maneuver requires; the currency of mission design.",
    detail:
      "Every orbital change is priced in delta-v, and delta-v is converted into propellant through the rocket equation. Reaching LEO costs roughly 9.3 to 10 km/s including losses; LEO to geostationary transfer plus circularisation costs roughly 3.9 to 4.3 km/s.",
  },
  {
    term: "Delta-v Budget",
    category: "maneuvers",
    short: "Itemised allocation of velocity change for a whole mission.",
    detail:
      "Lists ascent, transfers, plane changes, rendezvous, station keeping over the design life, attitude control leakage, and disposal, plus margin. It sizes the propulsion system and often decides the launch vehicle.",
  },
  {
    term: "Tsiolkovsky Rocket Equation",
    category: "maneuvers",
    short: "Links delta-v to exhaust velocity and mass ratio.",
    detail:
      "dv equals the effective exhaust velocity times the natural logarithm of initial mass over final mass. Because the relation is logarithmic, each increment of delta-v costs exponentially more propellant.",
  },
  {
    term: "Hohmann Transfer",
    category: "maneuvers",
    short: "Two-burn minimum-energy transfer between coplanar circular orbits.",
    detail:
      "The first burn raises apoapsis to the target radius, the second circularises there. It is the cheapest two-impulse transfer for moderate radius ratios but also the slowest, so mission design trades it against time of flight.",
  },
  {
    term: "Bi-Elliptic Transfer",
    category: "maneuvers",
    short: "Three-burn transfer that beats a Hohmann transfer at large radius ratios.",
    detail:
      "Uses a very high intermediate apoapsis so the plane change and circularisation happen where velocity is low. It costs less delta-v than a Hohmann transfer when the final radius exceeds about 11.94 times the initial radius, at the cost of much longer flight time.",
  },
  {
    term: "Plane Change Maneuver",
    category: "maneuvers",
    short: "Rotating the orbital plane, priced by orbital speed at the burn point.",
    detail:
      "Cost is 2 v sin(half the angle), so plane changes are performed as high and slow as possible, ideally combined with a circularisation burn. Large inclination changes in LEO are prohibitively expensive.",
  },
  {
    term: "Combined Maneuver",
    category: "maneuvers",
    short: "Single burn that changes speed and direction at once.",
    detail:
      "Vector-adding a plane change into an apogee circularisation burn costs less than performing the two separately, which is standard practice for geostationary insertion from an inclined transfer orbit.",
  },
  {
    term: "Geostationary Transfer Orbit",
    aka: ["GTO"],
    category: "maneuvers",
    short: "Elliptical staging orbit with apogee near geostationary altitude.",
    detail:
      "Launchers deliver payloads to a transfer orbit with perigee in LEO and apogee near 35,786 km. The satellite then performs its own apogee burn to circularise and remove inclination.",
  },
  {
    term: "Apogee Kick",
    category: "maneuvers",
    short: "Burn at apogee that circularises a transfer orbit.",
    detail:
      "Performed by an integral engine or a dedicated apogee motor. Because it occurs at the slowest point of the orbit, it is the efficient place to combine circularisation with the inclination change.",
  },
  {
    term: "Oberth Effect",
    category: "maneuvers",
    short: "A burn deep in a gravity well delivers more energy change.",
    detail:
      "Kinetic energy scales with velocity squared, so the same delta-v applied where the spacecraft is moving fastest, at periapsis, produces a larger change in orbital energy. Escape burns are therefore performed at low periapsis.",
  },
  {
    term: "Gravity Assist",
    aka: ["Flyby", "Swing-by"],
    category: "maneuvers",
    short: "Using a planetary encounter to change heliocentric velocity for free.",
    detail:
      "The flyby is a rotation of velocity in the planet's frame, but in the Sun's frame it exchanges momentum with the planet, changing speed and direction. Voyager, Cassini, Parker Solar Probe, and Europa Clipper all depend on assist sequences.",
  },
  {
    term: "Aerobraking",
    category: "maneuvers",
    short: "Using repeated shallow atmospheric passes to shrink an orbit.",
    detail:
      "Mars orbiters have used dozens to hundreds of drag passes to lower apoapsis, saving substantial propellant at the cost of months of operations and careful thermal and dynamic pressure limits.",
  },
  {
    term: "Aerocapture",
    category: "maneuvers",
    short: "Single atmospheric pass that converts a hyperbolic arrival into orbit.",
    detail:
      "A one-pass, high-heating alternative to propulsive capture. Studied extensively and demonstrated in analogous entry guidance, but not yet flown as a primary capture method on a planetary mission.",
  },
  {
    term: "Station Keeping",
    category: "maneuvers",
    short: "Small routine burns that hold an operational orbit inside its box.",
    detail:
      "Geostationary satellites correct north-south drift from lunar and solar gravity and east-west drift from the equatorial bulge, typically spending 45 to 55 m/s per year. LEO spacecraft reboost against drag instead.",
  },
  {
    term: "Phasing Maneuver",
    category: "maneuvers",
    short: "Changing arrival timing by temporarily changing period.",
    detail:
      "Raising or lowering the orbit changes the period, letting a chaser catch up with or fall back towards a target. Constellation deployment uses long low-thrust phasing to spread satellites across a plane.",
  },
  {
    term: "Rendezvous and Docking",
    category: "maneuvers",
    short: "Bringing two spacecraft to the same state and mating them.",
    detail:
      "Proceeds through phasing, far-field approach, proximity operations along a defined corridor, then capture. Cargo and crew vehicles at the International Space Station follow approach ellipsoid and keep-out sphere rules enforced by flight rules.",
  },
  {
    term: "Clohessy-Wiltshire Equations",
    aka: ["Hill's equations"],
    category: "maneuvers",
    short: "Linearised relative motion model used for proximity operations.",
    detail:
      "Describe a chaser's motion in a rotating frame centred on the target for near-circular orbits. They explain counter-intuitive behaviour such as thrusting forward causing the chaser to rise and fall behind.",
  },
  {
    term: "Collision Avoidance Maneuver",
    category: "maneuvers",
    short: "Burn to raise the miss distance for a predicted close approach.",
    detail:
      "Triggered when a conjunction assessment shows probability of collision above an operator threshold. Usually a small along-track burn executed hours in advance, since a few centimetres per second is enough to move the encounter geometry.",
  },
  {
    term: "Deorbit Burn",
    category: "maneuvers",
    short: "Retrograde burn that lowers perigee into the atmosphere.",
    detail:
      "Ends a mission by guaranteeing re-entry within a controlled window and, for large vehicles, over an uninhabited ocean corridor. End-of-life guidelines call for LEO objects to re-enter within 25 years, with 5 years now recommended by some regulators.",
  },
  {
    term: "Escape Velocity",
    category: "maneuvers",
    short: "Speed needed to leave a gravity well with no further thrust.",
    detail:
      "Equals the square root of 2 mu over r, about 11.2 km/s at Earth's surface ignoring atmosphere, and about 3.2 km/s from LEO in addition to orbital speed already held.",
  },
  {
    term: "Characteristic Energy",
    symbol: "C3",
    units: "km2/s2",
    category: "maneuvers",
    short: "Twice the specific orbital energy of a departure trajectory.",
    detail:
      "Zero means exactly escape; positive values mean hyperbolic departure with excess speed. Launch vehicle performance for interplanetary missions is quoted as payload mass versus C3.",
  },
  {
    term: "Launch Window",
    category: "maneuvers",
    short: "Interval when geometry permits the planned trajectory.",
    detail:
      "For rendezvous it is set by plane alignment; for interplanetary flight by the synodic period, which is roughly 26 months for Mars. Missing a window can mean waiting years and paying more delta-v.",
  },
  {
    term: "Porkchop Plot",
    category: "maneuvers",
    short: "Contour chart of transfer cost against departure and arrival dates.",
    detail:
      "Shows C3 or total delta-v across a grid of dates, with nested contours resembling a pork chop. The standard tool for selecting interplanetary launch periods.",
  },

  // ------------------------------------------------------------ propulsion
  {
    term: "Specific Impulse",
    symbol: "Isp",
    units: "seconds",
    category: "propulsion",
    short: "Thrust per unit propellant weight flow; the efficiency of a rocket.",
    detail:
      "Roughly 450 seconds for a hydrogen-oxygen upper stage in vacuum, 300 to 340 for kerosene-oxygen, 300 to 320 for storable hypergolics, and 1,500 to 4,000 for electric thrusters. Higher specific impulse means less propellant for the same delta-v.",
  },
  {
    term: "Thrust",
    units: "newtons",
    category: "propulsion",
    short: "Force produced by expelling mass, plus a pressure term at the nozzle exit.",
    detail:
      "Equals mass flow times exhaust velocity plus exit area times the difference between exit and ambient pressure. That second term is why an engine's sea-level and vacuum thrust differ.",
  },
  {
    term: "Thrust-to-Weight Ratio",
    category: "propulsion",
    short: "Thrust divided by vehicle weight; must exceed one to lift off.",
    detail:
      "First stages typically launch with a ratio of about 1.2 to 1.5. Too low wastes propellant fighting gravity, too high adds structural loads and aerodynamic stress.",
  },
  {
    term: "Mass Ratio",
    category: "propulsion",
    short: "Initial mass divided by final mass after the burn.",
    detail:
      "The term inside the logarithm of the rocket equation. Achievable mass ratio is limited by tank, structure, and engine mass, which is why staging exists.",
  },
  {
    term: "Effective Exhaust Velocity",
    category: "propulsion",
    short: "Specific impulse expressed as a velocity.",
    detail:
      "Equal to specific impulse times standard gravity, about 4,400 m/s for a hydrogen-oxygen upper stage. It appears directly in the rocket equation.",
  },
  {
    term: "Staging",
    category: "propulsion",
    short: "Discarding empty structure during ascent to improve mass ratio.",
    detail:
      "Each stage carries only the tankage and engines it needs, so dry mass falls as the flight proceeds. Two or three stages are typical for orbital launch; more stages add complexity and separation risk.",
  },
  {
    term: "Hypergolic Propellant",
    category: "propulsion",
    short: "Fuel and oxidiser that ignite on contact, needing no igniter.",
    detail:
      "Monomethylhydrazine with nitrogen tetroxide is common. Storable for years and highly reliable to restart, which suits attitude control, landers, and deep space main engines, at the cost of toxicity and ground handling burden.",
  },
  {
    term: "Cryogenic Propellant",
    category: "propulsion",
    short: "Propellant stored as a deeply cold liquid, such as hydrogen or oxygen.",
    detail:
      "Offers high performance but boils off, so it needs insulation, venting, and late loading. Long-duration cryogenic storage is an active technology area for lunar and Mars architectures.",
  },
  {
    term: "Solid Rocket Motor",
    category: "propulsion",
    short: "Pre-cast propellant grain that burns to a fixed thrust profile.",
    detail:
      "Simple, dense, and storable, delivering large thrust for boosters, but it cannot generally be throttled or shut down once ignited. Thrust profile is shaped by the grain geometry.",
  },
  {
    term: "Monopropellant Thruster",
    category: "propulsion",
    short: "Single propellant decomposed over a catalyst bed.",
    detail:
      "Hydrazine over an iridium catalyst gives about 220 to 235 seconds of specific impulse with very simple plumbing, which suits attitude control and small station keeping burns. Green monopropellants are now flying as lower-toxicity replacements.",
  },
  {
    term: "Ion Thruster",
    category: "propulsion",
    short: "Electrostatic thruster accelerating ions through a gridded field.",
    detail:
      "Specific impulse of 3,000 seconds and above with thrust measured in tens to hundreds of millinewtons. Dawn used ion propulsion to orbit both Vesta and Ceres, which chemical propulsion could not have afforded.",
  },
  {
    term: "Hall Effect Thruster",
    category: "propulsion",
    short: "Plasma thruster using crossed electric and magnetic fields.",
    detail:
      "Delivers 1,200 to 2,500 seconds of specific impulse at higher thrust density than gridded ion engines. Now the standard for geostationary orbit raising and for large LEO constellation station keeping.",
  },
  {
    term: "Electric Propulsion",
    aka: ["Solar electric propulsion"],
    category: "propulsion",
    short: "Using electrical power rather than chemical energy to accelerate propellant.",
    detail:
      "Trades thrust for efficiency: transfers take months instead of hours, but propellant mass can drop by more than half. Available power sets the achievable thrust, so array size drives the design.",
  },
  {
    term: "Cold Gas Thruster",
    category: "propulsion",
    short: "Expelling stored pressurised gas with no combustion.",
    detail:
      "Specific impulse of roughly 50 to 70 seconds, but extremely simple, clean, and safe. Used on small satellites, for fine pointing, and for crewed extravehicular manoeuvring units.",
  },
  {
    term: "Nuclear Thermal Propulsion",
    category: "propulsion",
    short: "Heating propellant with a fission reactor instead of combustion.",
    detail:
      "Ground-tested in the NERVA programme at roughly double the specific impulse of the best chemical engines. Under study again for crewed Mars transfers; no flight demonstration has occurred.",
  },
  {
    term: "Solar Sail",
    category: "propulsion",
    short: "Propellantless thrust from solar radiation pressure.",
    detail:
      "Thrust is tiny, on the order of micronewtons per square metre near Earth, but continuous. IKAROS and LightSail 2 demonstrated controlled sail flight; NASA's Advanced Composite Solar Sail System extended the technology.",
  },
  {
    term: "Throttling",
    category: "propulsion",
    short: "Varying thrust in flight by modulating propellant flow.",
    detail:
      "Needed for landing, load relief through maximum dynamic pressure, and precise orbit insertion. Deep throttling is hard because injector and chamber stability degrade away from the design point.",
  },
  {
    term: "Gimbal",
    category: "propulsion",
    short: "Pivoting an engine to steer the thrust vector.",
    detail:
      "The primary control effector during powered flight. Gimbal range, rate, and actuator authority are sized against expected wind shear, thrust misalignment, and engine-out cases.",
  },
  {
    term: "Nozzle Expansion Ratio",
    category: "propulsion",
    short: "Exit area divided by throat area.",
    detail:
      "Larger ratios extract more performance in vacuum but cause flow separation at sea level. This is why upper stage engines have visibly larger bells than first stage engines of similar thrust.",
  },
  {
    term: "Combustion Chamber Pressure",
    category: "propulsion",
    short: "Pressure at which propellants burn before expanding through the nozzle.",
    detail:
      "Higher chamber pressure allows more expansion in a given size, raising performance and thrust density, at the cost of turbomachinery, cooling, and structural demands.",
  },
  {
    term: "Propellant Slosh",
    category: "propulsion",
    short: "Fluid motion inside partly filled tanks that disturbs attitude.",
    detail:
      "Can couple with the control system and destabilise the vehicle. Managed with baffles, diaphragms, and control laws tuned to the slosh modes.",
  },

  // -------------------------------------------------------------------- bus
  {
    term: "Spacecraft Bus",
    category: "bus",
    short: "The service platform that supports the payload.",
    detail:
      "Provides structure, power, thermal control, attitude control, propulsion, command and data handling, and communications. Reusing a qualified bus across missions is the main cost lever in satellite manufacture.",
  },
  {
    term: "Attitude Determination and Control System",
    aka: ["ADCS"],
    category: "bus",
    short: "The system that senses and controls spacecraft orientation.",
    detail:
      "Sensors include star trackers, sun sensors, magnetometers, and gyroscopes; actuators include reaction wheels, magnetic torquers, and thrusters. Pointing accuracy requirements drive the whole design, from arcminutes for a communications satellite to milliarcseconds for a space telescope.",
  },
  {
    term: "Reaction Wheel",
    category: "bus",
    short: "Spinning flywheel that exchanges angular momentum with the spacecraft.",
    detail:
      "Provides smooth, propellant-free pointing control. Wheels saturate as disturbance torques accumulate and must be desaturated with thrusters or magnetic torquers. Wheel failures have ended or reshaped several major missions.",
  },
  {
    term: "Control Moment Gyroscope",
    category: "bus",
    short: "Gimballed spinning rotor producing large control torque.",
    detail:
      "Delivers far more torque than a reaction wheel of similar mass, which suits large stations. The International Space Station uses four to hold attitude without propellant.",
  },
  {
    term: "Magnetorquer",
    category: "bus",
    short: "Coil that torques against the local magnetic field.",
    detail:
      "Cheap, has no moving parts, and needs only power, but produces torque only perpendicular to the field and only where the field is strong, which limits it to LEO. Widely used on small satellites and for wheel desaturation.",
  },
  {
    term: "Star Tracker",
    category: "bus",
    short: "Camera that determines attitude by matching a star field to a catalogue.",
    detail:
      "Provides absolute three-axis attitude with arcsecond-class accuracy. Performance depends on avoiding bright body intrusion from the Sun, Earth, or Moon in the field of view.",
  },
  {
    term: "Inertial Measurement Unit",
    category: "bus",
    short: "Gyroscopes and accelerometers giving short-term attitude and rate.",
    detail:
      "Accurate over short intervals but subject to drift, so it is fused with absolute references such as star trackers and sun sensors in an estimator.",
  },
  {
    term: "Spin Stabilisation",
    category: "bus",
    short: "Holding orientation using the gyroscopic stiffness of a spinning body.",
    detail:
      "Simple and robust, used on early communications satellites and many upper stages. Pointing an instrument then requires despun platforms or accepting a scanning geometry.",
  },
  {
    term: "Gravity Gradient Stabilisation",
    category: "bus",
    short: "Passive stabilisation using the tidal torque on an elongated body.",
    detail:
      "An elongated spacecraft tends to align its long axis with the local vertical. Requires no power, gives coarse accuracy, and is common on small technology demonstrators.",
  },
  {
    term: "Electrical Power Subsystem",
    category: "bus",
    short: "Generation, storage, regulation, and distribution of spacecraft power.",
    detail:
      "Sized for the worst case: peak load during eclipse at end of life, after array degradation. Includes solar arrays, batteries, regulators, and protection.",
  },
  {
    term: "Solar Array",
    category: "bus",
    short: "Photovoltaic panels converting sunlight into electrical power.",
    detail:
      "Triple-junction cells reach roughly 30 percent efficiency. Output falls with radiation damage, thermal cycling, and increasing distance from the Sun, which scales as inverse square, making solar power hard beyond Jupiter.",
  },
  {
    term: "Radioisotope Thermoelectric Generator",
    aka: ["RTG"],
    category: "bus",
    short: "Power from the heat of radioisotope decay converted thermoelectrically.",
    detail:
      "Provides steady power independent of sunlight, which is why Voyager, Cassini, New Horizons, Curiosity, and Perseverance use it. Output declines predictably as the plutonium-238 source decays and thermocouples degrade.",
  },
  {
    term: "Eclipse Season",
    category: "bus",
    short: "Period when a satellite passes through the primary's shadow regularly.",
    detail:
      "Geostationary satellites experience daily eclipses of up to about 72 minutes near the equinoxes, sizing the battery. LEO spacecraft are eclipsed on most revolutions.",
  },
  {
    term: "Thermal Control Subsystem",
    category: "bus",
    short: "Keeping every component inside its allowed temperature range.",
    detail:
      "Passive means include multi-layer insulation, coatings, radiators, and heat pipes; active means include heaters and pumped loops. In vacuum, radiation is the only path off the vehicle, so radiator area is a hard design constraint.",
  },
  {
    term: "Multi-Layer Insulation",
    category: "bus",
    short: "Stacked reflective films that block radiative heat transfer.",
    detail:
      "The familiar gold or silver blanketing. Its effectiveness depends on low-conductance spacing between layers, so seams, penetrations, and attachment points dominate real performance.",
  },
  {
    term: "Command and Data Handling",
    category: "bus",
    short: "The onboard computing that executes commands and manages data.",
    detail:
      "Runs the flight software, stores telemetry, sequences activities, and detects faults. Processors are radiation-hardened and generations behind consumer parts because reliability outweighs raw speed.",
  },
  {
    term: "Fault Detection, Isolation, and Recovery",
    aka: ["FDIR"],
    category: "bus",
    short: "Autonomous logic that reacts to anomalies without ground help.",
    detail:
      "Necessary when light time or coverage gaps prevent timely intervention. The typical safe response is to enter a protective mode, hold power-positive and thermally safe attitude, and wait for instructions.",
  },
  {
    term: "Safe Mode",
    category: "bus",
    short: "Protective configuration entered after a detected fault.",
    detail:
      "Non-essential loads are shed, the spacecraft points to keep arrays illuminated, and it listens on a low-rate link. Science stops until operators diagnose and command a recovery.",
  },
  {
    term: "Single Event Upset",
    category: "bus",
    short: "Bit flip caused by a single energetic particle strike.",
    detail:
      "Mitigated with error detecting and correcting memory, redundancy, watchdogs, and periodic memory scrubbing. Rates rise sharply inside the radiation belts and during solar particle events.",
  },
  {
    term: "Redundancy",
    category: "bus",
    short: "Duplicate hardware or paths that preserve function after a failure.",
    detail:
      "Block redundancy duplicates whole strings; cross-strapping allows mixing units between strings. The design goal is no single point of failure for mission-critical functions.",
  },
  {
    term: "Outgassing",
    category: "bus",
    short: "Release of trapped gases from materials in vacuum.",
    detail:
      "Can contaminate optics, detectors, and thermal surfaces. Controlled through material selection, bake-out before launch, and venting paths that keep the plume away from sensitive surfaces.",
  },
  {
    term: "Atomic Oxygen Erosion",
    category: "bus",
    short: "Chemical erosion of surfaces by monatomic oxygen in LEO.",
    detail:
      "Highly reactive atomic oxygen degrades polymers and some coatings on ram-facing surfaces. Protective coatings and material choices are required for long LEO missions.",
  },
  {
    term: "CubeSat",
    category: "bus",
    short: "Standardised small satellite built from 10 cm units.",
    detail:
      "One unit is a 10 cm cube of roughly 1.3 kg; larger craft are described as 3U, 6U, or 12U. The standard interface and deployer made low-cost access routine for universities and startups.",
  },

  // ------------------------------------------------------------------ comms
  {
    term: "Telemetry, Tracking, and Command",
    aka: ["TT&C"],
    category: "comms",
    short: "The link that carries health data down and commands up.",
    detail:
      "Kept simple and robust, often with an omnidirectional antenna, so contact survives attitude loss. Ranging on the same link provides orbit determination measurements.",
  },
  {
    term: "Link Budget",
    category: "comms",
    short: "Accounting of gains and losses that shows whether a link closes.",
    detail:
      "Sums transmitter power, antenna gains, free space loss, atmospheric and pointing losses, and receiver noise to yield a signal-to-noise margin. Positive margin at the required data rate means the link closes.",
  },
  {
    term: "Free Space Path Loss",
    category: "comms",
    short: "Signal spreading loss that grows with distance and frequency.",
    detail:
      "Increases as the square of both range and frequency. It is why deep space missions need large dish antennas at both ends and why data rates fall steeply as a probe recedes.",
  },
  {
    term: "Effective Isotropic Radiated Power",
    aka: ["EIRP"],
    category: "comms",
    short: "Transmitter power combined with antenna gain in the pointing direction.",
    detail:
      "A single figure of merit for the transmit side of the link. Regulators cap EIRP density to protect other users of the band.",
  },
  {
    term: "Gain-to-Noise-Temperature Ratio",
    symbol: "G/T",
    category: "comms",
    short: "Figure of merit for a receiving station.",
    detail:
      "Combines antenna gain with system noise temperature. Low-noise amplifiers, cryogenic front ends, and large apertures all raise it, which is how faint deep space carriers are recovered.",
  },
  {
    term: "S-Band",
    category: "comms",
    short: "About 2 to 4 GHz; standard for command, telemetry, and ranging.",
    detail:
      "Rain effects are small and antennas are modest, so it suits robust low-rate links. Widely used for spacecraft housekeeping and for crewed vehicle voice and data.",
  },
  {
    term: "X-Band",
    category: "comms",
    short: "About 8 to 12 GHz; the workhorse for deep space and imaging downlink.",
    detail:
      "Offers more bandwidth than S-band with manageable weather losses. The Deep Space Network's primary science downlink band for most planetary missions.",
  },
  {
    term: "Ka-Band",
    category: "comms",
    short: "About 26 to 40 GHz; high data rate at the cost of rain sensitivity.",
    detail:
      "Supports the highest science return rates and broadband services, but rain fade requires larger margins, site diversity, or adaptive coding and modulation.",
  },
  {
    term: "UHF Relay",
    category: "comms",
    short: "Short-range link used between surface assets and orbiters.",
    detail:
      "Mars rovers relay most of their data through orbiters over UHF rather than talking to Earth directly, because the relay path needs far less power for far more throughput.",
  },
  {
    term: "Doppler Tracking",
    category: "comms",
    short: "Measuring range rate from the frequency shift of the carrier.",
    detail:
      "Two-way coherent Doppler gives extremely precise line-of-sight velocity, which is the backbone of deep space navigation and of gravity science experiments.",
  },
  {
    term: "Ranging",
    category: "comms",
    short: "Measuring distance from the round-trip time of a modulated signal.",
    detail:
      "Combined with Doppler and delta differential one-way ranging, it reduces orbit determination uncertainty to metres for Earth orbiters and kilometres across the solar system.",
  },
  {
    term: "Deep Space Network",
    aka: ["DSN"],
    category: "comms",
    short: "Three-site global antenna network for deep space communications.",
    detail:
      "Complexes near Goldstone, Madrid, and Canberra are spaced about 120 degrees apart so at least one always sees a given deep space target. Antennas up to 70 m support tracking, telemetry, command, and radio science.",
  },
  {
    term: "Ground Station Pass",
    category: "comms",
    short: "The window while a spacecraft is visible from a ground antenna.",
    detail:
      "A LEO pass typically lasts 5 to 12 minutes above a usable elevation, a handful of times per day per station, which caps how much data one site can recover.",
  },
  {
    term: "Store and Forward",
    category: "comms",
    short: "Recording data onboard for downlink during the next contact.",
    detail:
      "Necessary because most spacecraft are out of contact most of the time. Onboard storage and downlink capacity together set the effective science data rate.",
  },
  {
    term: "Forward Error Correction",
    category: "comms",
    short: "Coding that lets the receiver repair errors without retransmission.",
    detail:
      "Turbo and low-density parity check codes operate within a fraction of a decibel of the theoretical limit, which directly buys data rate or antenna size on deep space links.",
  },
  {
    term: "Light Time Delay",
    category: "comms",
    short: "One-way signal travel time, which forbids real-time control at distance.",
    detail:
      "About 1.3 seconds to the Moon, 4 to 24 minutes to Mars depending on geometry, and hours to the outer solar system. Entries, landings, and flybys must therefore be autonomous.",
  },
  {
    term: "Beacon Tone",
    category: "comms",
    short: "Minimal signal conveying spacecraft state with almost no bandwidth.",
    detail:
      "A small set of distinguishable tones tells operators whether the spacecraft is nominal or needs attention, allowing routine monitoring with very short antenna time.",
  },

  // ----------------------------------------------------------------- launch
  {
    term: "Gravity Turn",
    category: "launch",
    short: "Ascent profile that uses gravity to pitch the vehicle over.",
    detail:
      "After a short vertical rise the vehicle pitches slightly and then lets gravity rotate the velocity vector, keeping the airframe near zero angle of attack. This minimises steering losses and aerodynamic loads.",
  },
  {
    term: "Maximum Dynamic Pressure",
    aka: ["Max Q"],
    category: "launch",
    short: "Peak aerodynamic pressure during ascent.",
    detail:
      "Occurs roughly 60 to 90 seconds into flight where rising speed and falling air density peak together. Vehicles often throttle down through this region to limit structural loads.",
  },
  {
    term: "Gravity Loss",
    category: "launch",
    short: "Delta-v spent fighting gravity rather than gaining speed.",
    detail:
      "Every second thrusting against gravity costs about 9.8 m/s of potential velocity. Higher initial thrust-to-weight and prompt pitchover reduce the penalty; it is a major part of the difference between ideal and actual ascent delta-v.",
  },
  {
    term: "Drag Loss",
    category: "launch",
    short: "Delta-v lost to atmospheric drag during ascent.",
    detail:
      "Typically a few hundred metres per second, small next to gravity loss but enough to shape fairing design and the ascent trajectory.",
  },
  {
    term: "Payload Fairing",
    category: "launch",
    short: "Aerodynamic shroud protecting the payload during ascent.",
    detail:
      "Shields against dynamic pressure, aeroacoustic loads, and heating, then separates once outside the sensible atmosphere. Fairing volume often constrains spacecraft design more than mass does.",
  },
  {
    term: "Stage Separation",
    category: "launch",
    short: "Releasing a spent stage and starting the next.",
    detail:
      "Uses pyrotechnic or pneumatic mechanisms, sometimes with retro-thrust or spring pushers to guarantee clean separation. A critical event with little margin for recovery if it fails.",
  },
  {
    term: "Coast Phase",
    category: "launch",
    short: "Unpowered interval between burns during ascent.",
    detail:
      "Lets the vehicle reach the correct point in the orbit before the circularisation or transfer burn. Requires attitude control, thermal management, and propellant settling before restart.",
  },
  {
    term: "Launch Azimuth",
    category: "launch",
    short: "Compass heading at liftoff, which sets the achievable inclination.",
    detail:
      "Chosen from the launch site latitude and the target inclination, constrained by range safety corridors over populated areas. Eastward launches gain the most from Earth's rotation.",
  },
  {
    term: "Dogleg Maneuver",
    category: "launch",
    short: "In-flight azimuth change to reach an otherwise blocked inclination.",
    detail:
      "Steering out of the initial heading avoids overflight restrictions but costs performance, so it is used only when geography leaves no better option.",
  },
  {
    term: "Range Safety",
    category: "launch",
    short: "Rules and systems that protect people and property during launch.",
    detail:
      "Includes instantaneous impact point monitoring and an autonomous or commanded flight termination capability, plus keep-out zones on land, sea, and air.",
  },
  {
    term: "Hold-Down and Release",
    category: "launch",
    short: "Restraining the vehicle until thrust and health are verified.",
    detail:
      "Engines start, sensors confirm nominal chamber pressure and thrust, and only then do the restraints release. This protects against a low-thrust liftoff.",
  },
  {
    term: "Entry, Descent, and Landing",
    aka: ["EDL"],
    category: "launch",
    short: "The sequence from atmospheric interface to touchdown.",
    detail:
      "Combines a heat shield, deceleration, guidance, parachutes or propulsion, and touchdown hardware. At Mars the whole sequence runs autonomously in about seven minutes because of light time delay.",
  },
  {
    term: "Ballistic Coefficient",
    category: "launch",
    short: "Mass divided by drag coefficient times reference area.",
    detail:
      "A low value decelerates high in the atmosphere, useful for entry vehicles and for predicting satellite decay. It is the parameter that makes drag prediction tractable for catalogued objects.",
  },
  {
    term: "Aerodynamic Heating",
    category: "launch",
    short: "Heat load generated by compressing and shearing air during entry.",
    detail:
      "Peak heat rate and total heat load size the thermal protection system. Convective heating dominates at Earth entry speeds; radiative heating becomes important at very high entry velocities.",
  },
  {
    term: "Thermal Protection System",
    category: "launch",
    short: "Materials that keep entry heat out of the structure.",
    detail:
      "Ablators such as phenolic impregnated carbon char away to carry heat off; reusable tiles and reinforced carbon-carbon radiate it instead. Selection follows the expected heat rate and load.",
  },
  {
    term: "Blackout Period",
    category: "launch",
    short: "Communications interruption caused by entry plasma.",
    detail:
      "Ionised gas around the vehicle attenuates radio signals for part of the entry. Relay geometry and band selection can shorten it, but planning assumes a gap.",
  },
  {
    term: "Skip Entry",
    category: "launch",
    short: "Entry profile that briefly exits and re-enters the atmosphere.",
    detail:
      "Extends downrange control and spreads the heat load over two passes, which reduces peak deceleration. Used by Orion on Artemis I to improve landing accuracy.",
  },
  {
    term: "Terminal Descent",
    category: "launch",
    short: "Final phase from parachute release or hover to touchdown.",
    detail:
      "Options include retro-propulsion, airbags, crushable structure, or a sky crane. Precision landing needs terrain relative navigation and hazard detection during this phase.",
  },

  // ------------------------------------------------------------ environment
  {
    term: "Van Allen Belts",
    category: "environment",
    short: "Two regions of trapped energetic particles around Earth.",
    detail:
      "The inner belt is proton-dominated from roughly 1,000 to 6,000 km; the outer belt is electron-dominated from roughly 13,000 to 60,000 km. Spacecraft either avoid dwell time here or accept a hardening and shielding penalty.",
  },
  {
    term: "South Atlantic Anomaly",
    category: "environment",
    short: "Region where the inner radiation belt dips to low altitude.",
    detail:
      "Earth's offset magnetic field brings trapped protons down to LEO altitudes over the South Atlantic. Instruments are often safed during passes because upset and noise rates spike.",
  },
  {
    term: "Kp Index",
    category: "environment",
    short: "Planetary index of global geomagnetic activity, 0 to 9.",
    detail:
      "Derived from ground magnetometer measurements in three-hour intervals. Values of 5 and above indicate storm conditions with aurora at lower latitudes, increased satellite drag, and possible navigation and radio degradation.",
  },
  {
    term: "Solar Wind",
    category: "environment",
    short: "Continuous outflow of plasma from the Sun's corona.",
    detail:
      "Typically 300 to 800 km/s with a few particles per cubic centimetre near Earth, carrying the interplanetary magnetic field. Its speed and field orientation govern how strongly it couples to the magnetosphere.",
  },
  {
    term: "Coronal Mass Ejection",
    aka: ["CME"],
    category: "environment",
    short: "Large eruption of plasma and magnetic field from the Sun.",
    detail:
      "Can reach Earth in roughly 15 to 72 hours and drive geomagnetic storms that affect satellites, aviation at high latitudes, and power grids. Arrival time and severity are forecast from coronagraph imagery and upstream monitors.",
  },
  {
    term: "Solar Flare",
    category: "environment",
    short: "Sudden localised brightening on the Sun, classified A to X.",
    detail:
      "X-rays arrive at light speed and immediately disturb the ionosphere, causing high-frequency radio blackouts. Each letter class is a tenfold increase in peak X-ray flux.",
  },
  {
    term: "Solar Energetic Particle Event",
    category: "environment",
    short: "Burst of accelerated protons and ions from solar activity.",
    detail:
      "Can reach Earth within tens of minutes, raising radiation dose for crews and upset rates for electronics. The main radiation-safety driver for crewed missions beyond LEO.",
  },
  {
    term: "Galactic Cosmic Rays",
    category: "environment",
    short: "High-energy particles from outside the solar system.",
    detail:
      "Low flux but extremely energetic, so shielding is only partially effective and can produce secondary particles. The dominant long-term dose contributor on interplanetary transits.",
  },
  {
    term: "Total Ionising Dose",
    category: "environment",
    short: "Cumulative radiation absorbed over a mission.",
    detail:
      "Measured in rads or grays and used to qualify parts. Threshold shifts and leakage current in semiconductors accumulate until performance leaves specification, which sets radiation-limited design life.",
  },
  {
    term: "Spacecraft Charging",
    category: "environment",
    short: "Accumulation of electric charge on surfaces or in dielectrics.",
    detail:
      "Differential charging can produce arcing that damages solar arrays and injects noise into electronics. Managed with conductive coatings, grounding straps, and bonding practices.",
  },
  {
    term: "Micrometeoroid and Orbital Debris",
    aka: ["MMOD"],
    category: "environment",
    short: "Small natural and artificial particles that can perforate structures.",
    detail:
      "Millimetre-scale impacts at kilometres per second are the design case for Whipple shields and pressure vessel protection. Larger tracked objects are handled by avoidance manoeuvres instead.",
  },
  {
    term: "Kessler Syndrome",
    category: "environment",
    short: "Runaway debris growth from collision-generated fragments.",
    detail:
      "Described by Donald Kessler in 1978: above a certain object density, collisions generate debris faster than it decays, making some orbital bands progressively harder to use.",
  },
  {
    term: "Conjunction Assessment",
    category: "environment",
    short: "Screening predicted close approaches for collision risk.",
    detail:
      "Combines catalogue orbits with covariance to compute miss distance and probability of collision. Operators act above defined thresholds, usually with a small along-track burn days or hours out.",
  },
  {
    term: "Thermosphere Density Variation",
    category: "environment",
    short: "Large swings in upper atmosphere density that change drag.",
    detail:
      "Density at 400 km can vary by an order of magnitude with solar activity and geomagnetic storms. This is the biggest error source in LEO decay and conjunction prediction.",
  },
  {
    term: "Magnetosphere",
    category: "environment",
    short: "The region where Earth's magnetic field controls plasma motion.",
    detail:
      "Compressed to about 10 Earth radii on the dayside and drawn into a long tail on the nightside. It shields the surface from most solar wind particles and channels the rest towards the poles.",
  },
  {
    term: "Ionosphere",
    category: "environment",
    short: "Ionised layer of the upper atmosphere from about 60 to 1,000 km.",
    detail:
      "Refracts and delays radio signals, which is the largest single error source for single-frequency satellite navigation. Dual-frequency receivers and correction models remove most of it.",
  },
  {
    term: "Near-Earth Object",
    aka: ["NEO"],
    category: "environment",
    short: "Asteroid or comet with a perihelion below 1.3 astronomical units.",
    detail:
      "Tracked by surveys and catalogued by the Center for Near Earth Object Studies. A subset classed as potentially hazardous have minimum orbit intersection distances below 0.05 astronomical units and absolute magnitude brighter than 22.",
  },
  {
    term: "Lunar Distance",
    aka: ["LD"],
    category: "environment",
    short: "Average Earth-Moon distance, about 384,400 km, used for close approaches.",
    detail:
      "A convenient scale for asteroid encounters. Passes inside one lunar distance are common for small objects and are reported routinely without implying hazard.",
  },
  {
    term: "Astronomical Unit",
    aka: ["AU"],
    category: "environment",
    short: "Defined as exactly 149,597,870.7 km.",
    detail:
      "The standard unit for solar system distances. Mars orbits at about 1.52, Jupiter at about 5.2, and Neptune at about 30.1 astronomical units.",
  },
  {
    term: "Planetary Protection",
    category: "environment",
    short: "Preventing biological cross-contamination between worlds.",
    detail:
      "Missions are assigned categories with bioburden and trajectory-biasing requirements, both to protect potentially habitable environments and to keep future life detection results trustworthy.",
  },

  // ------------------------------------------------------------- operations
  {
    term: "Orbit Determination",
    category: "operations",
    short: "Estimating an orbit from tracking measurements.",
    detail:
      "Fits observations such as range, Doppler, angles, or global navigation satellite data to a dynamic model using least squares or filtering. The result includes a covariance describing how well the state is known.",
  },
  {
    term: "Covariance",
    category: "operations",
    short: "Statistical description of uncertainty in an estimated state.",
    detail:
      "Represented as an ellipsoid in position and velocity, usually largest along track. Realistic covariance is what makes probability of collision meaningful.",
  },
  {
    term: "NORAD Catalogue Number",
    aka: ["Satellite Catalog Number", "SATCAT"],
    category: "operations",
    short: "Sequential identifier assigned to a tracked space object.",
    detail:
      "Assigned in order of cataloguing, so lower numbers are older objects. The International Space Station is 25544. Alphanumeric extensions were introduced as the catalogue grew past five digits.",
  },
  {
    term: "International Designator",
    aka: ["COSPAR ID", "Launch ID"],
    category: "operations",
    short: "Identifier based on launch year, launch number, and object piece.",
    detail:
      "Formatted as year, sequential launch of that year, and a letter for the piece, for example 1998-067A for the first International Space Station element. It links every object back to its launch.",
  },
  {
    term: "Two-Body Propagation",
    category: "operations",
    short: "Predicting motion using only the primary's point-mass gravity.",
    detail:
      "Fast and analytic, adequate for visualisation over short spans. Operational prediction adds oblateness, drag, third-body gravity, and radiation pressure.",
  },
  {
    term: "Ephemeris",
    category: "operations",
    short: "Tabulated positions of a body over time.",
    detail:
      "Planetary and spacecraft ephemerides such as the JPL Development Ephemeris and Horizons products are the reference against which observations and pointing predictions are computed.",
  },
  {
    term: "Pass Prediction",
    category: "operations",
    short: "Computing when a spacecraft will be visible from a site.",
    detail:
      "Propagates the orbit, converts to topocentric coordinates, and reports rise, culmination, and set times with azimuth, elevation, and range. Optical visibility additionally requires a dark site and a sunlit spacecraft.",
  },
  {
    term: "Coordinated Universal Time",
    aka: ["UTC"],
    category: "operations",
    short: "The civil time standard used for all mission timelines.",
    detail:
      "Kept within a second of Earth rotation by leap seconds. Astrodynamics also uses Terrestrial Time and Barycentric Dynamical Time, and confusing time systems is a classic source of trajectory error.",
  },
  {
    term: "Julian Date",
    category: "operations",
    short: "Continuous day count used to avoid calendar arithmetic.",
    detail:
      "Counts days from 4713 BC in the Julian proleptic calendar. Element set epochs and ephemeris queries are commonly expressed in Julian or modified Julian dates.",
  },
  {
    term: "Ground Segment",
    category: "operations",
    short: "The antennas, control centre, and networks that operate a mission.",
    detail:
      "Includes tracking stations, mission operations and science centres, scheduling, and archives. It is a substantial share of total life cycle cost and is planned alongside the flight system.",
  },
  {
    term: "Flight Rule",
    category: "operations",
    short: "Pre-agreed decision that removes real-time debate.",
    detail:
      "Documents the action for a defined condition, for example when to wave off an approach. Written and reviewed in advance so time-critical calls are consistent and defensible.",
  },
  {
    term: "Go or No-Go Poll",
    category: "operations",
    short: "Structured readiness check before a critical event.",
    detail:
      "Each console operator reports readiness against defined criteria. Any no-go stops the sequence until it is resolved or explicitly waived.",
  },
  {
    term: "Commissioning Phase",
    aka: ["In-orbit checkout"],
    category: "operations",
    short: "Post-launch period of switching on and calibrating the spacecraft.",
    detail:
      "Deployments, subsystem activation, instrument calibration, and orbit trimming happen before routine operations begin. It can run from weeks to six months for complex observatories.",
  },
  {
    term: "Technology Readiness Level",
    aka: ["TRL"],
    category: "operations",
    short: "Nine-step scale for the maturity of a technology.",
    detail:
      "Level 1 is basic principles and level 9 is flight proven in an operational environment. Programmes commonly require a defined level before a design review, which shapes when new technology can be baselined.",
  },
  {
    term: "Mission Design Review Cycle",
    category: "operations",
    short: "Formal gates from concept study to launch readiness.",
    detail:
      "Typically mission concept review, system requirements review, preliminary and critical design reviews, then integration, test, and flight readiness. Defined in the NASA Systems Engineering Handbook lifecycle.",
  },
  {
    term: "Mass Margin",
    category: "operations",
    short: "Reserve between current best estimate mass and the allowable limit.",
    detail:
      "Held large early and consumed as the design matures, because mass reliably grows. Running out late in development forces performance cuts or a launch vehicle change.",
  },
  {
    term: "Design Reference Mission",
    category: "operations",
    short: "Representative mission profile used to size and verify a system.",
    detail:
      "A concrete scenario with timeline, environments, and data volumes, so requirements can be traced to something operational rather than argued in the abstract.",
  },
  {
    term: "End of Life Passivation",
    category: "operations",
    short: "Making a retired spacecraft inert.",
    detail:
      "Venting propellant, discharging batteries, and disabling pressure and energy sources so the object cannot explode and generate debris years later. A core debris mitigation requirement.",
  },
  {
    term: "Angle of Attack",
    category: "aviation",
    short: "The angle between the wing chord and the oncoming airflow.",
    detail:
      "Lift rises with angle of attack until the flow separates from the upper surface. Launch vehicles fly near zero angle of attack through peak loads to limit side forces.",
  },
  {
    term: "Stall",
    category: "aviation",
    short: "Loss of lift when the airflow separates from a wing.",
    detail:
      "Happens past the critical angle of attack, regardless of airspeed. Recovery means lowering the nose to reduce the angle of attack.",
  },
  {
    term: "Mach Number",
    category: "aviation",
    short: "Speed divided by the local speed of sound.",
    detail:
      "Below about Mach 0.8 flow is subsonic, around Mach 1 transonic, above 5 hypersonic. The speed of sound falls with temperature, so the same true speed gives a higher Mach number at altitude.",
    symbol: "M",
  },
  {
    term: "Lift-to-Drag Ratio",
    category: "aviation",
    short: "Lift divided by drag; a measure of aerodynamic efficiency.",
    detail:
      "Sets glide range. Airliners reach roughly 15 to 20; the Space Shuttle orbiter was close to 1 at hypersonic speed and about 4.5 on final approach (approximate).",
    symbol: "L/D",
  },
  {
    term: "Dynamic Pressure",
    category: "aviation",
    short: "The pressure from moving through air, one half of density times speed squared.",
    detail:
      "Peaks during ascent at Max Q. Structural and control loads scale with it.",
    symbol: "q",
  },
  {
    term: "Indicated Airspeed",
    category: "aviation",
    short: "Airspeed read from the pitot static system without corrections.",
    detail:
      "What the wing actually feels, so stall and structural limits are quoted in it. True airspeed is higher at altitude.",
    symbol: "IAS",
  },
  {
    term: "Flight Level",
    category: "aviation",
    short: "Altitude in hundreds of feet based on standard pressure.",
    detail:
      "FL350 means 35,000 feet with the altimeter set to 1013.25 hPa, so all aircraft above the transition altitude share one reference.",
    symbol: "FL",
  },
  {
    term: "Center of Pressure",
    category: "aviation",
    short: "The point where the total aerodynamic force acts.",
    detail:
      "For stable flight it sits behind the center of gravity. Rockets add fins to move it aft.",
    symbol: "CP",
  },
  {
    term: "Boundary Layer",
    category: "aviation",
    short: "The thin layer of air slowed by friction next to a surface.",
    detail:
      "It can be smooth (laminar) or turbulent. Turbulent boundary layers greatly raise heating on reentry vehicles.",
  },
  {
    term: "Sonic Boom",
    category: "aviation",
    short: "The shock wave pressure jump heard when a vehicle flies faster than sound.",
    detail:
      "Returning Falcon 9 boosters and the Space Shuttle produced audible double booms near landing sites.",
  },
];

export const GLOSSARY: GlossaryEntry[] = [...BASE_GLOSSARY, ...EXTRA_GLOSSARY];

export function glossaryCategoryLabel(id: GlossaryCategory): string {
  return GLOSSARY_CATEGORIES.find((c) => c.id === id)?.label ?? "Reference";
}
