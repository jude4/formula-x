import { gsap } from 'gsap';
import { Matrix3, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { VehicleRegistry } from '../../models/vehicle/registry';
import { separationConfig } from './config';
export function createDisassemblyController(registry: VehicleRegistry, root: Object3D, onActivity: (active: boolean) => void = () => {}) {
  root.updateWorldMatrix(true, true);
  const motions = separationConfig.map((config) => {
    const entry = registry.entries.get(config.id);
    if (!entry?.metadata.selectable || !entry.object.parent) throw Error(`Unsupported separation component: ${config.id}`);
    const delta = new Vector3(...config.vector).applyMatrix3(new Matrix3().setFromMatrix4(entry.object.parent.matrixWorld).invert());
    return { config, object: entry.object, origin: new Vector3(...entry.metadata.originalTransform.position), delta, amount: 0 };
  });
  const originalVisibility = new Map<Object3D, boolean>(); root.traverse((object) => originalVisibility.set(object, object.visible));
  const restoreVisibility = () => originalVisibility.forEach((visible, object) => { object.visible = visible; });
  let timeline: gsap.core.Timeline | null = null;
  let playbackPaused = false;
  function apply() {
    for (const motion of motions) motion.object.position.copy(motion.origin).addScaledVector(motion.delta, motion.amount);
    root.updateMatrixWorld(true);
  }
  function isWithin(object: Object3D, ancestor: Object3D) { let current: Object3D | null = object; while (current) { if (current === ancestor) return true; current = current.parent; } return false; }
  return {
    get timeline() { return timeline; },
    animate(levels: Record<string, number>, distance: number, paused = false, immediate = false) {
      if (!Number.isFinite(distance) || distance < 0 || distance > 1.5) throw Error('Invalid separation distance');
      timeline?.kill(); timeline = null; playbackPaused = paused; onActivity(false);
      for (const motion of motions) { const level = levels[motion.config.id] ?? 0; if (!Number.isFinite(level) || level < 0 || level > 1) throw Error('Invalid separation level'); }
      const changed = motions.filter((motion) => Math.abs(motion.amount - (levels[motion.config.id] ?? 0) * distance) > 1e-8);
      if (!changed.length) { apply(); return; }
      if (immediate) { for (const motion of motions) motion.amount = (levels[motion.config.id] ?? 0) * distance; apply(); return; }
      const assembling = changed.every((motion) => (levels[motion.config.id] ?? 0) * distance <= motion.amount);
      timeline = gsap.timeline({ paused: true, onUpdate: apply, onStart: () => onActivity(true), onComplete: () => { apply(); onActivity(false); } });
      for (const motion of changed) {
        const order = assembling ? 4 - motion.config.stage : motion.config.stage;
        timeline.to(motion, { amount: (levels[motion.config.id] ?? 0) * distance, duration: 1.1, ease: 'power2.inOut' }, order * 0.14);
      }
      onActivity(true);
    },
    // One frame clock drives both Three.js and GSAP. This avoids ticker drift and
    // GSAP lag smoothing making animations crawl during expensive software-rendered frames.
    advance(delta: number) { if (!playbackPaused && timeline && Number.isFinite(delta) && delta > 0 && timeline.totalProgress() < 1) timeline.totalTime(Math.min(timeline.totalDuration(), timeline.totalTime() + delta)); },
    pause(paused: boolean) { playbackPaused = paused; },
    visibility(hidden: Record<string, boolean>, isolatedId: string | null) {
      restoreVisibility();
      for (const [id, value] of Object.entries(hidden)) if (value) { const entry = registry.entries.get(id); if (entry) entry.object.visible = false; }
      const isolated = isolatedId ? registry.entries.get(isolatedId)?.object : undefined;
      if (isolated) root.traverse((object) => { if (object instanceof Mesh) object.visible = object.visible && isWithin(object, isolated); });
    },
    reset() { timeline?.kill(); timeline = null; motions.forEach((motion) => { motion.amount = 0; }); registry.restore(); restoreVisibility(); onActivity(false); },
    dispose() { timeline?.kill(); timeline = null; playbackPaused = true; registry.restore(); restoreVisibility(); onActivity(false); },
  };
}
