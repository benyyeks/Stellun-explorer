# ORBITEX roadmap

## Feature batch 2026-10-11
- [x] Multi-satellite compare and high-orbit camera framing from supplied files
- [x] Mars surface map, preserving the gallery
- [x] Rename requested assistant surfaces to Orbitex AI
- [x] Study uploads with required book title and inline study-context assistant
- [x] Mission agency/target filters and T-60 live launch links
- [x] Verify free OpenRouter model and clear 402 handling
- [ ] Verify affected flows and publish green build

## Admin restoration
- [x] Restore styled health dashboard, Suggestions and Errors panels
- [x] Verify owner-only authorization rules; owner session, feedback delivery and error reporting checked end-to-end at five widths in both themes
- [ ] Publish restored admin (blocked: publication declined)

## In progress (approved plan 2026-10-01)
- [x] NASA_API_KEY stored securely; quota headers captured on every NASA call
- [x] Admin Site health shows live NASA hourly quota
- [x] Live satellite motion: live ISS feed, 1x/10x/60x speed, pulsing beacon + heading arrow (3D and 2D)
- [x] Move 3D controls below the canvas on Tracker and Deep Space, Reset zoom added
- [x] Palette utilization: alternating light/dark sections, reactive buttons, stronger type hierarchy (no gradients)
- [x] Ask ORBITEX knowledge overhaul: verified 2026 brief, live telemetry + flares, live web search, server-saved replies

## Done
- [x] Roman WFI telescope simulator (filters, magnification, exposure)
- [x] Roman mission timeline with status indicator
- [x] Roman archive-backed catalogue: real Hubble/Webb records from MAST, sample fallback
- [x] Roman tab in the Academy (textbook shelf, research sources, mission record)
- [x] Roman as a tracked object in Deep Space, with More details opening the full page
- [x] Removed Roman from the top menu and footer, kept the home grid entry
- [x] Deeper detail pages: long-form explanations with sources on the Sun, all planets, and all tracked probes
- [x] Mission Intelligence: all 37 missions listed inline, A to Z, with status and discipline filters, search, and CSV/JSON download
- [x] Past launches archive on the Launch Schedule page, with download

## Open
- [x] Roman news images: broken pictures fall back to a neutral placeholder tile
- [x] Live satellite motion on 3D globe and 2D map, batched for phones

## Requested 2026-09-23
- [x] Launch feed rate limiting: longer cache windows, no anonymous retry on quota errors
- [x] Restore engineering notes (orbital mechanics, regimes, spacecraft engineering) in the Academy
- [x] Mars Image Gallery: craft telemetry cards, filters by craft/camera/date, lightbox, craft write-ups
- [x] Persistent AI widget bottom right, context across pages (answers blocked: AI credits exhausted)
- [ ] Deep Space tracker: real NORAD TLEs instead of placeholders, reset-zoom toggle
- [ ] Asteroid 3D view with trajectory of the selected asteroid
- [ ] Mobile: 3D controls below the canvas, controls inside only in full screen; no mobile menu bar changes on desktop
- [ ] Space themed blue backgrounds across many sections sitewide, varied shades, not one flat tone
- [ ] Rewrite flat or obviously generated copy across the site
- [ ] Single combined data refresh cycle every 30 seconds updating every feed, stored accurately
- [ ] Admin diagnostics panel with per-second website health reporting

## Requested 2026-09-24
- [x] Deep Space clock reset loop fixed (reset only on "Now")
- [x] Satellite groups: longer timeout, retry, 6h cache for heavy groups, safe empty fallback
- [x] Mars gallery on the Mars page (verified wired and styled)
- [x] Profiles: photo upload / avatars, exact location pin on 2D and 3D maps
- [x] Academy: international STEM, competition card grid, aviation terms (Citizen Science and Mission Breakdown already placed)
- [ ] Mission Intelligence: agency and target filters, official More details links
- [ ] Launch live stream an hour before liftoff (also check YouTube)
- [ ] Tracker compare below map, 5 objects; retired probes listed but not in 3D
- [x] Learning workspace: textbook-linked Study desk with persistent notes, checklists, study paths, and prefilled Ask handoffs
- [x] ORBITEX AI on Lovable AI, accuracy pass
