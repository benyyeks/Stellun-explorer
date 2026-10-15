// Verified milestones for Stellun AI. Irreversible or slow-moving facts
// checked against official agency sources on VERIFIED_ON.
//
// Day-to-day numbers (current sol, ISS lat/lon, Kp, next launch NET, headlines)
// are injected at answer time from live feeds in src/routes/api/ask.tsx.
// This file does not auto-update; liveContext() does. Refresh VERIFIED_ON and
// the lines below only when a major milestone changes.

export const VERIFIED_ON = "7 October 2026";

export const MISSION_BRIEF: readonly string[] = [
  // -------------------- NASA / US exploration --------------------
  "Artemis II (NASA): launched 1 April 2026 on SLS Block 1 with Reid Wiseman, Victor Glover, Christina Koch and Jeremy Hansen. Crewed lunar flyby completed; splashdown 10 April 2026 (11 April UTC). Mission complete.",
  "Artemis III (NASA): targeted for 2027 as a crewed Earth-orbit demonstration, not a lunar landing. Exact launch date not yet announced.",
  "Artemis IV (NASA): targeted for 2028 as the first Artemis crewed landing near the lunar south pole. Not a firm date.",
  "Nancy Grace Roman Space Telescope (NASA): launched 30 August 2026 on Falcon Heavy from Kennedy LC-39A to Sun-Earth L2. Commissioning under way through late 2026; routine science expected early 2027.",
  "James Webb Space Telescope (NASA/ESA/CSA): operating at Sun-Earth L2 since 2022; routine science ongoing.",
  "Hubble Space Telescope (NASA/ESA): still operating in low Earth orbit; limited but active observing program.",
  "Parker Solar Probe (NASA): active heliophysics mission; multiple Venus assists completed; continues closer solar approaches on the published schedule.",
  "Europa Clipper (NASA): launched October 2024, cruise to Jupiter. Next Earth gravity assist 3 December 2026; Jupiter arrival planned 11 April 2030.",
  "Psyche (NASA): Mars flyby 15 May 2026; arrival at asteroid 16 Psyche targeted for summer 2029.",
  "Juno (NASA): operating in Jupiter orbit; extended mission science ongoing.",
  "New Horizons (NASA): operating in the Kuiper Belt / outer heliosphere after the Pluto and Arrokoth encounters.",
  "Voyager 1 and 2 (NASA): both in interstellar space; limited instruments still returning data as RTG power declines.",
  "OSIRIS-APEX (NASA): extended OSIRIS-REx mission en route to asteroid Apophis for the 2029 Earth encounter study.",
  "DART outcome (NASA): 2022 kinetic impact on Dimorphos successfully changed the moonlet orbital period; ESA Hera is the European follow-up survey.",

  // -------------------- Mars surface (milestones; sols are live) --------------------
  "Curiosity / MSL (NASA): landed 2012 in Gale Crater; climbing Mount Sharp since 2014. Still active in the sulfate-bearing unit on the lower slopes of Mount Sharp.",
  "Curiosity elevation milestone (NASA/JPL, 2026): on about 26 August 2026 (near sol 4996) the rover reached 1 kilometre of elevation above the Gale Crater floor, the greatest climb of any vehicle on Mars. Yardang-layer science is a later goal (roughly 2027 to 2028).",
  "Curiosity sol 5000 (NASA/JPL, 2026): the mission marked its 5,000th Martian day around 30 August 2026, with panoramas from a sandy ridge (Chocolatal) published in early September. A look-back panorama toward the crater floor was taken about sol 5006 (5 September 2026).",
  "Curiosity status rule: region is Mount Sharp / sulfate unit in Gale Crater. Exact current sol and map cell change daily. Prefer the live STELLUN Mars raw-frame sol from the telemetry block over any static sol number in this list.",
  "Perseverance / Mars 2020 (NASA): landed 18 February 2021 in Jezero Crater; active; sample caching ongoing along crater margin terrain. Exact sol changes daily; use live Mars feed.",
  "Ingenuity (NASA): Mars helicopter technology demonstration at Jezero; flight campaign completed after an extended series of flights (historical milestone).",
  "ExoMars Trace Gas Orbiter (ESA): operational Mars orbiter and data relay since 2016.",
  "Mars Express (ESA): operational Mars orbiter since 2003.",
  "Tianwen / Chinese Mars programme (CNSA): China maintains independent Mars exploration capability as part of its planetary programme.",

  // -------------------- Moon / lunar exploration --------------------
  "Artemis programme (NASA and partners): crewed lunar return architecture. Artemis II (crewed flyby) is complete; surface landing is planned on a later Artemis flight, not Artemis III under the current demonstration plan.",
  "Commercial Lunar Payload Services / CLPS (NASA): commercial lander programme supporting Artemis science and logistics. Through the first nine months of 2026 no new CLPS soft landing had been recorded; later 2026 attempts (including Griffin-class and Blue Ghost-class missions) remain schedule-dependent.",
  "Griffin / Moon Base II class (Astrobotic / partners): large commercial lander intended for lunar south-polar delivery including mobility payloads; targeted no earlier than late 2026, subject to launch and integration readiness.",
  "Blue Ghost (Firefly): prior CLPS lander that achieved an upright landing and operated through a lunar day; further Blue Ghost missions (including far-side concepts with relay support) remain in the commercial pipeline.",
  "Chang'e programme (CNSA): series of robotic lunar orbiters, landers and sample-return missions. Chang'e-7 (south-polar water-ice survey with orbiter, lander, rover and hopper elements) was postponed out of its planned 2026 launch window after a comprehensive readiness assessment; no firm new date in that window.",
  "Chandrayaan programme (ISRO): Chandrayaan-3 achieved soft landing near the lunar south pole in 2023; further lunar missions remain on the Indian roadmap.",
  "SLIM (JAXA): small lunar lander; demonstrated precision landing technology in 2024 (historical milestone for Japanese lunar landing capability).",
  "Lunar Gateway: international lunar-orbit habitat concepts have been reduced or re-scoped relative to earlier Artemis plans; treat Gateway elements as planning-dependent, not as an operating station.",

  // -------------------- ESA / Europe --------------------
  "JUICE (ESA): launched 14 April 2023; Earth gravity assist completed 28 September 2026; cruise to Jupiter continues (arrival early 2030s; first spacecraft planned to orbit Ganymede).",
  "Euclid (ESA): launched 1 July 2023; operational dark-Universe survey at Sun-Earth L2.",
  "Solar Orbiter (ESA/NASA): launched February 2020; operational; Venus flybys raise inclination for solar-polar science.",
  "BepiColombo (ESA/JAXA): launched 20 October 2018; Mercury cruise ongoing; orbit insertion targeted late 2020s.",
  "Hera (ESA): launched 7 October 2024; en route to Didymos-Dimorphos as the European planetary-defence follow-up to DART.",
  "SMILE (ESA/CAS): launched 19 May 2026; active solar-wind and magnetosphere imaging mission.",
  "Gaia (ESA): primary astrometric survey complete; data products define the Galactic reference frame.",
  "XMM-Newton and INTEGRAL (ESA): long-running high-energy astrophysics observatories still operating.",
  "PLATO (ESA): terrestrial planet hunter in development; launch targeted around 2027.",
  "Ariel (ESA): exoplanet atmosphere surveyor in development; launch targeted early 2030s.",
  "EnVision (ESA): Venus orbiter in development; launch targeted early 2030s.",
  "LISA (ESA): space gravitational-wave observatory in development; launch targeted mid-2030s.",
  "Copernicus / Sentinels (ESA/EU): operational Earth-observation constellation (Sentinel-1, -2, -5P and related missions).",
  "EarthCARE and Biomass (ESA): operational Earth-science missions (clouds/aerosols/radiation and forest biomass).",

  // -------------------- JAXA / Japan --------------------
  "Hayabusa2 extended mission (JAXA): after Ryugu sample return, still active; successful flyby of asteroid 2001 CC21 (Torifune) on 5 July 2026 with science data collected.",
  "XRISM (JAXA/NASA): launched 7 September 2023; operations extended toward March 2030 after strong early results (Resolve gate-valve constraint remains a known limit).",
  "MMX (JAXA): Martian moons sample-return; prepared for H3 launch in Japanese fiscal 2026; multi-year Mars-system and Earth-return timeline.",
  "Mio / MMO (JAXA on BepiColombo): Mercury magnetospheric orbiter element cruising with the ESA-JAXA stack.",

  // -------------------- ISRO / India --------------------
  "Gaganyaan (ISRO): human spaceflight programme; first uncrewed experimental flight targeted late 2026 per ISRO leadership statements; crewed flight after successful uncrewed tests.",
  "ISRO 2026 manifest: active national launch plan including navigation (NVS), Earth observation and technology missions on PSLV, GSLV, LVM3 and SSLV.",
  "Bharatiya Antariksh Station (ISRO): planned Indian space station; operational target in the mid-2030s per national vision statements.",

  // -------------------- CNSA / China --------------------
  "Tiangong (CNSA): continuously crewed since 2022; three-module station (Tianhe, Wentian, Mengtian) with Shenzhou crew and Tianzhou cargo; one of two permanently occupied stations with the ISS as of 2026.",
  "Shenzhou programme (CNSA): operational crew transport to Tiangong on roughly six-month expedition cycles.",
  "Tianwen planetary programme (CNSA): independent Mars and planetary exploration line.",

  // -------------------- Crewed orbital infrastructure --------------------
  "International Space Station (NASA, Roscosmos, ESA, JAXA, CSA): continuously crewed since November 2000; operations planned through about 2030, then controlled reentry with a US Deorbit Vehicle. Exact reentry date not fixed.",
  "Commercial Crew (NASA/SpaceX): Crew Dragon is the primary US crew transport to the ISS. Crew-12 undocked about 7 October 2026 after a long-duration stay; Crew-13 docked about 1 October 2026.",
  "Soyuz (Roscosmos): continues ISS crew transport alongside Commercial Crew.",
  "Commercial LEO destinations: successor station concepts in development; none had matched continuous ISS/Tiangong occupancy as of late 2026.",

  // -------------------- Launch vehicles --------------------
  "Starship (SpaceX): Flight 14 on 28 September 2026 was an early orbital attempt with Starlink V3 deployment; returned early after an engine problem.",
  "Falcon 9 / Falcon Heavy (SpaceX): operational; Falcon Heavy launched Roman on 30 August 2026.",
  "New Glenn (Blue Origin): last flew NG-3 on 19 April 2026; return-to-flight targeted within 2026 after a May 2026 hot-fire anomaly.",
  "Ariane 6 (Arianespace/ESA): Europe's heavy launcher in institutional and commercial service.",
  "H3 (JAXA/Mitsubishi): operational Japanese flagship; planned MMX launcher.",
  "LVM3 / GSLV / PSLV / SSLV (ISRO): operational Indian launch fleet.",
  "Long March family (CNSA): operational Chinese launch fleet for Tiangong, lunar and planetary missions.",

  // -------------------- Environment and catalogues --------------------
  "Space weather: NOAA SWPC leads public Kp, solar wind and GOES X-ray products; ESA and NASA contribute solar and heliophysics assets. STELLUN displays these live.",
  "Orbital catalogue: CelesTrak and related public element sets power the STELLUN Orbit Tracker.",
  "Planetary defence: DART demonstrated kinetic deflection in 2022; Hera provides the European characterisation of Dimorphos.",
];

export function knowledgeBlock(): string {
  return [
    `Verified mission milestones (checked on ${VERIFIED_ON} against NASA, JPL, ESA, JAXA, ISRO, CNSA, NOAA and related official sources). These override training memory. They are not a live position, sol, or weather feed:`,
    ...MISSION_BRIEF.map((l) => `- ${l}`),
    "Self-updating data rule: for current Curiosity or Perseverance sol, ISS coordinates, Kp, next launch, flares, or headlines, use only the live STELLUN telemetry block injected with this prompt (and official web results if provided). Never invent a sol, coordinate, crew count, or date that is not in those live sources.",
  ].join("\n");
}
