# Phase 2 — vehicle asset preparation

Status: **in progress; full vehicle asset acceptance is blocked**. No Phase 3 interface or Phase 4 disassembly is claimed.

## Implemented

- Deterministic GLB audit produces `src/models/vehicle/reference-manifest.json`: 58 named nodes, 51 mesh nodes, 17 inspectable assemblies/geometry groups.
- Source SHA-256, node indices, hierarchy, source transforms, materials, pivot positions, visibility, and explicit capabilities are recorded. Repeated names are distinguished by node identity, not name lookup. Pivots are marked unverified; no explosion vectors are invented.
- `npm run assets:check` detects stale manifests or changed GLB bytes. The production build runs this check first.
- The showroom uses the central loading/preparation pipeline. It clones the cached scene, assigns source node identities from the GLTFLoader parser, validates hierarchy/geometry/transforms, and replaces materials only on its own clone.
- Model centering is performed on an external placement group. Authored local transforms remain unchanged and are restored from the frozen manifest.
- The registry supports resolving raycast objects to genuinely inspectable components. It rejects merged material geometry as individual physical parts. No selection UI has been added ahead of Phase 3.
- Blender preparation audits author-provided meshes and exports only when explicit identities, category labels, reviewed pivots, materials, and a license record are present. It refuses to overwrite the source, report or output. It does not fabricate meshes or split arbitrary loose geometry into supposed mechanical components.

## Actual asset capability

Four wheel assemblies, four tire geometries, four rim geometries, four combined brake geometries, and a steering-wheel assembly can be addressed independently (17 selectable entries). The combined brake geometry is not represented as independent disc/caliper assets. Remaining nodes are hierarchy or merged material geometry. Full source inventory and exact transforms are in the generated JSON manifest.

Missing: independently authored exterior panels/doors, hinge pivots, engine internals, transmission, suspension, structural chassis, separated seats/dashboard and other mechanical components required by the specification. `docs/assets/required-components.json` records requirement coverage without guessing.

## Validated workflow

```sh
npm run assets:audit  # refresh manifest after an intentional source-asset change
npm run assets:check
npm run build
# With Vite running on port 5173:
npx playwright test
node scripts/test-blender.mjs
```

The installed Blender 4.3.2 lacks `libextern_draco.so`. To audit a temporary uncompressed reference copy, keep Vite running and use:

```sh
node scripts/decode-reference.mjs /tmp/reference-uncompressed.glb
blender --background --factory-startup --python-exit-code 1 \
  --python scripts/blender/prepare_vehicle.py -- \
  --source /tmp/reference-uncompressed.glb --report /tmp/reference-audit.json
```

The browser utility uses the existing local Draco decoder and GLTFExporter. It does not alter the bundled reference. Exported intermediate node indices are different: it is an inspection copy, not a drop-in replacement for the manifest-bound original. A full Blender inspection ran successfully on the decompressed reference: 59 imported objects and 177 expected missing author-label/pivot-review issues. Those issues are not fixed by renaming the material groups.

## Original asset handoff

Supply an artist-authored `.blend` or uncompressed `.glb/.gltf` containing the actual components. For each mesh/group:

1. Use stable, unique `fx_component_id` and an `fx_category` custom property.
2. Keep actual assembly parents and physically meaningful pivots; set `fx_pivot_reviewed` only after inspection.
3. Set scale in metres, scene unit scale 1.0, finite transforms, and appropriate PBR materials.
4. Keep names readable; separate actual physical components in authoring, not just by material.
5. Create a provenance record with `asset`, `creator`, `license`, `source`, and `verified_by`. Do not put credentials in it. This record documents a review; the script cannot certify legal clearance.

```sh
blender --background --factory-startup --python-exit-code 1 \
  --python scripts/blender/prepare_vehicle.py -- \
  --source /absolute/path/original-vehicle.blend \
  --report /tmp/original-vehicle-audit.json \
  --output /tmp/original-vehicle.glb \
  --license-record /absolute/path/provenance.json
```

The preparation report retains Blender Z-up transforms. Export converts to glTF Y-up. Runtime transform snapshots must be generated from the final exported GLB; do not paste Blender-space vectors into the runtime manifest. Explosion vectors and articulation are deferred until each pivot and mechanical relationship is authored and reviewed. The current reference-specific audit/loader must be adapted to the new asset's stable IDs and validated again.

## Acceptance and blockers

The registry, manifest validation, and preparation workflow are implemented. Complete Phase 2 acceptance requires a properly licensed original detailed vehicle with the missing independent components and reviewed pivots. The current third-party reference model's original license is still unverified. See ASSETS.md. No completed original vehicle, full disassembly readiness or photorealistic asset quality is asserted.

## Check results — 2026-11-05

- Manifest source hash, hierarchy and transforms: passed.
- TypeScript and production build: passed.
- Complete browser/registry regression suite: 5 passed, including desktop/mobile showroom and actual Draco asset binding.
- Twenty mutation/restoration cycles on all 58 fixture nodes and five restoration cycles on the actual wheel assemblies: passed.
- Blender preparation integration: passed export metadata retention, source preservation, overwrite protection and rejection of an export without a license record. Test geometry is an original triangle fixture used only for validation, never a substitute vehicle asset.
- Full Blender audit of the temporary reference inspection copy: ran successfully; the 177 missing-label/pivot-review issues remain expected for this unprepared third-party reference.
