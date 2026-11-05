# Phase 1 asset provenance

## Vehicle

- File: `public/models/ferrari.glb` (Draco-compressed glTF 2.0).
- Source: https://github.com/mrdoob/three.js/blob/r180/examples/models/gltf/ferrari.glb
- Upstream example and creator attribution: https://github.com/mrdoob/three.js/blob/r180/examples/webgl_materials_car.html
- Original model: Ferrari 458 Italia by **vicent091036**, https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6
- Changes: body and glass materials replaced at runtime; model centered on the studio floor. Asset geometry unchanged.
- Upstream Three.js repository MIT notice: `public/models/THREE-LICENSE.txt`.
- **Original-model licensing remains unverified:** the original Sketchfab website/API is denied by the environment's current egress policy. The Three.js MIT code license alone does not prove clearance of a third-party model or Ferrari branding. Do not commercially publish this reference asset until the original license is verified and its required attribution retained, or replace it with a suitably licensed original vehicle.
- Availability: body, trim, glass, interior materials, four wheel assemblies, steering wheel. No claim of independent hood/doors/engine internals or complete disassembly support.

## Lighting

- `public/models/studio.hdr`, upstream `venice_sunset_1k.hdr` from Three.js r180's equirectangular textures.
- Original HDRI: Venice Sunset, Poly Haven, CC0. https://polyhaven.com/a/venice_sunset
- Used at low intensity as fill inside a locally rendered studio environment, with three softbox-style Lightformers as the dominant reflections. Not used as the visible background.

## Decoder

- Draco WebAssembly decoder and wrapper from Three.js r180 `examples/jsm/libs/draco/gltf`.
- Google Draco, Apache 2.0; notice retained in `public/draco/LICENSE.txt`.

## Next asset workflow (not implemented in Phase 1)

Prepare an original model in Blender or obtain a licensed source model. Establish real-world scale, named independent exterior/mechanical/interior meshes, correct pivots, PBR materials and texture budgets before exporting GLB. Verify glTF validation, material fidelity, and component hierarchy before adding disassembly. The current model is a visual reference and cannot satisfy those requirements merely by renaming material meshes.
