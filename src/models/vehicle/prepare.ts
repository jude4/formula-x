import { Box3, Group, Mesh, MeshPhysicalMaterial, Vector3 } from 'three';
import type { GLTF } from 'three-stdlib';
import { referenceManifest } from './manifest';
import { createVehicleRegistry } from './registry';
/** Clone the cached loader scene; never mutate shared geometry, materials, or transforms. */
export function prepareReferenceVehicle(gltf: GLTF) {
  const model = gltf.scene.clone(true);
  const sources = collect(gltf.scene);
  const clones = collect(model);
  sources.forEach((source, index) => {
    const association = gltf.parser.associations.get(source);
    if (association?.nodes !== undefined) clones[index].userData.sourceNodeIndex = association.nodes;
  });
  const registry = createVehicleRegistry(model, referenceManifest);
  const body = new MeshPhysicalMaterial({ color: '#9a9e96', metalness: 0.88, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 });
  const glass = new MeshPhysicalMaterial({ color: '#27302b', metalness: 0.2, roughness: 0.08, transparent: true, opacity: 0.75 });
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.castShadow = true; object.receiveShadow = true;
  });
  for (const { object, metadata } of registry.entries.values()) {
    const replacement = metadata.sourceName === 'body' ? body : metadata.sourceName === 'glass' ? glass : undefined;
    if (replacement) object.traverse((child) => { if (child instanceof Mesh) child.material = replacement; });
  }
  const box = new Box3().setFromObject(model), center = box.getCenter(new Vector3());
  const placement = new Group(); placement.name = 'ShowroomPlacement';
  placement.position.set(-center.x, -box.min.y + 0.025, -center.z); placement.add(model);
  return { placement, registry, dispose: () => { body.dispose(); glass.dispose(); } };
}
function collect(root: GLTF['scene']) { const objects: import('three').Object3D[] = []; root.traverse((object) => objects.push(object)); return objects; }
