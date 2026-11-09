# Phase 5 — engineering laboratory

Status: **partial system coverage**. A working wheel-corner/brake-reference laboratory is implemented using the actual vehicle assets. Engine, suspension and structural chassis laboratories remain blocked by missing independently authored geometry. No replacement primitive models are introduced.

## Available laboratory

The engineering view isolates one of the four actual wheel-corner assemblies from the same cached GLB used by the showroom. Each corner maps its supplied brake-labelled mesh, rim, tire, wheel core, centre trim and fastener geometry to explicit registry IDs. Catalog validation checks source hierarchy, unique layer IDs, mesh availability and original source role names.

The reference brake-labelled mesh is not verified as a complete disc/caliper/hub assembly. Labels and information panels do not claim separate authored discs, calipers or hubs, and provide no invented dimensions, material compositions or performance ratings.

## Working interactions

- Choose front left, front right, rear left or rear right.
- Inspect brake geometry alone or show the complete supplied wheel-corner geometry.
- Toggle all six actual source-geometry layers independently.
- Select the supplied brake, rim and tire components from either visible geometry or the part list. Selecting a listed hidden part makes its layer visible.
- Isolate a selected part; subsequent selections change the isolated part within the chosen corner.
- Separate and assemble the brake/rim/tire reference geometry using the Phase 4 GSAP controller, with adjustable distance and pause/resume. The corner assembly itself stays in its authored location.
- Fit the assembly, focus the selected part, orbit, pan, zoom, use camera perspectives and automatic rotation.
- Reset the lab or leave for Showroom, Components or Disassembly, restoring original transforms and the appropriate visibility for the destination.
- Read actual imported material labels, component relationships and explicit asset-coverage limitations.

The lab defaults to the supplied brake-labelled mesh alone. Separation reveals the brake, rim and tire layers. Other source layers are optional visual context, not claims of independently verified hub or suspension components.

## Architecture

- `src/features/engineering/catalog.ts`: four authored corner mappings, source layer roles, visible-layer filtering, separation targets and missing-system descriptions.
- `src/stores/engineering-store.ts`: corner, visibility, separation, pause, isolation and framing intent.
- `src/features/engineering/focus.ts`: camera framing around the actual corner's world-space pivot, including separated-assembly framing.
- `src/features/engineering/EngineeringPanel.tsx`: contextual laboratory controls and source information.
- The showroom scene reuses its existing prepared clone, validated registry and separation controller. No secondary stand-in asset is loaded.
- The explorer enforces the active lab's corner selection boundary. Mode changes clear prior animation/visibility ownership so the showroom and disassembly systems are restored accurately.
- Engineering selection uses a restrained, low-emission edge highlight to retain the imported surface appearance. Temporary outline materials are disposed without disposing the source geometry. The existing component explorer keeps its stronger edge-outline treatment.

## Verification commands

```sh
npm run build
# With Vite serving port 5173:
npx playwright test
```

Dedicated tests cover all four source corner mappings, cross-corner selection rejection, every source layer, part isolation and reselection, camera framing, actual-model separation/distance/pause/assembly, corner resets, mode restoration and mobile overflow. Existing component-selection material tests also check that the laboratory outline does not dispose shared source geometry.

## Blocked systems

- **Engine:** no independent engine block, cylinder heads, intake, exhaust, cooling or lubrication system is supplied.
- **Suspension:** no independent springs, dampers or control arms are supplied.
- **Chassis:** no structural chassis or verified mounting-point model is supplied. The merged body is not presented as a chassis substitute.

These are informational coverage states, not nonfunctional lab-navigation buttons. Full Phase 5 acceptance requires the missing original vehicle components and verified asset provenance. The original reference model's license remains unverified as documented in ASSETS.md.

Phase 6 customization has not started and requires user approval.

## Results — 2026-11-09

- Source manifest validation, TypeScript and production build: passed.
- Complete regression suite: 18 passed, including all earlier showroom, explorer, disassembly and registry checks.
- All four actual wheel corners, source-layer toggles, isolated part reselection, laboratory framing and full showroom restoration: passed.
- Actual-model laboratory separation, frame-clock pause/resume, distance changes, assembly and switching back to disassembly: passed.
- Mobile corner changes, separation/reset and 390 × 844 overflow check: passed.
- Desktop and mobile laboratory renders inspected; selection feedback was reduced to preserve the source surface appearance.
- Validation used headless Chromium with software WebGL. No complete engine, suspension, chassis, independently authored full brake system, verified physical specifications or production deployment is asserted.
