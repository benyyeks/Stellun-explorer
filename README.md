# Stellun

Hi so I was recently working on a project and I would like you to finish it I already built something section of it , so I want you to lick finish up the project for me . I also created an hand over document, which I would be providing by copying and pasting , fit understand the whole project concept, goal.... Before actually doing anything, it there are any thing missing let me know so I can provide them 

# STELLUN — Project Handover & Master Specification



**Purpose:** A complete, standalone spec for STELLUN so any developer or AI tool can pick this up cold and continue correctly. Read Section 2 first.



## 1. What STELLUN Is



STELLUN is an independent, research-grade space intelligence dashboard for students, researchers, and space enthusiasts. Not affiliated with NASA, NOAA, ESA, or any space agency.



**Core promise:** every number is either fetched live from a named, credible source (NASA, NOAA, CelesTrak, JPL, The Space Devs, Open-Meteo) or computed from a documented, verifiable formula. Nothing is invented. When live data can't be reached, the site says so rather than showing fabricated numbers.



**Visual identity:** minimal, academic, professional — closer to a research journal than a flashy consumer app. Deliberately steered away from the "AI-generated SaaS" look (neon gradients, over-decorated icons) that the original logo and palette were found to resemble.



**Tagline:** "See beyond the sky"



## 2. Critical Rules (non-negotiable)



1. **Never write API keys/secrets into any committed or browser-served file.** Secrets live only in Netlify environment variables, read via `process.env.X` server-side. Supabase's URL and `anon`/`publishable` key are the only exceptions, safe by design via Row Level Security.

2. **Never call third-party APIs directly from client-side JS.** `api.nasa.gov` and most space-data APIs send no CORS headers for browser requests, confirmed against NASA's own bug tracker after the site shipped broken from this exact assumption. Everything routes through a Netlify Function proxy. Exception: Supabase's REST API is confirmed CORS-open (their Cloudflare layer force-injects it), so `news-client.js` calls it directly.

3. **No em dashes anywhere in user-facing text.** Use a period, comma, or colon instead. Third-party/AI-generated content pulled in from outside sources has violated this repeatedly — always check before shipping anything not written fresh.

4. **Verify before building, every time.** Never assume an API's behavior, a CDN path, a CORS policy, a rate limit. Confirm via search/docs first. Every skip of this rule caused a real bug.

