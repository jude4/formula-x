# Phase 6 — material customization studio

Material customization is implemented for the supplied reference geometry. Unsupported geometry variants are explicitly identified; there are no fake wheel-design, rim-size, aero or stitching controls.

## Working customization

- Seven body colours: Obsidian Black, Racing Red, Arctic White, Metallic Silver, British Racing Green, Electric Blue and Champagne Gold, plus a native custom-colour picker.
- Gloss, matte, metallic, carbon-fibre appearance and brushed-metal appearance on the actual body meshes.
- Real procedural carbon-weave colour, normal and roughness textures; brushed normal/roughness textures and body anisotropy. Body colour tints the carbon appearance.
- Original, bright silver, satin black, satin titanium and champagne finishes on all four supplied rim and wheel-core groups. Tires and badge material slots retain their supplied appearance.
- Original/red/graphite/acid-green/blue tint for the four supplied wheel-corner brake-labelled meshes. This is not caliper-only recolouring.
- Original/carbon-black/saddle-tan/ivory/oxblood colour and original/smooth/soft-matte finishes for the source's leather-labelled material groups.
- Original, woven-carbon or brushed appearances on the shared carbon-labelled trim groups. These include cockpit and exterior surfaces; individual seat panels and stitching are not independently authored.
- Exterior and elevated upholstery inspection camera commands. This does not implement Phase 7 cockpit entry.
- Customization persists across Showroom, Components, Disassembly and Engineering during the page session. No account, cloud save or reload persistence is claimed.
- Reset restores the reference studio's metallic-silver body and original wheel/brake/upholstery/trim properties, as well as original geometry bindings.

## Asset UV limitation and correction

The reference body has a UV attribute, but all decoded body UV values are the same `(0, 1)`. Assigning textures directly would therefore sample a single point. The supplied carbon trim also has large authored UV spans, unsuitable for using the same presentation texture density as the body.

Mapped finishes use owned runtime geometry copies with deterministic per-triangle dominant-plane UV projection. Indexed geometry is expanded as needed, preserving each original triangle's positions and normals. No vertex is moved, no shape is substituted and the cached source geometry/UVs remain unchanged. Non-mapped finishes and reset restore the original geometry object. The mapped copies are reused and disposed with the customization controller.

The procedural textures tile seamlessly themselves, but dominant-plane projection can have orientation seams at projection boundaries. Artist-authored continuous unwraps are still needed for final asset quality. These are illustrative surface appearances, not claims about real fibre layup, metal fabrication or physical material ratings.

## Ownership and integration

- `src/features/customization/catalog.ts`: supported colours, finish definitions and default appearance.
- `src/stores/customization-store.ts`: validated appearance intent and studio/camera state. Closing the studio preserves the appearance.
- `src/features/customization/textures.ts`: deterministic original DataTextures, served entirely from generated local data.
- `src/features/customization/projection.ts`: owned UV-projection geometry preserving the original triangles.
- `src/features/customization/controller.ts`: per-mesh material clones, scoped source-role application, reset and resource disposal.
- `src/features/customization/CustomizationPanel.tsx`: accessible controls and explicit supported-asset scope.

Original model materials and textures are never edited or disposed by customization. Only owned material, texture and projected-geometry resources are disposed. Controller reactivation rebinds its owned resources for React Strict Mode. Source transforms, component identities, the GLB and asset manifest remain unchanged. Component highlighting is cleaned up and reapplied when appearance changes, retaining the current customized materials.

## Verification

```sh
npm run build
# With Vite on port 5173:
npx playwright test
```

Dedicated tests validate colour input, deterministic spatial weave variation and alternating normal directions, triangle preservation and non-degenerate projected UVs, source-material/geometry ownership, reset/reactivation cycles, actual body UV variation, all five body finishes, custom colours, shader-error checks, wheel/brake/upholstery/trim changes, cross-mode persistence, camera inspection and mobile overflow.

## Remaining scope

The asset has one supplied wheel design and no compatible authored rim-size variants, spoiler/splitter alternatives, independently selectable seat materials or separate stitching meshes. Those options require additional assets. Full original-vehicle completeness and original reference-asset licensing remain unresolved as described in ASSETS.md and PHASE-2.md.

Phase 7 cockpit entry and interaction has not started and requires user approval.

## Results — 2026-11-09

- Manifest verification, TypeScript and production build: passed.
- Complete regression suite: 24 passed, covering all earlier showroom, explorer, disassembly and engineering checks.
- Procedural surface structure, alternating weave directions, non-degenerate UV projection, original-triangle preservation and material/geometry ownership: passed.
- Actual body paint, all five finishes, generated body UV variation, custom colour and shader-error checks: passed.
- Wheel/brake/upholstery/trim changes, cross-mode persistence, inspection view and full reference reset: passed.
- Mobile customization and 390 × 844 overflow check: passed; desktop and mobile renders inspected.
- Tests used headless Chromium with software WebGL. Artist-quality UV continuity, unavailable geometry variants, original reference-asset licensing and production deployment remain unresolved.
