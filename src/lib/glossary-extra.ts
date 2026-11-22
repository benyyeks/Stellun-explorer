// Additional terminology for the Academy's four tracks: Aviation, Astronomy,
// Aerospace, and STEM. Definitions follow standard textbook usage. Numeric
// values are the conventional figures and are labelled approximate where
// sources differ. Merged into GLOSSARY in glossary.ts.

import type { GlossaryEntry } from "./glossary";

export const EXTRA_GLOSSARY: GlossaryEntry[] = [
  // ------------------------------------------------------- astronomy: stars and galaxies
  {
    term: "Apparent magnitude",
    aka: ["m"],
    category: "stars-galaxies",
    short: "How bright a star looks from Earth. Smaller numbers are brighter.",
    detail:
      "The scale is logarithmic: a difference of 5 magnitudes is a brightness ratio of exactly 100. The Sun is about −26.7, Sirius about −1.5, and the faintest stars visible to the naked eye about +6.",
    symbol: "m",
    units: "mag",
  },
  {
    term: "Absolute magnitude",
    aka: ["M"],
    category: "stars-galaxies",
    short: "The apparent magnitude a star would have at a standard distance of 10 parsecs.",
    detail:
      "Absolute magnitude lets astronomers compare intrinsic brightness regardless of distance. Together with apparent magnitude it gives distance through the distance modulus.",
    symbol: "M",
    units: "mag",
  },
  {
    term: "Luminosity",
    category: "stars-galaxies",
    short: "Total energy a star radiates each second, across all wavelengths.",
    detail:
      "Measured in watts or in solar luminosities (the Sun is about 3.8 × 10²⁶ W). Luminosity depends on radius and surface temperature through the Stefan–Boltzmann law.",
    symbol: "L",
    units: "W or L☉",
  },
  {
    term: "Parallax",
    category: "stars-galaxies",
    short: "Apparent shift of a nearby star against distant background stars as Earth orbits the Sun.",
    detail:
      "Trigonometric parallax is the most direct way to measure distance. The distance in parsecs is 1 divided by the parallax angle in arcseconds.",
    symbol: "p",
    units: "arcsec",
  },
  {
    term: "Parsec",
    category: "stars-galaxies",
    short: "The distance at which one astronomical unit subtends one arcsecond; about 3.26 light-years.",
    detail:
      "The parsec is the standard distance unit in astronomy. Kiloparsecs and megaparsecs measure galactic and intergalactic distances.",
    units: "pc",
  },
  {
    term: "Light-year",
    category: "stars-galaxies",
    short: "The distance light travels in one Julian year, about 9.46 × 10¹² km.",
    detail:
      "A distance unit, not a time unit. Proxima Centauri, the nearest star beyond the Sun, is about 4.2 light-years away.",
    units: "ly",
  },
  {
    term: "Main sequence",
    category: "stars-galaxies",
    short: "The band of stars that fuse hydrogen into helium in their cores, where most stars spend their lives.",
    detail:
      "On the Hertzsprung–Russell diagram, more massive main-sequence stars are hotter, more luminous, and live shorter lives. The Sun is a main-sequence star.",
  },
  {
    term: "Red giant",
    category: "stars-galaxies",
    short: "A late-stage star that has expanded and cooled after exhausting its core hydrogen.",
    detail:
      "Hydrogen burning in a shell around the core drives the expansion. The Sun is expected to become a red giant in roughly five billion years.",
  },
  {
    term: "White dwarf",
    category: "stars-galaxies",
    short: "Dense, Earth-sized remnant of a low- to medium-mass star, held up by electron degeneracy pressure.",
    detail:
      "A white dwarf no longer fuses hydrogen and cools slowly over billions of years. Typical masses are about 0.5 to 0.6 solar masses.",
  },
  {
    term: "Neutron star",
    category: "stars-galaxies",
    short: "Extremely dense remnant of a massive star, made mostly of neutrons after a core-collapse supernova.",
    detail:
      "Typical radius is about 10 to 12 km and mass 1.2 to 2 solar masses. Rotating neutron stars can appear as pulsars.",
  },
  {
    term: "Supernova",
    category: "stars-galaxies",
    short: "Explosive death of a star that releases enormous energy and disperses heavy elements.",
    detail:
      "Type Ia supernovae come from white dwarfs in binary systems and serve as standard candles for distance measurement. Core-collapse supernovae end the lives of massive stars.",
  },
  {
    term: "Nebula",
    category: "stars-galaxies",
    short: "A cloud of gas and dust in space. Emission, reflection, dark, and planetary nebulae are the main types.",
    detail:
      "Emission nebulae glow because nearby hot stars ionise their gas. Dark nebulae block light from the stars behind them. Planetary nebulae are shells cast off by dying stars.",
  },
  {
    term: "Galaxy",
    category: "stars-galaxies",
    short: "A gravitationally bound system of stars, gas, dust, and dark matter. The Milky Way is one of billions.",
    detail:
      "The Hubble sequence sorts galaxies into spiral, barred spiral, elliptical, lenticular, and irregular types.",
  },
  {
    term: "Milky Way",
    category: "stars-galaxies",
    short: "The barred spiral galaxy that contains the Sun, roughly 100,000 light-years across.",
    detail:
      "The Sun lies about 26,000 light-years from the galactic centre. The name also refers to the faint band of light visible across a dark night sky.",
  },
  {
    term: "Redshift",
    category: "stars-galaxies",
    short: "Stretching of light toward longer wavelengths, caused by recession or by the expansion of space.",
    detail:
      "Redshift z = (λobserved − λemitted) / λemitted. It is the main evidence that the universe is expanding.",
    symbol: "z",
  },
  {
    term: "Hubble's law",
    category: "stars-galaxies",
    short: "Distant galaxies recede at a speed proportional to their distance: v = H₀ × d.",
    detail:
      "H₀ is the Hubble constant. Its exact value is still debated between measurement methods, with values near 70 km/s/Mpc in common use.",
    symbol: "H₀",
    units: "km/s/Mpc",
  },
  {
    term: "Pulsar",
    category: "stars-galaxies",
    short: "A rapidly rotating neutron star that sweeps beams of radio emission past Earth, seen as regular pulses.",
    detail:
      "Pulsars are among the most precisely timed objects known. Their timing has been used to test general relativity.",
  },
  {
    term: "Stellar black hole",
    category: "stars-galaxies",
    short: "A black hole formed when a massive star collapses. Its mass is typically above about three solar masses.",
    detail:
      "The event horizon sits at the Schwarzschild radius, R = 2GM/c². Nothing, including light, can escape from inside it.",
  },
  {
    term: "Binary star",
    category: "stars-galaxies",
    short: "Two stars that orbit a common centre of mass.",
    detail:
      "Measuring binary orbits is one of the few direct ways to find a star's mass.",
  },
  {
    term: "Cosmic microwave background",
    aka: ["CMB"],
    category: "stars-galaxies",
    short: "Relic thermal radiation from about 380,000 years after the Big Bang, now at about 2.7 K.",
    detail:
      "The CMB is nearly uniform across the sky, with tiny temperature fluctuations that seeded galaxies and clusters.",
    units: "K",
  },
  {
    term: "Dark matter",
    category: "stars-galaxies",
    short: "Unseen matter inferred from its gravity on galaxies and clusters. It neither emits nor absorbs light.",
    detail:
      "Its nature is unknown. Rotation curves of spiral galaxies are among the main evidence for it.",
  },
  {
    term: "Dark energy",
    category: "stars-galaxies",
    short: "The cause of the accelerating expansion of the universe. Its nature is unknown.",
    detail:
      "In the standard cosmological model, dark energy makes up roughly two-thirds of the total energy content of the universe.",
  },
  {
    term: "Constellation",
    category: "stars-galaxies",
    short: "One of 88 officially recognised regions of the sky, named after star patterns.",
    detail:
      "Constellations are sky regions for navigation and reference, not physical groups of stars. Their stars can be at very different distances.",
  },
  {
    term: "Hertzsprung–Russell diagram",
    aka: ["HR diagram"],
    category: "stars-galaxies",
    short: "Plot of luminosity against surface temperature for stars. It shows the main sequence, giants, and white dwarfs.",
    detail:
      "Stellar evolution is traced as paths across the diagram. Stars of different masses occupy different regions.",
  },

  // ------------------------------------------------------- astronomy: solar system
  {
    term: "Terrestrial planet",
    category: "solar-system",
    short: "A rocky planet with a solid surface: Mercury, Venus, Earth, and Mars.",
    detail:
      "Terrestrial planets are denser and smaller than the giants, and have few or no large moons.",
  },
  {
    term: "Gas giant",
    category: "solar-system",
    short: "A massive planet made mostly of hydrogen and helium: Jupiter and Saturn.",
    detail:
      "Gas giants have deep atmospheres with no solid surface. Jupiter is more than twice as massive as all the other planets combined.",
  },
  {
    term: "Ice giant",
    category: "solar-system",
    short: "A planet with a deep icy mantle above a rocky core: Uranus and Neptune.",
    detail:
      "Ice giants contain more water, ammonia, and methane than the gas giants, and their magnetic fields are strongly tilted.",
  },
  {
    term: "Asteroid belt",
    category: "solar-system",
    short: "The region between Mars and Jupiter where most asteroids orbit the Sun.",
    detail:
      "Despite its reputation, the belt is sparse. Its total mass is less than that of Earth's Moon.",
  },
  {
    term: "Kuiper belt",
    category: "solar-system",
    short: "A region of icy bodies beyond Neptune's orbit, which includes Pluto.",
    detail:
      "Short-period comets are thought to come from the Kuiper belt, which extends from about 30 to 50 astronomical units.",
  },
  {
    term: "Comet",
    category: "solar-system",
    short: "A small icy body that develops a glowing coma and tail as it approaches the Sun.",
    detail:
      "Outgassing from the nucleus forms the coma and tail. Tails always point away from the Sun, pushed by the solar wind and radiation pressure.",
  },
  {
    term: "Albedo",
    category: "solar-system",
    short: "The fraction of incident sunlight a surface reflects. Earth's average is about 0.3.",
    detail:
      "Albedo controls how much energy a planet absorbs, which affects its temperature. Snow and ice have high albedo; deep ocean has low albedo.",
    symbol: "A",
  },
  {
    term: "Axial tilt",
    aka: ["obliquity"],
    category: "solar-system",
    short: "The angle between a planet's rotation axis and the normal to its orbit. Earth's is about 23.4°.",
    detail:
      "Axial tilt, not distance from the Sun, is the main cause of Earth's seasons.",
    units: "°",
  },
  {
    term: "Exoplanet",
    category: "solar-system",
    short: "A planet orbiting a star other than the Sun. Thousands have been confirmed.",
    detail:
      "The first confirmed exoplanets orbit a pulsar and a Sun-like star, both discovered in the 1990s.",
  },
  {
    term: "Transit method",
    category: "solar-system",
    short: "Detects an exoplanet from the small, regular dip in starlight as it passes in front of its star.",
    detail:
      "The dip's depth gives the planet's size relative to the star. Transit surveys such as Kepler found most known exoplanets.",
  },
  {
    term: "Radial velocity method",
    category: "solar-system",
    short: "Detects an exoplanet from the Doppler wobble it causes in its star's motion.",
    detail:
      "The method gives the planet's minimum mass. It is complementary to the transit method, which gives size.",
  },
  {
    term: "Habitable zone",
    category: "solar-system",
    short: "The range of distances from a star where liquid water could exist on a planet's surface.",
    detail:
      "Also called the Goldilocks zone. Its location depends on the star's luminosity and on the planet's atmosphere.",
  },

  // ------------------------------------------------------- astronomy: observing
  {
    term: "Refracting telescope",
    category: "observing",
    short: "A telescope that focuses light with lenses. Chromatic aberration is its main limit.",
    detail:
      "Colour fringing comes from lenses bending different wavelengths by different amounts. Achromatic and apochromatic designs reduce it.",
  },
  {
    term: "Reflecting telescope",
    category: "observing",
    short: "A telescope that collects light with a curved mirror. Most large research telescopes are reflectors.",
    detail:
      "Mirrors avoid chromatic aberration and can be made much larger than lenses. Newtonian and Cassegrain are common reflector designs.",
  },
  {
    term: "Aperture",
    category: "observing",
    short: "The diameter of a telescope's main light-collecting element. It sets light-gathering power and resolution.",
    detail:
      "Doubling the aperture quadruples the light collected. Aperture also sets the diffraction limit on resolution.",
    units: "mm or m",
  },
  {
    term: "Angular resolution",
    category: "observing",
    short: "The smallest angular separation a telescope can distinguish, approximately 1.22 λ/D.",
    detail:
      "This is the Rayleigh criterion for a circular aperture: λ is the wavelength and D the aperture diameter. Atmospheric turbulence often limits ground telescopes more than diffraction does.",
    units: "rad or arcsec",
  },
  {
    term: "Adaptive optics",
    category: "observing",
    short: "Deformable mirrors that cancel atmospheric turbulence in real time, sharpening images from ground telescopes.",
    detail:
      "A guide star, natural or laser, measures the distortion, and the mirror is reshaped many times per second.",
  },
  {
    term: "Spectroscopy",
    category: "observing",
    short: "Splitting light into its wavelengths to reveal composition, temperature, velocity, and other properties.",
    detail:
      "Absorption and emission lines are the fingerprints of elements. Doppler shifts of those lines measure radial velocity.",
  },
  {
    term: "Interferometry",
    category: "observing",
    short: "Combining light from separated telescopes to reach the resolution of a telescope as wide as their separation.",
    detail:
      "The Event Horizon Telescope imaged a black hole this way, linking radio telescopes across the Earth.",
  },
  {
    term: "Light pollution",
    category: "observing",
    short: "Artificial light that brightens the night sky and hides faint objects.",
    detail:
      "Light pollution is measured on the Bortle scale, from 1 (pristine dark sky) to 9 (inner-city sky).",
  },

  // ------------------------------------------------------- astronomy: celestial coordinates and time
  {
    term: "Celestial sphere",
    category: "celestial",
    short: "An imaginary sphere on which stars appear to lie, used as a reference for sky coordinates.",
    detail:
      "The celestial sphere is a model, not a physical object. Its poles and equator are projections of Earth's own.",
  },
  {
    term: "Right ascension",
    aka: ["RA"],
    category: "celestial",
    short: "Celestial longitude, measured eastward from the vernal equinox, usually in hours, minutes, and seconds.",
    detail:
      "Right ascension and declination together fix a star's position independent of the observer's location and time.",
    symbol: "α",
    units: "h m s",
  },
  {
    term: "Declination",
    aka: ["Dec"],
    category: "celestial",
    short: "Celestial latitude, measured north or south of the celestial equator in degrees.",
    detail:
      "Objects at the celestial north pole have declination +90°. Declination determines whether a star is visible from a given latitude.",
    symbol: "δ",
    units: "°",
  },
  {
    term: "Celestial equator",
    category: "celestial",
    short: "The projection of Earth's equator onto the celestial sphere. It is zero declination.",
    detail:
      "It is tilted against the ecliptic by the obliquity of the ecliptic, about 23.4°.",
  },
  {
    term: "Ecliptic",
    category: "celestial",
    short: "The apparent yearly path of the Sun across the celestial sphere.",
    detail:
      "The planets lie close to the ecliptic because the solar system is nearly flat. The zodiac constellations lie along it.",
  },
  {
    term: "Vernal equinox",
    category: "celestial",
    short: "The point where the ecliptic crosses the celestial equator moving north. It is zero right ascension.",
    detail:
      "The equinox slowly moves westward over about 26,000 years, a motion called precession.",
  },
  {
    term: "Altitude and azimuth",
    category: "celestial",
    short: "Horizon coordinates: altitude above the horizon, and azimuth measured along the horizon from north.",
    detail:
      "Altitude and azimuth change with time and observer location. Telescope mounts are often driven in these coordinates.",
    units: "°",
  },
  {
    term: "Sidereal day",
    category: "celestial",
    short: "The time for Earth to rotate once relative to the distant stars: about 23 h 56 min 4 s.",
    detail:
      "The solar day is about four minutes longer, because Earth also moves along its orbit each day.",
  },

  // ------------------------------------------------------- STEM: mathematics
  {
    term: "Vector",
    category: "mathematics",
    short: "A quantity with both magnitude and direction, such as velocity or force.",
    detail:
      "Vectors add by components and are drawn as arrows. Their components depend on the chosen coordinate frame.",
  },
  {
    term: "Scalar",
    category: "mathematics",
    short: "A quantity with magnitude only, such as mass, time, or temperature.",
    detail:
      "Scalars combine by ordinary arithmetic. Speed is a scalar; velocity is the corresponding vector.",
  },
  {
    term: "Derivative",
    category: "mathematics",
    short: "The instantaneous rate of change of one quantity with respect to another. It is the slope of a curve.",
    detail:
      "Velocity is the derivative of position with respect to time, and acceleration is the derivative of velocity.",
  },
  {
    term: "Integral",
    category: "mathematics",
    short: "The accumulation of a quantity. A definite integral gives the area under a curve between two limits.",
    detail:
      "Integration reverses differentiation. Distance travelled is the integral of speed over time.",
  },
  {
    term: "Differential equation",
    category: "mathematics",
    short: "An equation relating a function to its derivatives. It governs motion, heat flow, and orbits.",
    detail:
      "Newton's second law applied to a body is a differential equation. Solving it gives the body's trajectory.",
  },
  {
    term: "Eigenvalue",
    category: "mathematics",
    short: "A scalar λ such that A·v = λv for some non-zero vector v. Used in stability and vibration analysis.",
    detail:
      "The eigenvalues of a system matrix show whether a system is stable and at what frequencies it vibrates.",
    symbol: "λ",
  },
  {
    term: "Logarithm",
    category: "mathematics",
    short: "The exponent to which a base must be raised to give a number. Used for scales such as magnitude and decibels.",
    detail:
      "log(ab) = log a + log b. Logarithmic scales compress very large ranges, as in the stellar magnitude scale.",
  },
  {
    term: "Least squares",
    category: "mathematics",
    short: "A method of fitting a model by minimising the sum of squared differences between data and model.",
    detail:
      "Least squares is the standard way to fit orbits, calibrate instruments, and estimate parameters from noisy measurements.",
  },
  {
    term: "Standard deviation",
    category: "mathematics",
    short: "A measure of how spread out data are around the mean.",
    detail:
      "Written σ. For a normal distribution, about 68% of values lie within one standard deviation of the mean.",
    symbol: "σ",
  },
  {
    term: "Taylor series",
    category: "mathematics",
    short: "An expansion of a function as an infinite sum of its derivatives at one point.",
    detail:
      "Truncating a Taylor series gives approximations that engineers use for small angles, small velocities, and linearised models.",
  },

  // ------------------------------------------------------- STEM: physics
  {
    term: "Newton's second law",
    category: "physics",
    short: "The net force on a body equals its mass times its acceleration: F = ma.",
    detail:
      "The law applies in the inertial frame. Rocket and aircraft equations of motion are built from it.",
  },
  {
    term: "Newton's third law",
    category: "physics",
    short: "Every action has an equal and opposite reaction. The basis of rocket propulsion.",
    detail:
      "A rocket pushes exhaust backward, and the exhaust pushes the rocket forward. Wings push air down, and the air pushes the wing up.",
  },
  {
    term: "Conservation of momentum",
    category: "physics",
    short: "In a closed system the total momentum remains constant.",
    detail:
      "Momentum conservation explains rocket thrust, collisions, and the recoil of a gun.",
  },
  {
    term: "Conservation of energy",
    category: "physics",
    short: "Energy cannot be created or destroyed, only converted from one form to another.",
    detail:
      "Orbital energy, kinetic plus gravitational potential, stays constant on a Keplerian orbit.",
  },
  {
    term: "Kinetic energy",
    category: "physics",
    short: "Energy of motion: KE = ½mv².",
    detail:
      "Kinetic energy grows with the square of speed, so doubling speed quadruples it.",
  },
  {
    term: "Potential energy",
    category: "physics",
    short: "Stored energy due to position in a force field. Gravitational potential energy is −GMm/r.",
    detail:
      "Potential energy is defined only up to a constant. Orbital mechanics takes it as zero at infinity.",
  },
  {
    term: "Work",
    category: "physics",
    short: "Force applied through a distance: W = F·d·cos θ.",
    detail:
      "Work is a scalar. Only the component of force along the displacement does work.",
  },
  {
    term: "Power",
    category: "physics",
    short: "The rate at which work is done or energy is transferred: P = W/t.",
    detail:
      "Power is measured in watts. Aircraft and rocket engines are rated by power or thrust.",
    units: "W",
  },
  {
    term: "Torque",
    category: "physics",
    short: "The turning effect of a force about a point: τ = r × F.",
    detail:
      "Torque sets how fast a body spins up. Control surfaces create torque about an aircraft's centre of gravity.",
    symbol: "τ",
    units: "N·m",
  },
  {
    term: "Angular momentum",
    category: "physics",
    short: "Rotational momentum, L = Iω. It is conserved when no external torque acts.",
    detail:
      "Angular momentum conservation explains why a spinning skater speeds up when pulling in their arms, and why a satellite's orbit keeps its shape.",
  },
  {
    term: "Centripetal acceleration",
    category: "physics",
    short: "Acceleration toward the centre of a circular path: a = v²/r.",
    detail:
      "Centripetal acceleration is provided by a real force, such as gravity for a satellite or lift for a banked turn.",
  },
  {
    term: "Universal gravitation",
    category: "physics",
    short: "The attractive force between two masses: F = Gm₁m₂/r², with G ≈ 6.674 × 10⁻¹¹ N·m²/kg².",
    detail:
      "Newton's law of gravitation. The orbital period of a satellite follows from it, and from centripetal acceleration.",
    symbol: "G",
  },
  {
    term: "Doppler effect",
    category: "physics",
    short: "The change in observed frequency or wavelength when a source and observer move relative to each other.",
    detail:
      "The Doppler effect measures the radial velocity of stars, the speed of approaching or receding vehicles, and the radar speed of aircraft.",
  },
  {
    term: "Electromagnetic spectrum",
    category: "physics",
    short: "The full range of electromagnetic radiation, from radio waves to gamma rays. All travel at the speed of light in vacuum.",
    detail:
      "Astronomers observe the sky across the spectrum. Some wavelengths, such as X-rays and most infrared, are blocked by the atmosphere and need space telescopes.",
  },
  {
    term: "Black-body radiation",
    category: "physics",
    short: "Thermal radiation from an ideal absorber whose spectrum depends only on its temperature.",
    detail:
      "Wien's displacement law gives the peak wavelength from temperature. Stars and the cosmic microwave background are close to black bodies.",
  },
  {
    term: "Stefan–Boltzmann law",
    category: "physics",
    short: "The total power radiated per unit area by a black body is σT⁴.",
    detail:
      "σ is the Stefan–Boltzmann constant, about 5.67 × 10⁻⁸ W/(m²·K⁴). Temperature enters to the fourth power.",
    symbol: "σ",
  },
  {
    term: "Inverse-square law",
    category: "physics",
    short: "The intensity of radiation or gravity falls with the square of distance.",
    detail:
      "Doubling the distance from a light source cuts its brightness to one quarter. Gravity and radiation both obey it.",
  },
  {
    term: "First law of thermodynamics",
    category: "physics",
    short: "Energy is conserved: ΔU = Q − W.",
    detail:
      "The change in internal energy equals heat added minus work done by the system. Engine cycles are analysed with it.",
  },
  {
    term: "Entropy",
    category: "physics",
    short: "A measure of disorder. In an isolated system it never decreases.",
    detail:
      "The second law of thermodynamics limits the efficiency of every heat engine and sets the direction of natural processes.",
    symbol: "S",
  },
  {
    term: "Ideal gas law",
    category: "physics",
    short: "PV = nRT, relating pressure, volume, amount of gas, and temperature.",
    detail:
      "Real gases approach this law at low pressure and high temperature. It sets the standard atmosphere model used in aviation.",
  },
  {
    term: "Reynolds number",
    category: "physics",
    short: "The ratio of inertial to viscous forces in a flow. It determines whether the flow is laminar or turbulent.",
    detail:
      "Re = ρvL/μ. Wind tunnel tests are scaled by matching Reynolds number to the full-size aircraft.",
    symbol: "Re",
  },
  {
    term: "Density",
    category: "physics",
    short: "Mass per unit volume: ρ = m/V.",
    detail:
      "Air density falls with altitude, which lowers lift, engine power, and propeller efficiency.",
    symbol: "ρ",
    units: "kg/m³",
  },
  {
    term: "Pressure",
    category: "physics",
    short: "Force per unit area. Standard sea-level atmospheric pressure is 101,325 Pa.",
    detail:
      "Pressure drops with height. Pilots set altimeters to a reference pressure to read altitude.",
    symbol: "p",
    units: "Pa",
  },
  {
    term: "Resonance",
    category: "physics",
    short: "A system driven at its natural frequency responds with a large amplitude.",
    detail:
      "Resonance can be useful, as in tuned circuits, or dangerous, as when a structure or engine vibrates at a natural frequency.",
  },
  {
    term: "Simple harmonic motion",
    category: "physics",
    short: "Oscillation in which the restoring force is proportional to displacement.",
    detail:
      "A mass on a spring and a small pendulum both follow simple harmonic motion. Its period does not depend on amplitude for small swings.",
  },

  // ------------------------------------------------------- STEM: engineering
  {
    term: "Stress",
    category: "engineering",
    short: "Force per unit area in a material: σ = F/A.",
    detail:
      "Normal stress acts perpendicular to a surface; shear stress acts parallel to it.",
    symbol: "σ",
    units: "Pa",
  },
  {
    term: "Strain",
    category: "engineering",
    short: "Relative deformation: the change in length divided by the original length.",
    detail:
      "Strain is dimensionless. Elastic strain disappears when the load is removed; plastic strain does not.",
    symbol: "ε",
  },
  {
    term: "Young's modulus",
    category: "engineering",
    short: "The ratio of stress to strain in the elastic range. It measures stiffness.",
    detail:
      "Aluminium alloys have a Young's modulus of about 70 GPa, and carbon fibre composites are stiffer along the fibre direction.",
    symbol: "E",
    units: "Pa",
  },
  {
    term: "Factor of safety",
    category: "engineering",
    short: "The ratio of failure load to working load: a deliberate design margin.",
    detail:
      "Aircraft structures are designed to ultimate loads of about 1.5 times limit loads, which is a common factor of safety.",
  },
  {
    term: "Fatigue",
    category: "engineering",
    short: "Cracking and failure caused by repeated loading, even at stresses below the static strength.",
    detail:
      "Fatigue is a leading cause of structural failure in aircraft. Inspection intervals are set to find cracks before they grow to critical size.",
  },
  {
    term: "Finite element analysis",
    aka: ["FEA"],
    category: "engineering",
    short: "A numerical method that divides a structure into small elements to predict stress and deformation.",
    detail:
      "FEA is used for wings, rocket structures, heat shields, and most other load-bearing parts. Results are only as good as the model and boundary conditions.",
  },
  {
    term: "Computational fluid dynamics",
    aka: ["CFD"],
    category: "engineering",
    short: "Numerical simulation of fluid flow by solving the governing equations on a grid or mesh.",
    detail:
      "CFD complements wind tunnel testing. It predicts lift, drag, heating, and mixing in engines.",
  },
  {
    term: "Systems engineering",
    category: "engineering",
    short: "The discipline of defining requirements, designing, integrating, and verifying complex systems.",
    detail:
      "Systems engineering links the requirements of the mission to the design of each subsystem and tracks them through testing.",
  },
  {
    term: "Verification and validation",
    category: "engineering",
    short: "Verification checks that the design meets its specification. Validation checks that it meets the user's real need.",
    detail:
      "A design can pass verification and still fail validation if the specification itself was wrong.",
  },
  {
    term: "Failure modes and effects analysis",
    aka: ["FMEA"],
    category: "engineering",
    short: "A systematic review of how each component can fail, and what the consequences would be.",
    detail:
      "FMEA ranks failure modes by severity, occurrence, and detectability to decide where to add design margin or redundancy.",
  },
  {
    term: "Trade study",
    category: "engineering",
    short: "A structured comparison of design options against weighted criteria.",
    detail:
      "Trade studies make design choices traceable. They record why one option was chosen over another.",
  },
  {
    term: "Feedback control",
    category: "engineering",
    short: "Using a measured output to adjust the input and reduce the error from a desired value.",
    detail:
      "Autopilots, engine governors, and attitude control systems are all feedback controllers.",
  },
  {
    term: "PID controller",
    category: "engineering",
    short: "A controller that combines proportional, integral, and derivative terms of the error.",
    detail:
      "The proportional term reacts to the present error, the integral term removes steady offset, and the derivative term anticipates change.",
  },
  {
    term: "Signal-to-noise ratio",
    aka: ["SNR"],
    category: "engineering",
    short: "The ratio of signal power to noise power, usually expressed in decibels.",
    detail:
      "Radio links, sensors, and telescope detectors are all limited by their signal-to-noise ratio.",
    units: "dB",
  },

  // ------------------------------------------------------- aviation (gaps)
  {
    term: "Stall speed",
    aka: ["Vs"],
    category: "aviation",
    short: "The minimum speed at which the wing stalls in a given configuration.",
    detail:
      "Stall speed rises with weight and load factor, and falls with flaps extended. Pilots fly above it with a margin.",
    symbol: "Vs",
    units: "kt",
  },
  {
    term: "Centre of gravity",
    aka: ["CG"],
    category: "aviation",
    short: "The point through which an aircraft's weight acts. It must stay within published limits for safe flight.",
    detail:
      "A forward CG improves stability but needs more elevator force; an aft CG reduces stability and can make recovery from a stall impossible.",
  },
  {
    term: "Pitot-static system",
    category: "aviation",
    short: "Measures total and static pressure to give airspeed, altitude, and vertical speed.",
    detail:
      "Blockage of the pitot tube or static port gives false airspeed or altitude readings.",
  },
  {
    term: "International Standard Atmosphere",
    aka: ["ISA"],
    category: "aviation",
    short: "A reference atmosphere: 15 °C and 1013.25 hPa at sea level, with temperature falling about 6.5 °C per km.",
    detail:
      "Aircraft performance charts and altimeter settings are referenced to ISA.",
  },
  {
    term: "Load factor",
    category: "aviation",
    short: "The ratio of lift to weight in a manoeuvre. It is 1 g in level unaccelerated flight.",
    detail:
      "In a steep turn the load factor rises, and so does the stall speed. Structural limits are expressed as maximum load factors.",
    units: "g",
  },
  {
    term: "Adverse yaw",
    category: "aviation",
    short: "Yaw in the opposite direction to a roll, caused by the drag of the raised aileron.",
    detail:
      "Frise ailerons and differential aileron deflection reduce adverse yaw. Rudder input counters it.",
  },
];