5. **Data accuracy is paramount.** Never fabricate a stat, deadline, or fact. Unverifiable data gets omitted or clearly labeled as an estimate with its methodology (see Section 7's probe-distance fallback for the reference pattern).

6. **Build in phases, checkpoint constantly.** The dev sandbox filesystem has proven ephemeral and can reset without warning, destroying uncommitted work. Export/zip current state after every file or small handful of files, never after large batches. This is the single costliest lesson of the whole project.

7. **Treat outside-sourced code as unverified input.** A parallel AI-generated version of this codebase supplied mid-project had em dashes throughout and a missing critical function despite looking structurally similar. Anything adopted from outside must be checked against this document first.

8. **Respect the design system exactly.** No new colors, fonts, or gradient decoration. The restraint is deliberate.



## 3. Design System



**Philosophy:** Minimal, academic. Warm neutrals dominate; one deep muted accent handles interaction; a warm highlight color is reserved for rare emphasis. Glassmorphism ("glass bubble" surfaces) is the consistent signature card treatment.



**Why this palette:** The original bright indigo/periwinkle palette and neon logo read as generic "AI-generated SaaS." Replaced with ink-navy + warm amber on warm paper, evoking star charts and astronomical ink illustration.



**Usage ratio:** 70% neutral / 20% accent / 7% highlight / 3% semantic (status only, never decorative).



**Light mode tokens:**

```

--color-bg: #f2f0ea         --color-text: #211f1a

--color-bg-solid: #fdfcfa   --color-text-muted: #625c50

--color-accent: #1f3555     --color-text-faint: #8c8577

--color-accent-strong: #16273f

--color-highlight: #96601f

--color-success: #3c7a4a  --color-warning: #96601f  --color-danger: #a8402f

```



**Dark mode tokens:**

```

--color-bg: #16140f         --color-text: #efece4

--color-bg-solid: #1c1a15   --color-text-muted: #b3ac9d

--color-accent: #8ca5d6

--color-highlight: #dda05f

--color-success: #6bbf82  --color-warning: #dda05f  --color-danger: #e0806e

```

All pairs verified against real WCAG contrast math; lowest ratio 4.62:1 (AA minimum is 4.5:1).



Light/dark follows OS `prefers-color-scheme` by default; manual toggle persists via `localStorage` (`stellun-theme`). A separate non-module blocking script (`theme-boot.js`) applies stored overrides before first paint — `type="module"` is deferred and runs too late, a real bug that was caught and fixed.



**Typography:** Lora (serif) for headings — editorial register. Inter for body/UI. JetBrains Mono for all data/telemetry readouts.



**Glassmorphism:** `.glass`/`.glass-card`/`.glass-pill` — `backdrop-filter: blur(20px)`, diagonal highlight overlay for a reflective sheen, solid-background fallback for unsupported browsers, hover lift with stronger shadow.



**Logo:** Single tilted orbital ellipse + one solid satellite node, monochrome via `currentColor` (auto-adapts light/dark). Replaced an earlier cluttered neon mark (ring + paper-airplane + concentric rings + dotted radiating lines) assessed as looking AI-generated.



**Layout:** Fixed desktop header (≥960px) with full nav; hamburger + slide-down drawer below that, grouped under section labels. Shared footer component (`js/shared/footer.js`), not copy-pasted HTML. `.page-main` (header clearance) wraps `.container` (1180px max, or `.container.narrow` at 760px for long-form pages).



## 4. Technical Architecture



**Stack:** Plain static HTML/CSS/JS (ES modules), no framework, no build step. Netlify Functions (Node.js serverless) as an API proxy layer. Supabase (Postgres + PostgREST) for persistent data. Deployed to Netlify.



**Why no framework:** Deliberate choice for a lightweight, fast-loading, dependency-free site matching the "as light weight as possible" requirement from the original brief.



**Why the proxy layer exists:** Discovered that NASA (and most space APIs) don't support direct browser calls. Every external API call goes through `/.netlify/functions/{name}`, which fetches server-side and returns JSON, keeping API keys server-side and sidestepping CORS entirely.



**File structure convention:**

```

/index.html, /tracker.html, /deepspace.html, ... (one HTML file per page)

/css/base.css          (shared design system + shared components)

/css/{page}.css        (page-specific styles only)

/js/shared/*.js         (shared engines/utilities, ES modules)

/js/pages/page-{name}.js (page-specific logic, ES modules)

/netlify/functions/*.js (one function per external API)

/netlify/functions/_shared/*.js (shared function helpers: utils, cache)

/assets/                (favicons, manifest, static JSON like competitions.json)

/supabase/schema.sql    (database schema reference)

```



**Rule for shared vs. page-specific CSS:** if a pattern (stat cards, filter pills, badges) is used on more than one page, it belongs in `base.css`, not duplicated per page. This was violated once early on and corrected.



**Netlify config (`netlify.toml`):** publishes root directory, functions in `netlify/functions`, security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy restricting geolocation to same-origin), pretty-URL redirects (`/tracker` → `/tracker.html`) for every page.



## 5. Verified Technical Knowledge



This section contains formulas and data already numerically verified — trust these over re-deriving from scratch.



**Astronomy engine (`js/shared/astronomy-engine.js`):** JPL's "Keplerian Elements for Approximate Positions of the Major Planets," Table 1 (valid 1800–2050 AD), sourced directly from `ssd.jpl.nasa.gov/planets/approx_pos.html`. Includes a, e, I, L, longitude of perihelion, longitude of ascending node (plus per-century rates) for all 8 planets. Kepler's equation solved via Newton's method. Verified: Earth lands at ~1.016 AU near July aphelion; Mars/Jupiter/Saturn periods reproduce the textbook 687d/4333d/10756d values.



