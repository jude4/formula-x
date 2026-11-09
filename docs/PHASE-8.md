# Phase 8 — driving simulation

The reference vehicle can be driven around a compact test circuit using Rapier's dynamic raycast vehicle controller. This is an illustrative vehicle tune, not measured Ferrari handling or original FORMULA X V12 specifications.

## Working experience

- Start/stop engine, accelerate, brake, steer, reverse at rest, pause/resume and reset to the circuit start.
- Keyboard: W/up throttle; S/down/Space brake; A/left and D/right steer; E engine; R forward/reverse at rest; C camera; P pause. Escape or another navigation mode exits driving.
- Pointer/touch press-and-hold steering and pedals, with capture and release/cancel handling. D/R buttons enforce a stationary direction change.
- Automatic forward gears with speed hysteresis, a brief torque interruption during shifts and gear-dependent drive force. Simulated RPM follows speed, throttle and gear. Reverse is speed-limited.
- Chase camera with a stable horizon and collision raycasts; cockpit camera uses the verified driver eye and near-plane clearance from Phase 7, transformed rigidly with the vehicle.
- All four actual reference wheels spin; front wheel assemblies steer. Combined brake meshes steer and follow suspension travel without spinning.
- Physical suspension travel moves the supplied wheel assemblies relative to the chassis. Separate spring/damper geometry is absent and is not fabricated. Cockpit steering-wheel rotation remains unavailable pending a verified shaft/pivot.
- Braking illuminates the actual source `lights_red` geometry with owned emissive material copies.
- Speed, direction/gear, simulated RPM, distance and road/grass status derive from the simulation. They do not operate the merged source dashboard gauges.
- Optional original Web Audio engine synthesis, muted initially, with an obvious mute control. Engine state, throttle and gear changes affect pitch/gain. No recorded Ferrari/V12 sound or physical acoustics accuracy is claimed.
- Current customization survives driving and return to all earlier modes.

## Physics and circuit

`@dimforge/rapier3d-compat` 0.19.3 is lazy-loaded with the driving scene. The world uses a fixed 1/120-second integration step with bounded catch-up after stalls. A dynamic 1350 kg illustrative chassis collider has gravity, damping, continuous collision detection and an appropriate low centre of mass. Its cuboid is a collision approximation; it does not replace the visible model.

Four wheel contacts are derived from the source's authored assembly centres and tire geometry bounds. Raycast springs/dampers provide ground contact and load response. Rear wheel drive forces, tire friction, braking impulses, drag, downforce and speed-sensitive steering act on the rigid body. Forward translation is not set directly from key presses. Engine-off removes drive torque; the vehicle coasts while moving and is held by a parking brake when stationary.

The circuit is an approximately 361 m stadium loop, with 80 m straights, 32 m turn radius and 12 m road width. Visible inner/outer barriers have matching colliders. Grass reduces grip/drive force and increases drag. Road strips, kerbs, markings, barriers and landscaping are original generated environment geometry. The vehicle remains the detailed supplied reference asset.

## Isolation and ownership

Driving prepares its own clone of the cached GLTF and uses the existing material customizer. Wheel pivots, light materials, physics world, audio graph and input bindings are owned by this mode. Exiting removes its world and resources, while the showroom creates/restores its independently prepared clone. Source geometry/material caches, manifest identities and authored transforms remain intact.

Controls release on pointer cancel, key release, blur, tab hiding and mode exit. Simulation pause protects against background catch-up. Reset clears motion, engine state and inputs. Initialization failures present a return-to-showroom action. No additional runtime services or application secrets are needed; assets and Rapier's embedded WASM ship with the app.

## Validation

Physics checks cover four-wheel support, acceleration, braking, reverse, steering, wheel spin, frame-rate independence, collisions and a complete circuit driven by a steering controller. Browser checks exercise the actual reference model, keyboard and pointer controls, camera switching and safe clipping settings, engine/audio controls, gear direction locking, pause/reset, brake-light emission, wheel transforms, appearance preservation and return to the component explorer. Desktop/mobile screenshots and existing phase regressions are checked before push.

Phase 9 is final polish and remains a separate phase.

Validation result: `npm run build` passed asset-manifest, TypeScript and production-bundle checks. All 36 Playwright checks passed across the regression run and the desktop driving rerun after correcting the test's wait for the remounted showroom renderer. The production preview smoke check passed Rapier initialization, acceleration, camera switching and showroom return with no runtime errors, failed asset responses or external runtime requests. Desktop, cockpit and mobile screenshots were inspected. Headless software rendering does not establish a hardware frame-rate target.
