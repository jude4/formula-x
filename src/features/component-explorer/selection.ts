import { Box3, Color, EdgesGeometry, LineBasicMaterial, LineSegments, Mesh, Vector3 } from 'three';
import type { Material, Object3D } from 'three';
import type { RegisteredComponent } from '../../models/vehicle/registry';
/** Selection owns only temporary materials/edges; cached asset resources are never disposed. */
export function highlightComponent(object: Object3D) {
  const cleanups: (() => void)[] = [];
  const meshes: Mesh[] = []; object.traverse((child) => { if (child instanceof Mesh) meshes.push(child); });
  for (const mesh of meshes) {
    const original = mesh.material;
    const materials = (Array.isArray(original) ? original : [original]).map((material) => {
      const clone = material.clone() as Material & { emissive?: Color; emissiveIntensity?: number; color?: Color };
      if (clone.emissive) { clone.emissive.set('#c1e991'); clone.emissiveIntensity = 0.12; }
      else clone.color?.lerp(new Color('#c1e991'), 0.3);
      return clone;
    });
    mesh.material = Array.isArray(original) ? materials : materials[0];
    const geometry = new EdgesGeometry(mesh.geometry, 40);
    const material = new LineBasicMaterial({ color: '#c1e991', transparent: true, opacity: 0.4, depthTest: true, toneMapped: false });
    const edges = new LineSegments(geometry, material); edges.name = 'ComponentSelectionEdges'; edges.raycast = () => {}; edges.scale.setScalar(1.001); mesh.add(edges);
    cleanups.push(() => { mesh.remove(edges); geometry.dispose(); material.dispose(); mesh.material = original; materials.forEach((m) => m.dispose()); });
  }
  return () => cleanups.forEach((cleanup) => cleanup());
}
export function componentFocus(entry: RegisteredComponent, request: number) {
  entry.object.updateWorldMatrix(true, true);
  const bounds = new Box3().setFromObject(entry.object);
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3()).length();
  const steering = entry.metadata.sourceName === 'steering_wheel';
  const direction = steering ? new Vector3(-1, 1.25, -0.25) : new Vector3(center.x < 0 ? -1 : 1, 0.4, center.z < 0 ? -0.45 : 0.45);
  const distance = steering ? 2.9 : Math.max(1.6, size * 2.3);
  const position = center.clone().add(direction.normalize().multiplyScalar(distance));
  return { target: center.toArray(), position: position.toArray(), request };
}
