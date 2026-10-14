# Mars surface map v3

## Scope
Replace the Mars map with the supplied v3 design, directly below the Mars banner. Keep the existing distance statistics and gallery after it. Do not modify admin, tracker, or unrelated pages.

## Implementation
1. Use the latest `mars-map-v3-2.zip`, confirmed identical to the earlier v3 archive. Use its `mars-sites.ts` and `mars-traverses.ts` contents as-is. Replace the map component with the supplied version, allowing only the agreed minimal interaction and compatibility fixes.
2. Save your attached 1920 × 960 equirectangular mosaic to `public/textures/mars-mdim.jpg`, preserving its full rectangular projection without cropping or regenerating it.
3. Replace old `.mars-map*` styles with the complete supplied `mars-map.css`, including its map legend styles. Preserve all unrelated styles and existing ORBITEX glass presentation.
4. Move the single map instance into the first section after the page banner. Preserve the existing statistics, orbital information, and image gallery below it.
5. Correct wheel handling with a non-passive listener, delta-sensitive zoom, and current-state cursor anchoring. Add touch pinch using the same anchoring math. Zoom buttons anchor at the viewport center. Keep all scaling and translation inside the clipped, fixed-size frame.
6. Keep pan, reset, zoom percentage, fullscreen, site-centering, labels, filters, legend, colored simplified paths, mission highlights, official links, and NASA rover-map links. Never describe the supplied paths as live GPS.

## Verification
- Confirm the real mosaic loads and matches the map's longitude orientation.
- Measure the outer frame before and after wheel/button/pinch zoom: its dimensions must remain unchanged.
- Exercise cursor anchoring, touch pan/pinch, reset, fullscreen entry/exit, pin selection and centering.
- Check rover-path toggles, status filters, highlights, and official/NASA links.
- Verify one map immediately beneath the banner, with statistics and gallery retained below.
- Test phone, tablet, and desktop widths in light and dark modes; inspect screenshots and check overflow and runtime errors.
- Add focused interaction-math tests, run them, and require the automatic app checks to pass.
- List every changed file and publish after successful verification. Publication also includes the previously completed, unpublished feature batch.

## Technical files
- `public/textures/mars-mdim.jpg` (your supplied 1920 × 960 mosaic)
- `src/lib/mars-sites.ts`
- `src/lib/mars-traverses.ts`
- `src/components/mars/mars-surface-map.tsx`
- `src/routes/_authenticated/mars.tsx`
- `src/styles.css`
- A focused Mars interaction test file, plus `roadmap.md` and `AGENTS.md` for the checklist and interaction rule.

The supplied component uses fixed wheel increments and React wheel handling. Only minimal fixes are approved; no redesign or unrelated content rewrite is included.