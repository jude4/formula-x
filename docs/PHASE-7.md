# Phase 7 — cockpit reference inspection

The supplied open-roof reference now supports fixed-eye interior inspection. Full original-vehicle cockpit acceptance remains partial because separate doors, hinges, gauges and console controls are absent.

## Implemented

- Driver, steering, dashboard-region, centre-console-region and seat-surface views, using two authored fixed eye points.
- Pointer/touch drag and focused-canvas arrow keys to look; Shift increases keyboard increments. Wheel and a labelled slider change field of view, without moving the eye. Recenter and reset are available.
- Real steering assembly inspection via its button or a frontmost geometry click, with an optional owned edge outline.
- A reference light preview adjusts emissive appearance on the actual source `steering_red_lights` mesh (node 56). Brightness and on/off are appearance controls, not ignition, telemetry or functional instrument simulation.
- Escape, close or another mode restores exterior orbit controls, camera clipping settings and the original light material. Customization remains applied across modes.
- Responsive desktop/mobile controls, keyboard focus and source limitations in the panel.

## Camera clearance and transitions

Source eyes are driver `[-0.34, 1.1, 0.1]` and passenger `[0.34, 1.1, 0.1]`, transformed through the showroom placement. On entry, exact point-to-triangle distances are measured against all reference mesh surfaces, including currently hidden meshes. Collapsed source triangles are measured as their remaining line segments or points to avoid undefined triangle projections. Anchors need at least 0.09 scene units of clearance. The reference anchors each have approximately 0.185 units. The check concerns surface clearance; it is not a solid-volume collision or walkable-cockpit system.

Camera translation, orbit and dolly are disabled in cockpit mode. Yaw/pitch and field of view are bounded. The near plane is capped at 0.025 units and further constrained so every near-plane corner remains inside 45% of the measured clearance sphere at the current field of view and viewport aspect. Changing eye anchors cuts position under a fade; the camera does not travel through the console or body. Reduced motion removes the fade duration.

No door opening is fabricated. Steering rotation is unavailable because an independently verified steering pivot/axis is missing. Other region views inspect merged source surfaces; there are no fake selectable gauges, console buttons, screen interactions, or audio/engine states. Driving remains Phase 8.

## Ownership and validation

The GLB, source node transforms and registry remain unchanged. Light-preview materials and outline resources are owned by the cockpit feature and restored/disposed on exit or cleanup. No cached source material or geometry is modified or disposed.

Validation covers transformed triangle distances, near-plane corner bounds, finite/clamped state and refusal of unsafe anchors, actual browser camera position during drag/keyboard/zoom, both eye anchors, actual source emission, frontmost steering-mesh clicks, steering outlines, customization persistence, transform preservation, material restoration, exit/re-entry, mobile views and horizontal overflow. Existing showroom, explorer, disassembly, engineering and customization regressions are run with the cockpit tests.

Validation result: production build and asset/TypeScript checks passed; all 30 Playwright checks passed across resumed batches (16 cockpit/explorer/customization, 9 remaining checks, and 5 browser reruns after restarting the interrupted development server). Desktop and mobile screenshots were inspected. Software rendering validates behavior and layout, not hardware frame-rate targets.
