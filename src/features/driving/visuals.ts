import { Box3, Group, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import type { Material, Object3D } from 'three';
import type { VehicleRegistry } from '../../models/vehicle/registry';
import { cornerAssemblies } from '../engineering/catalog';
import { restLength } from './physics';
import type { DrivingPhysics, WheelSpec } from './physics';
/** Extra pivots belong only to the driving clone. Brakes steer/travel but never spin. */
export function prepareDrivingWheels(registry: VehicleRegistry, placement: Group) {
  placement.updateWorldMatrix(true, true);
  const wheelData = Object.entries(cornerAssemblies).map(([corner, entry]) => {
    const root = registry.entries.get(entry.assembly)!.object;
    const tire = registry.entries.get(entry.parts.tire)!.object;
    const bounds = new Box3().setFromObject(tire), size = bounds.getSize(new Vector3());
    const center = root.getWorldPosition(new Vector3());
    const original = root.position.clone(), originalQ = root.quaternion.clone();
    const upInParent = new Vector3(0, 1, 0).applyQuaternion(root.parent!.getWorldQuaternion(new Quaternion()).invert());
    const spin = new Group(); spin.name = `DriveWheelSpin:${corner}`;
    // Source assembly local X maps to the horizontal axle. Retain the authored assembly basis.
    root.add(spin);
    const spinning = root.children.filter(child => child !== spin && child !== registry.entries.get(entry.parts.brake)!.object);
    spinning.forEach(child => spin.add(child));
    const spec: WheelSpec = { x: center.x, y: center.y, z: center.z, radius: Math.max(size.y, size.z) / 2, front: corner.startsWith('front') };
    return { root, spin, spinning, original, originalQ, upInParent, spec };
  });
  const steering = new Quaternion();
  return {
    specs: wheelData.map(w => w.spec),
    update(physics: DrivingPhysics) {
      wheelData.forEach((w, i) => {
        // Suspension displacement is expressed in world/model-up, then converted to the parent basis.
        w.root.position.copy(w.original).addScaledVector(w.upInParent, restLength - (physics.vehicle.wheelSuspensionLength(i) ?? restLength));
        // Parent frame is the source model frame (not the dynamic world frame).
        steering.setFromAxisAngle(w.upInParent, physics.vehicle.wheelSteering(i) ?? 0);
        w.root.quaternion.copy(steering).multiply(w.originalQ);
        w.spin.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), physics.vehicle.wheelRotation(i) ?? 0);
      });
    },
    reset() { wheelData.forEach(w => { w.root.position.copy(w.original); w.root.quaternion.copy(w.originalQ); w.spin.quaternion.identity(); }); },
    dispose() { wheelData.forEach(w => { w.spinning.forEach(child => w.root.add(child)); w.root.remove(w.spin); w.root.position.copy(w.original); w.root.quaternion.copy(w.originalQ); }); },
  };
}
export function createBrakeLights(registry: VehicleRegistry) {
  const source = registry.entries.get('reference.node.3');
  if (source?.metadata.sourceName !== 'lights_red') throw Error('Rear red-light geometry missing');
  const entries: { mesh: Mesh; original: Material | Material[]; owned: Material[] }[] = [];
  source.object.traverse(o => { if (o instanceof Mesh) entries.push({ mesh: o, original: o.material, owned: (Array.isArray(o.material) ? o.material : [o.material]).map(m => m.clone()) }); });
  let last: boolean | null = null;
  return {
    update(braking: boolean) { if (last === braking) return; last = braking; entries.forEach(e => { e.owned.forEach(m => { if (m instanceof MeshStandardMaterial) { m.emissive.set('#ff1808'); m.emissiveIntensity = braking ? 2.5 : 0.12; } }); e.mesh.material = Array.isArray(e.original) ? e.owned : e.owned[0]; }); },
    dispose() { entries.forEach(e => { e.mesh.material = e.original; e.owned.forEach(m => m.dispose()); }); last = null; },
  };
}
export function transformPoint(point: readonly number[], object: Object3D) { return object.localToWorld(new Vector3(point[0], point[1], point[2])); }
