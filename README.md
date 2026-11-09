# FORMULA X — Beyond the Machine

Phase 4 reference exploded view: an interactive automotive studio built with React 19, TypeScript, Vite, React Three Fiber, Drei, Three.js, Zustand, Tailwind CSS, Framer Motion, and Lucide.

## Develop

Requires Node.js 22.12+ (validated with 24.22.1) and npm.

```sh
npm ci
npm run dev -- --port 5173
```

## Validate

```sh
npm run typecheck
npm run build
npx playwright test
```

Browser tests use `/usr/bin/chromium` by default. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for another system Chromium, or install Playwright Chromium with `npx playwright install chromium` and set `PLAYWRIGHT_USE_BUNDLED_BROWSER=1`. On a sandboxed cloud executor, browser launching and server listening may need the platform's supported command permissions. Tests require the development server on port 5173.

## Working interactions

- Drag to orbit, scroll/pinch to zoom, right-drag or two-finger drag to pan.
- Choose perspective, front, rear, or side camera views.
- Automatic orbit, camera reset, high/balanced pixel-density rendering.
- Fullscreen when the browser supports it.
- Components mode: real model selection, searchable hierarchy, highlighting/edges, camera focus, related components, and clear/close actions.
- Disassembly mode: actual geometry separation, five stages, distance, pause/resume, individual/group assembly, isolation, visibility, moving labels and guide lines.
- Enter the experience, project notes, keyboard dismissal and focus management.
- Asset loading progress, error boundary, and unsupported-WebGL fallback.

The initial reveal gently settles into the front-quarter view. Camera distance and vertical orbit are bounded. All model, decoder, and lighting resources are served locally; no third-party runtime request is needed.

## Scope and assets

The vehicle is the Ferrari 458 reference asset used by the official Three.js car example, credited to **vicent091036**. It is not an original FORMULA X vehicle. It does not contain the complete individually separated mechanical architecture required for later phases. The project information panel states these limitations; no unimplemented disassembly, customization, cockpit, or driving controls are displayed.

See [asset provenance](docs/ASSETS.md), [Phase 1 validation](docs/PHASE-1.md), and [Phase 2 preparation](docs/PHASE-2.md), and [Phase 3 explorer](docs/PHASE-3.md), and [Phase 4 exploded view](docs/PHASE-4.md). Original model licensing confirmation is a remaining release prerequisite, separate from upstream code licensing. This is a development study, not a cleared commercial asset package.

Phase 2 was authorized. A central 58-node registry, source manifest, validation pipeline and Blender preparation workflow are implemented. Full asset acceptance remains blocked on a licensed original vehicle with the missing independent components. Phase 3 was authorized on the reference model and adds a working explorer for the 17 verified inspectable components. Phase 4 adds reversible presentation separation for those same components. Full original-vehicle asset completeness remains unresolved.

## Architecture

- `src/app`: experience layout and introductory UI.
- `src/three/scenes`: studio, lighting, asset loading, materials, camera interpolation.
- `src/stores`: shared showroom state.
- `src/components/ui`: scene error handling.
- `public/models`, `public/draco`: local rendering assets and upstream notices.
- `src/features/disassembly`: authored presentation offsets, GSAP controller, controls and live guide/label rendering.
- `src/stores/disassembly-store.ts`: sequence, individual targets, distance, pause and visibility intent.
- `src/features/component-explorer`: hierarchy, metadata, selection feedback, and component camera targets.
- `src/stores/explorer-store.ts`: shared model/hierarchy selection and focus requests.
- `src/models/vehicle`: frozen manifest, validated registry, cloned model preparation.
- `scripts`: deterministic GLB audit, local Draco decompression, Blender preparation.
- `tests`: desktop/mobile, registry restoration, real-asset loading and Blender preparation validation.

Rapier, postprocessing, and driving dependencies are intentionally deferred until their respective phases have a purpose. Browser quality is GPU-dependent; headless software rendering validates functionality, not desktop frame rate or photorealism.

## Vercel deployment

Import `jude4/formula-x` into Vercel with framework Vite, root directory `.`, build command `npm run build`, and output directory `dist`. These settings are checked in as `vercel.json`. There are no application secrets. The Vercel account must authorize the repository; repository push access does not supply Vercel account access.

The current development/reference-asset limitations in `docs/ASSETS.md` remain applicable to deployed copies.