Moon phase uses an abbreviated lunar theory (largest periodic terms only), cross-checked against real published moon-phase data for July 2026 — accurate to within about a day/few percent illumination, appropriate for naked-eye sky planning, not telescope pointing.



**Satellite propagation (`js/shared/satellite-engine.js`):** Kepler orbit solver with J2 secular perturbations (nodal/apsidal precession) — a lightweight approximation of full SGP4, most accurate within days of the TLE epoch. Verified against known ISS parameters: ~400–430km altitude, ~7.66km/s, ~92–93min period, all reproduced correctly. Parses CelesTrak's OMM JSON format (preferred over legacy fixed-width TLE text, which truncates newer 5-digit-plus NORAD catalog numbers).



**Deep space probe distances (`js/shared/probe-data.js`):** Primary source is a live JPL Horizons query; if that fails, falls back to a physics estimate: a documented distance at a known date, extrapolated using the probe's known recession speed. Anchor values (verified): Voyager 1 ~170 AU as of Jan 2026 at ~17.0 km/s; Voyager 2 ~142.5 AU at ~15.4 km/s; New Horizons ~60 AU as of Oct 2024 at ~15.3 km/s; JWST ~1.5M km (Sun-Earth L2 halo orbit); Juno's distance computed live from Earth-Jupiter geometry via the astronomy engine; Parker Solar Probe shows orbital range facts (perihelion 0.046 AU, aphelion 0.73 AU) rather than an extrapolated live number, since its orbit is too fast/eccentric to extrapolate safely. Fallback figures are always labeled "Estimated," never presented as live.



