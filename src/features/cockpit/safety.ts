import { Box3, Line3, Mesh, Triangle, Vector3 } from 'three';
import type { Object3D } from 'three';
import { eyePositions } from './poses';
import type { Eye } from './poses';
import type { Vec3 } from '../../types/vehicle';
export interface SafeEye { position: Vec3; clearance: number; safe: boolean }
export type EyeSafety = Record<Eye, SafeEye>;
/** Exact point-to-triangle clearance, not just a vehicle bounding box check. */
export function measureClearance(root: Object3D, points: readonly Vec3[]) {
  root.updateWorldMatrix(true, true);
  const eyes = points.map((p) => new Vector3(...p)), distances = points.map(() => Infinity);
  const triangle = new Triangle(), closest = new Vector3(), bounds = new Box3(), edge = new Line3();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const positions = object.geometry.getAttribute('position'); if (!positions) return;
    bounds.setFromObject(object);
    const candidates = eyes.map((eye, index) => bounds.distanceToPoint(eye) < distances[index] ? index : -1).filter((i) => i >= 0);
    if (!candidates.length) return;
    const indices = object.geometry.index, count = indices?.count ?? positions.count;
    for (let i = 0; i < count; i += 3) {
      triangle.a.fromBufferAttribute(positions, indices ? indices.getX(i) : i).applyMatrix4(object.matrixWorld);
      triangle.b.fromBufferAttribute(positions, indices ? indices.getX(i + 1) : i + 1).applyMatrix4(object.matrixWorld);
      triangle.c.fromBufferAttribute(positions, indices ? indices.getX(i + 2) : i + 2).applyMatrix4(object.matrixWorld);
      for (const index of candidates) {
        if (triangle.getArea() < 1e-12) {
          // Collapsed source triangles still contribute their line/point clearance.
          for (const [a, b] of [[triangle.a, triangle.b], [triangle.b, triangle.c], [triangle.c, triangle.a]]) {
            if (a.distanceToSquared(b) < 1e-24) closest.copy(a);
            else edge.set(a, b).closestPointToPoint(eyes[index], true, closest);
            distances[index] = Math.min(distances[index], closest.distanceTo(eyes[index]));
          }
        } else {
          triangle.closestPointToPoint(eyes[index], closest);
          distances[index] = Math.min(distances[index], closest.distanceTo(eyes[index]));
        }
      }
    }
  });
  return distances;
}
export function assessCockpit(root: Object3D): EyeSafety {
  root.updateWorldMatrix(true, true);
  const keys: Eye[] = ['driver', 'passenger'];
  const points = keys.map((eye) => new Vector3(...eyePositions[eye]).applyMatrix4(root.matrixWorld).toArray());
  const distances = measureClearance(root, points);
  const entry = (index: number): SafeEye => ({ position: points[index], clearance: distances[index], safe: Number.isFinite(distances[index]) && distances[index] >= 0.09 });
  return { driver: entry(0), passenger: entry(1) };
}
export function safeNearPlane(clearance: number, fov: number, aspect: number) {
  const cornerFactor = Math.sqrt(1 + Math.tan(fov * Math.PI / 360) ** 2 * (1 + aspect ** 2));
  return Math.min(0.025, clearance * 0.45 / cornerFactor);
}
