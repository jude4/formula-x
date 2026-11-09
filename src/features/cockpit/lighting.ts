import { EdgesGeometry, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial } from 'three';
import type { Material, Object3D } from 'three';
import type { VehicleRegistry } from '../../models/vehicle/registry';
export function createCockpitLighting(registry: VehicleRegistry) {
  const source = registry.entries.get('reference.node.56');
  if (source?.metadata.sourceName !== 'steering_red_lights') throw Error('Steering preview light geometry missing');
  const entries: { mesh: Mesh; original: Material | Material[]; owned: Material[] }[] = [];
  source.object.traverse((object) => { if (object instanceof Mesh) entries.push({ mesh: object, original: object.material, owned: (Array.isArray(object.material) ? object.material : [object.material]).map((m) => m.clone()) }); });
  const restore = () => entries.forEach((e) => { e.mesh.material = e.original; });
  return {
    apply(lit: boolean, brightness: number) {
      for (const e of entries) {
        const originals = Array.isArray(e.original) ? e.original : [e.original];
        e.owned.forEach((m, i) => { m.copy(originals[i]); if (m instanceof MeshStandardMaterial) { m.emissive.set('#ff3b30'); m.emissiveIntensity = lit ? brightness : 0; } m.needsUpdate = true; });
        e.mesh.material = Array.isArray(e.original) ? e.owned : e.owned[0];
      }
    }, restore,
    dispose() { restore(); entries.forEach((e) => e.owned.forEach((m) => m.dispose())); },
  };
}
export function outlineSteering(object: Object3D) {
  const meshes: Mesh[] = []; object.traverse((child) => { if (child instanceof Mesh) meshes.push(child); });
  const owned = meshes.map((mesh) => {
    const geometry = new EdgesGeometry(mesh.geometry, 50), material = new LineBasicMaterial({ color: '#c1e991', transparent: true, opacity: 0.25, depthWrite: false });
    const lines = new LineSegments(geometry, material); lines.name = 'CockpitSteeringOutline'; lines.raycast = () => {}; lines.scale.setScalar(1.001); mesh.add(lines);
    return () => { mesh.remove(lines); geometry.dispose(); material.dispose(); };
  });
  return () => owned.forEach((dispose) => dispose());
}