**Data source CORS status (verified, don't re-guess):**

- `api.nasa.gov` (APOD, Mars Photos, NeoWs, DONKI) — NO browser CORS support. Must proxy.

- Spaceflight News API (`api.spaceflightnewsapi.net`) — NO browser CORS support (confirmed via a tutorial that hit this exact error). Must proxy.

- Supabase REST API — CORS-open by design, confirmed via PostgREST docs + a GitHub issue about Supabase's platform forcing wildcard CORS. Safe to call directly from the browser.

- Open-Meteo — genuinely CORS-open (multiple independent sources confirm), proxied anyway for architectural consistency.

- NOAA SWPC, CelesTrak, wheretheiss.at, JPL Horizons, Launch Library 2 — proxied for consistency; not individually confirmed CORS-blocked but treated the same way for uniformity and centralized caching.



**Mars weather:** NASA retired the public InSight/REMS weather feed after InSight's mission ended December 2022. Do not show Mars surface weather; omit rather than display stale data.



**Netlify Functions caching gotcha (verified via Netlify's own support forum):** Netlify's Function-level CDN caching can ignore query string parameters, meaning `?rover=curiosity` and `?rover=perseverance` could get conflated. This is why an explicit application-level cache (Supabase-backed, `_shared/cache.js`) is used for the NASA-key-limited endpoints instead of relying purely on Cache-Control headers.



**Supabase free-tier pause policy (verified via Supabase's own docs):** Projects with no database activity for 7 days get auto-paused (data preserved, needs manual resume). A daily scheduled write (the news refresh function) prevents this automatically as a side effect.



**OpenRouter free tier (verified, mid-2026):** No credit card required. 20 requests/minute, 50/day on an unfunded account, rising to 1,000/day permanently after any one-time $10+ credit purchase. Free models rotate without much notice — the model ID is isolated as a single constant (`MODEL_ID` in `ask-ai.js`) specifically so it's a one-line fix if a model gets pulled. Currently set to `meta-llama/llama-3.3-70b-instruct:free`.



## 6. Complete Page Inventory (14 pages)



| Page | Route | Purpose | Key data sources |

|---|---|---|---|

| Landing | `/` | Hero, platform overview stats, explore grid linking every tool, local weather widget, space news deck, competitions deck, feedback form | Launches, NEO count, Earth weather, news (Supabase-first), competitions |

| Orbit Tracker | `/tracker` | Live 3D Earth globe, real satellite positions from live TLE data, Hubble specifically pinned, group filters, click-to-select detail panel | CelesTrak (via `satellites.js`), procedural Earth textures/shaders |

| Deep Space | `/deepspace` | 3D solar system, real planetary orbits, live probe distance tracking | JPL Horizons, astronomy engine, probe-data.js |

| Mars | `/mars` | Latest rover photos (Curiosity/Perseverance), sol/manifest stats, lightbox gallery | NASA Mars Photos API |

| Space Weather | `/weather` | Kp-index chart, solar wind, IMF Bz, aurora outlook, DONKI notifications | NOAA SWPC, NASA DONKI |

| Sky Tonight | `/sky` | Moon phase, sun/moon rise-set, live planet visibility for user's location | Astronomy engine (client-side, no network needed) |

| Asteroid Watch | `/neo` | Upcoming close approaches ranked by miss distance, hazard filter | NASA NeoWs |

| Launches | `/launches` | Next launch with live countdown, upcoming schedule, detail dialog | Launch Library 2 |

| Stellun AI | `/ask` | Grounded AI chat using live ISS/Kp context | OpenRouter (via `ask-ai.js`) |

| About & Sources | `/about` | Full data source list, methodology transparency for every computed figure | Static content, references live sources |

| Privacy Policy | `/privacy` | Accurate description of what data is/isn't collected | Static content |

| Research Library | `/research` | *Planned, not yet built* — academic aerospace reference content | To be sourced from credible aerospace organizations |

| Mission Intelligence | `/intelligence` | *Planned, not yet built* — deeper mission analysis content | To be sourced |

| Engineering Notes | `/engineering` | *Planned, not yet built* — technical/engineering explainer content | To be sourced |

| Learning Resources | `/resources` | *Planned, not yet built* — educational reference material | To be sourced |



**Feedback form:** Uses Netlify Forms (`data-netlify="true"`, honeypot field for spam), submitted via AJAX (no page reload). Email notification requires a one-time manual step in Netlify's dashboard (Site configuration → Forms → Form notifications) — not automatable via API/MCP tools available during development.



## 7. Backend Infrastructure Inventory



**Netlify Functions (all in `netlify/functions/`):**

`apod.js`, `neo.js`, `mars-photos.js`, `mars-manifest.js`, `donki.js` — NASA-key endpoints, all routed through the Supabase-backed cache (`_shared/cache.js`) to protect the shared rate limit.

`kp-index.js`, `solar-wind.js` — NOAA SWPC, no key needed.

`satellites.js` — CelesTrak, supports both `?group=` and `?catnr=` (for pinning specific objects like Hubble, NORAD ID 20580).

`iss-position.js` — wheretheiss.at.

`horizons.js` — JPL Horizons, probe name mapped through a strict allowlist to NAIF IDs (never passes raw client input to the query).

`launches.js` — Launch Library 2, tries an optional token then falls back to the public tier automatically.

`weather-earth.js` — Open-Meteo, validates lat/lon ranges server-side.

`news.js` — Spaceflight News API live proxy (fallback path when Supabase is unavailable).

`ask-ai.js` — OpenRouter proxy for Stellun AI, POST-only, validates/caps input length.

`refresh-news.js` — scheduled (`@daily`), fetches fresh news, upserts into Supabase, prunes anything older than 60 days.

`refresh-news-now.js` — manual-trigger twin of the above, for immediate population after deploy.



**Shared function helpers (`_shared/`):** `utils.js` (CORS/preflight handling, JSON/text response builders, input allowlisting), `cache.js` (Supabase-backed read-through cache with stale-on-error fallback), `news-refresh-core.js` (the actual fetch+upsert+prune logic used by both refresh functions).



**Supabase schema:**

- `space_news` table: id (bigint, matches source API id), content_type, title, summary, url, image_url, news_site, published_at, fetched_at. RLS: public SELECT only; writes only via service_role key.

- `competitions` table: id, name, organizer, description, url, category, opens_at, deadline, is_active. RLS: public SELECT where is_active=true only. Currently seeded with 5 real, verified competitions (NASA Space Apps Challenge, Conrad Challenge, AIAA Design/Build/Fly, CanSat Competition, ISSDC).

- `api_cache` table: cache_key (text, primary key), response_body, content_type, cached_at. No public RLS policy at all — accessible only via service_role, used purely as server-side infrastructure.



**Environment variables needed (names only, actual values are set in Netlify's dashboard, never in files):**

`NASA_API_KEY`, `LAUNCH_LIBRARY_KEY` (optional), `OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. (`SUPABASE_URL` and the public `anon`/`publishable` key also live directly in `js/shared/supabase-config.js`, since that file is meant to be client-visible.)



**Client-side data layer:** `js/shared/api-client.js` (single-source GET wrappers for every function above, consistent `{ok, data/error}` envelope), `js/shared/news-client.js` (Supabase-first with automatic live-proxy fallback for news and competitions specifically, since those need the smarter chaining logic).



## 8. Current Build Status



Given the sandbox reset issues (Section 2, Rule 6), status should always be re-verified against the actual filesystem before trusting any written record, including this one. As of the last verified checkpoint:



**Confirmed built and working:** all shared JS engines, all core Netlify Functions including the caching layer, the news refresh/retention system, `base.css` design system, `nav.js` and `footer.js` shared components, the Landing page. Supabase database live with schema applied and competitions seeded. All Netlify environment variables set.



**Built previously, lost to sandbox resets, needs rebuilding from this spec (or from conversation history if available):** About, Privacy, Space Weather, Asteroid Watch, Launches, Mars, Sky Tonight, Stellun AI, Orbit Tracker, `assets/` folder contents.



**Never built, only planned:** Deep Space page, the four Academic pages (Research/Intelligence/Engineering/Resources — currently only exist as nav links), the site-wide link audit.



## 9. Lessons Learned (avoid repeating these)



- Don't assume any API supports browser CORS without checking; api.nasa.gov and Spaceflight News API both don't.

- Multiple SELECT statements in one Supabase `execute_sql` call only return the last result; combine into one query with subqueries.

- Netlify Function CDN caching can ignore query strings; use an explicit application-level cache when responses vary by parameter.

- `type="module"` scripts are deferred and run after first paint; anything that must run before paint (like theme flash prevention) needs a classic blocking script instead.

- Don't trust third-party/AI-generated code drops at face value, even when structurally similar; check for the same standards (em dashes, security, missing functions) as everything else.

- The dev sandbox filesystem can reset without warning; only `/mnt/user-data/outputs/` (or wherever the real deployment target is) has proven durable. Checkpoint constantly.

- Splitting a monolithic file into modules by string-index slicing is error-prone; verify no content duplicated across the resulting files afterward.



## 10. Remaining Work (priority order)



1. Rebuild the 8 lost core pages (About, Privacy, Weather, NEO, Launches, Mars, Sky, Ask) — content and logic already proven once, should be faster to redo.

2. Rebuild Orbit Tracker (3D globe, satellite propagation, Hubble pinning).

3. Build Deep Space (3D solar system + probe tracking) — never built, needs fresh work following the pattern in Section 5.

4. Research and build the 4 Academic pages with real, sourced, dated content from credible Aerospace 

5. Full site-wide link audit — every internal route and every external link, confirmed working and pointing to the right place.

6. Regenerate favicon PNGs (procedural SVG source already documented in Section 3.6, PNGs are rendered from it via a headless browser screenshot, not hand-authored).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://orbitex-explorer.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b75a23eb-d1be-4426-8b18-9b58133462ed).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
