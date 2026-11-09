# Phase 4 — reference exploded view

Scope: the 17 independently inspectable reference components approved for the preceding explorer. This is a presentation of actual available geometry, not full fictional-vehicle mechanical disassembly. Body panels, engine internals, suspension, and separate brake discs/calipers are still unavailable.

## Implemented

- Explode all and assemble all, with five reversible stages: wheel assemblies, tire geometry, rim geometry, combined brake geometry, and steering-wheel assembly.
- Continuous explosion distance from 0 to 150% of the authored presentation offsets.
- Step-by-step disassembly and assembly, pause/resume, exact reset, and interruption-safe transitions.
- Selected-component separation and assembly; assembling an assembly also restores its configured descendants.
- Component isolation, hide/show selected, and show-all restoration. Isolation follows subsequent hierarchy selections, and clears when selection is cleared.
- Optional original-pivot guide lines and assembly labels that follow the real animated objects. Hidden or isolated-out geometry does not retain labels or guide lines. During isolation, assembly annotations are suppressed so only the selected component label remains. Selected labels remain available independently of the assembly-label toggle.
- Automatic overview framing for the separated vehicle, with orbit/zoom/pan and component focus retained.
- Exiting to Showroom or Components restores the original model transforms and visibility.
- Reduced-motion preferences apply the requested arrangement immediately.

## Animation architecture

`src/features/disassembly/config.ts` is the explicit reference-separation manifest. It identifies each supported component by the stable registry ID and supplies its presentation vector and sequence stage. These vectors are in model-world coordinates and model units; they are not independently verified service-removal vectors or mechanical pivots.

The controller converts each world-space offset through the inverse parent transform. Each local position is always reconstructed from the immutable original position plus the configured displacement. It never scales geometry, accumulates previous offsets, or changes rotations to simulate disassembly. Parent assembly translations and child translations compose naturally; child vectors are additional separations relative to the moved parent.

GSAP timelines interpolate a scalar displacement per configured component, including staged reverse assembly. React Three Fiber's frame clock advances the paused GSAP timeline explicitly. This gives the renderer and animations one clock, prevents competing ticker lag smoothing, and makes pause/resume deterministic. Interrupted transitions start from the current scalar values. Zustand stores user intent and status; it does not receive per-frame transforms.

Original-transform and visibility restoration use the verified registry and an additional snapshot for unassociated primitive meshes. The source GLB, shared loader cache, and source geometry remain unchanged. The Phase 2 source manifest continues to mark mechanically validated articulation/disassembly as unsupported; the new presentation-separation configuration does not claim to change that fact.

## Controls and behavior

1. Open **Disassembly** in navigation.
2. Use **Explode all**, the distance slider, or the stage arrows. **Pause** freezes only component motion; camera exploration remains available.
3. Select a component in the model or hierarchy to reveal its separation, assembly, isolation, and visibility controls.
4. **Assemble selected** restores the selected component and its configured descendants. **Assemble all** restores all positions; visibility/isolation can be cleared with **Show all components**. **Reset disassembly** restores positions, visibility, distance, sequence, and display defaults.
5. Selecting another component while isolated changes the isolated geometry. Clearing the selection ends isolation. Returning to Showroom/Components restores the complete reference presentation.

The sequence label describes the requested sequence stage. Independently edited arrangements are identified as individual component arrangements. A zero distance collapses the geometry while preserving the requested sequence arrangement.

## Verification

```sh
npm run build
# With the development server on port 5173:
npx playwright test
```

Dedicated tests cover world-space vectors under rotated parents, parent/child offset composition, twenty complete explode/assemble cycles without drift, unchanged rotations/scales, interrupted reassembly, actual pause/resume of frame advancement, restoration of unassociated mesh visibility, invalid input rejection, individual/group state, hidden ancestors, isolation following selection, and actual-model desktop/mobile controls.

## Remaining scope

This is not an authorized automotive maintenance procedure. The full original-vehicle disassembly acceptance criterion remains blocked by the missing independently authored and licensed vehicle asset. The current reference's original license is still unverified. See ASSETS.md and PHASE-2.md.

Phase 5, the engineering laboratory, has not been implemented. Engine, suspension and chassis labs cannot be represented as complete mechanical systems with this reference. Further phase work requires user approval and must preserve this limitation.

## Results — 2026-11-09

- Manifest hash verification, TypeScript and production build: passed.
- Complete regression suite: 14 passed, including the earlier showroom, explorer and registry checks.
- Twenty repeated separation/reassembly cycles under rotated and non-uniformly scaled parent transforms: passed without drift.
- Actual-model desktop pause/resume, distance changes, individual separation, visibility, isolation, hidden annotations, reset and mode exit: passed.
- Mobile stage controls, guide/label toggles, complete separation and assembly, and overflow check at 390 × 844: passed.
- Desktop and mobile renders inspected. The final overview framing is closer on mobile, and parent assembly annotations are suppressed during isolation.
- These checks validate the reference presentation in headless Chromium with software WebGL. Full-vehicle mechanical completeness, original model licensing, and a production Vercel deployment remain unverified.
