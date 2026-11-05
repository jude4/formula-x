# Phase 3 — component explorer

The user authorized this phase using the current reference model despite the incomplete original-asset requirements documented in Phase 2. Scope is the 17 verified inspectable assemblies/geometry groups. No unavailable physical components are invented.

## Implemented

- Showroom / Components navigation and responsive explorer panel.
- Search by component name, system category, or imported material label.
- Expandable wheel hierarchy with independent rim, tire and combined-brake entries, plus the steering-wheel assembly.
- Pointer selection through React Three Fiber's Three.js raycaster. Only the frontmost model intersection is resolved, preventing selection through merged bodywork. Orbit drags do not select parts.
- Shared selection between model and hierarchy, selected-row feedback, and automatic scrolling within the hierarchy.
- Subtle emissive material feedback, depth-tested edge outlines, and a component label. Selection clones materials and owns/disposes only temporary resources; original geometry, materials, and transforms remain intact.
- Camera focus derived from actual world-space component bounds. User orbit interrupts the transition; Focus component repeats it. Reduced-motion preferences skip camera interpolation.
- Clear selection and close explorer actions restore the vehicle presentation. The existing camera presets, reset, quality, fullscreen and orbit controls remain available.
- Contextual descriptions, actual imported material labels, assembly relationships, and truthful availability information. Engineering specifications and mechanical pivots are explicitly unverified/not supplied.

## Scope limits

This is an explorer for a third-party reference asset, not a completed fictional V12 vehicle. Wheel assemblies and combined brake geometry are not claimed to supply separately authored hubs, discs, calipers, suspension or engine internals. No disassembly controls are shown before Phase 4 exists. Original model licensing and full Phase 2 asset completeness remain unresolved.

## Validation

```sh
npm run build
# With the development server on port 5173:
npx playwright test
```

The new tests exercise material restoration across repeated selection cycles, rejection of merged-body selection, hierarchy expansion/collapse, search and empty results, clear/close, a real visible tire raycast click, camera position changes and selection-edge creation, and mobile steering-wheel selection without horizontal overflow. The existing showroom and registry tests remain in the regression suite.

The full suite runs in headless Chromium with software WebGL; it does not certify real-GPU performance. No production Vercel deployment is claimed by these checks.

## Next phase

Phase 4 is the exploded-view system, pending user approval. It requires individually configured explosion vectors and actual component relationships. The current reference cannot support the full requested mechanical disassembly; a complete independently authored vehicle is still needed for that scope. Do not expose fake engine, suspension, or panel separation.

## Results — 2026-11-05

- Manifest check, TypeScript and production build: passed.
- Complete regression suite: 9 passed.
- Additional camera-target check against the selected component's actual focus position: passed.
- Final filtered hierarchy expansion/collapse regression after refinement: passed.
- Desktop and mobile screenshots inspected; softened the selected material feedback and preserved a separate scrollable information panel.
- Source asset and component transforms remain unchanged. Full original-vehicle coverage remains subject to the Phase 2 asset requirements.
