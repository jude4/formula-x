import { BufferAttribute, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
/** Presentation UVs for the reference's collapsed body UVs. No vertex is moved.
 * Per-triangle dominant-plane projection avoids stretching within a triangle;
 * artist-authored unwraps are still needed for continuous directional seams.
 */
export function createProjectedGeometry(source: BufferGeometry) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const positions = geometry.getAttribute('position');
  const uv = new Float32Array(positions.count * 2);
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), normal = new Vector3();
  for (let start = 0; start < positions.count; start += 3) {
    a.fromBufferAttribute(positions, start); b.fromBufferAttribute(positions, start + 1); c.fromBufferAttribute(positions, start + 2);
    normal.crossVectors(b.sub(a), c.sub(a));
    const x = Math.abs(normal.x), y = Math.abs(normal.y), z = Math.abs(normal.z);
    const axis = x >= y && x >= z ? 0 : y >= z ? 1 : 2;
    for (let i = start; i < start + 3; i++) {
      const px = positions.getX(i), py = positions.getY(i), pz = positions.getZ(i);
      uv[i * 2] = (axis === 0 ? pz : px) * 0.45;
      uv[i * 2 + 1] = (axis === 1 ? pz : py) * 0.45;
    }
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  geometry.userData = { ...geometry.userData, fxPresentationUVs: true };
  return geometry;
}
