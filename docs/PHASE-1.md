# Phase 1 — foundation and visual prototype

## Implemented

- Vite/React/TypeScript foundation with modular scene and shared Zustand state.
- Dark charcoal studio, restrained sage accent, responsive typography and navigation.
- Locally served detailed Ferrari reference GLB, Draco decoder, and HDRI fill.
- Physically based body/glass materials, softbox reflection environment, contact shadows, subtle showroom floor.
- Introductory camera settling; bounded orbit and zoom, pan, four camera perspectives, automatic rotation and reset.
- High/balanced rendering quality and browser-supported fullscreen.
- Genuine loading progress, scene error boundary, WebGL fallback and project/asset disclosure.
- No later-phase controls that pretend to implement missing functionality.

## Validation on 2026-11-05

- Production TypeScript and Vite build: passed.
- Desktop Chromium browser test: passed; model/decoder loading, enabled entry, camera selection, rendered-image change, automatic rotation state, reset, quality toggle, project dialog, Escape dismissal, orbit/zoom gestures, no application runtime errors.
- Mobile Chromium browser test at 390 × 844: passed; asset loading, no horizontal document overflow, rear camera selection.
- Desktop and mobile screenshots manually inspected; fixed initial rear framing, mobile cropping, floor boundary and incompatible baked-shadow rendering.
- Development server started successfully on port 5173.
- Browser uses software WebGL in cloud tests; no real-GPU performance or photorealism certification is implied.

## Remaining limits / acceptance status

Phase 1 implementation is ready for visual review, **not an unqualified final acceptance or publication**. The original third-party reference model license is unverified because Sketchfab is denied by the environment's egress policy. Provenance and upstream notices are retained in ASSETS.md. Confirm that license or replace the asset with an appropriately licensed original before publishing the application. No original FORMULA X V12, complete component hierarchy, mechanical internals, or disassembly capability is claimed.

Vite reports a roughly 1 MB uncompressed lazy scene chunk (about 283 kB gzip), largely the Three.js rendering dependency. The scene is loaded separately from the initial UI. Hardware-dependent performance should be profiled with the final asset.

## Next phase, pending approval

Phase 2: obtain/prepare an original licensed, detailed vehicle with named independent component meshes, pivots, saved transforms, material configuration, and a validated asset manifest. Do not represent the current material-group reference mesh as satisfying that requirement.
